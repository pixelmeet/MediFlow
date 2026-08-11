import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { ALLOW_MEMORY_FALLBACK } from "../auth/config";
import { BookAppointmentInput, CancelAppointmentInput, RescheduleAppointmentInput } from "../validation/appointment";
import { SchedulingService } from "./SchedulingService";
import { CheckInService, type CheckInEligibility } from "./CheckInService";

export interface AppointmentDTO {
  id: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  branchName: string;
  branchAddress?: string | null;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "10:00"
  tokenNumber: string; // "A-01"
  status: "CONFIRMED" | "CHECKED_IN" | "WAITING" | "IN_CONSULTATION" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  fee: number;
  patientName?: string;
  cancelReason?: string | null;
  queueStatus?: "WAITING" | "IN_PROGRESS" | "DONE" | "NO_SHOW" | null;
  queuePosition?: number | null;
  checkedInAt?: string | null;
  eligibility?: CheckInEligibility;
  createdAt: string;
}


// In-memory appointments store for dev fallback
const memoryAppointments: AppointmentDTO[] = [];

export class AppointmentService {
  /**
   * Book a new appointment with monotonic token generation
   */
  static async createAppointment(
    patientUserId: string,
    input: BookAppointmentInput
  ): Promise<{
    success: boolean;
    appointment?: AppointmentDTO;
    error?: { code: string; message: string };
  }> {
    // 1. Verify slot is available
    const isAvailable = await SchedulingService.validateSlotAvailable(
      input.doctorId,
      input.date,
      input.startTime
    );

    if (!isAvailable) {
      return {
        success: false,
        error: {
          code: "SLOT_UNAVAILABLE",
          message: "This slot is no longer available. Please choose another time.",
        },
      };
    }

    const appointmentDate = new Date(input.date + "T00:00:00.000Z");

    try {
      // 2. Fetch patient record and doctor fee
      const [patient, doctor] = await Promise.all([
        prisma.patient.findFirst({
          where: { userId: patientUserId },
        }),
        prisma.doctor.findUnique({
          where: { id: input.doctorId },
          include: {
            department: {
              include: { branch: true },
            },
          },
        }),
      ]);

      if (!patient) {
        return {
          success: false,
          error: {
            code: "PATIENT_NOT_FOUND",
            message: "Patient profile not found. Please complete your registration.",
          },
        };
      }

      if (!doctor) {
        return {
          success: false,
          error: {
            code: "DOCTOR_NOT_FOUND",
            message: "Selected doctor was not found.",
          },
        };
      }

      // 3. Create appointment and initial queue token inside transaction with atomic token generation
      const { appointment: newApt, tokenSeq } = await prisma.$transaction(async (tx) => {
        const existingCount = await tx.appointment.count({
          where: {
            doctorId: input.doctorId,
            date: {
              gte: new Date(input.date + "T00:00:00.000Z"),
              lte: new Date(input.date + "T23:59:59.999Z"),
            },
          },
        });
        const tokenSeq = existingCount + 1;
        const tokenNumber = `A-${tokenSeq.toString().padStart(2, "0")}`;

        const appointment = await tx.appointment.create({
          data: {
            patientId: patient.id,
            doctorId: doctor.id,
            branchId: input.branchId || doctor.department.branchId,
            date: appointmentDate,
            startTime: input.startTime,
            tokenNumber,
            status: "CONFIRMED",
            feeSnapshot: doctor.fee,
            idempotencyKey: input.idempotencyKey,
          },
          include: {
            patient: true,
            doctor: {
              include: {
                department: {
                  include: { branch: true },
                },
              },
            },
          },
        });

        await tx.queueToken.create({
          data: {
            appointmentId: appointment.id,
            position: tokenSeq,
            status: "WAITING",
          },
        });

        return { appointment, tokenSeq };
      });

      return {
        success: true,
        appointment: {
          id: newApt.id,
          patientId: newApt.patientId,
          doctorId: newApt.doctorId,
          doctorName: newApt.doctor.name,
          doctorSpecialty: newApt.doctor.specialty,
          branchName: newApt.doctor.department.branch.name,
          branchAddress: newApt.doctor.department.branch.address,
          date: input.date,
          startTime: newApt.startTime,
          tokenNumber: newApt.tokenNumber,
          status: newApt.status,
          fee: Number(newApt.feeSnapshot),
          patientName: newApt.patient.name,
          queuePosition: tokenSeq,
          createdAt: newApt.createdAt.toISOString(),
        },
      };
    } catch (dbError) {
      console.error("Database error during createAppointment:", dbError);

      if (dbError instanceof Prisma.PrismaClientKnownRequestError && dbError.code === "P2002") {
        return {
          success: false,
          error: {
            code: "SLOT_UNAVAILABLE",
            message: "This slot was just booked by someone else. Please choose another time.",
          },
        };
      }

      if (!ALLOW_MEMORY_FALLBACK) {
        return {
          success: false,
          error: {
            code: "SERVICE_UNAVAILABLE",
            message: "We're having trouble reaching the database. Please try again in a moment.",
          },
        };
      }

      console.warn("Falling back to in-memory appointment booking in dev mode");

      const tokenSeq = memoryAppointments.filter((a) => a.doctorId === input.doctorId && a.date === input.date).length + 1;
      const tokenNumber = `A-${tokenSeq.toString().padStart(2, "0")}`;
      const newId = `apt_${Date.now()}`;

      const created: AppointmentDTO = {
        id: newId,
        patientId: patientUserId,
        doctorId: input.doctorId,
        doctorName: "Dr. Rajesh Patel",
        doctorSpecialty: "Cardiology",
        branchName: "MediFlow Central Hospital",
        branchAddress: "123 Healthcare Ave, Mumbai",
        date: input.date,
        startTime: input.startTime,
        tokenNumber,
        status: "CONFIRMED",
        fee: 800,
        patientName: "Patient",
        queuePosition: tokenSeq,
        queueStatus: "WAITING",
        createdAt: new Date().toISOString(),
      };

      memoryAppointments.push(created);

      return {
        success: true,
        appointment: created,
      };
    }
  }

  /**
   * Get all appointments for a patient
   */
  static async getPatientAppointments(patientUserId: string): Promise<{
    upcoming: AppointmentDTO[];
    past: AppointmentDTO[];
  }> {
    try {
      const patient = await prisma.patient.findFirst({
        where: { userId: patientUserId },
      });

      if (patient) {
        const appointments = await prisma.appointment.findMany({
          where: { patientId: patient.id },
          include: {
            doctor: {
              include: {
                department: {
                  include: { branch: true },
                },
              },
            },
            queueToken: true,
          },
          orderBy: [{ date: "desc" }, { startTime: "asc" }],
        });

        const todayStr = new Date().toISOString().slice(0, 10);
        const upcoming: AppointmentDTO[] = [];
        const past: AppointmentDTO[] = [];

        const now = new Date();
        appointments.forEach((apt) => {
          const aptDateStr = apt.date.toISOString().slice(0, 10);
          const eligibility = CheckInService.evaluateEligibility(
            {
              date: apt.date,
              startTime: apt.startTime,
              status: apt.status,
              checkedInAt: apt.checkedInAt,
              branch: apt.doctor.department.branch,
            },
            now
          );

          const dto: AppointmentDTO = {
            id: apt.id,
            patientId: apt.patientId,
            doctorId: apt.doctorId,
            doctorName: apt.doctor.name,
            doctorSpecialty: apt.doctor.specialty,
            branchName: apt.doctor.department.branch.name,
            branchAddress: apt.doctor.department.branch.address,
            date: aptDateStr,
            startTime: apt.startTime,
            tokenNumber: apt.tokenNumber,
            status: apt.status,
            fee: Number(apt.feeSnapshot),
            queueStatus: apt.queueToken?.status || null,
            queuePosition: apt.queueToken?.position || null,
            checkedInAt: apt.checkedInAt?.toISOString() || null,
            eligibility,
            cancelReason: apt.cancelReason,
            createdAt: apt.createdAt.toISOString(),
          };

          if (apt.status === "COMPLETED" || apt.status === "CANCELLED" || apt.status === "NO_SHOW" || aptDateStr < todayStr) {
            past.push(dto);
          } else {
            upcoming.push(dto);
          }
        });

        return { upcoming, past };
      }

      if (!ALLOW_MEMORY_FALLBACK) {
        return { upcoming: [], past: [] };
      }
    } catch (dbError) {
      console.error("Database error in getPatientAppointments:", dbError);
      if (!ALLOW_MEMORY_FALLBACK) {
        throw dbError;
      }
    }

    // In-memory fallback
    const userApts = memoryAppointments.filter((a) => a.patientId === patientUserId);
    const todayStr = new Date().toISOString().slice(0, 10);

    return {
      upcoming: userApts.filter((a) => (a.status === "CONFIRMED" || a.status === "WAITING") && a.date >= todayStr),
      past: userApts.filter((a) => a.status === "COMPLETED" || a.status === "CANCELLED" || a.date < todayStr),
    };
  }

  /**
   * Reschedule an appointment
   */
  static async rescheduleAppointment(
    appointmentId: string,
    patientUserId: string,
    input: RescheduleAppointmentInput
  ): Promise<{
    success: boolean;
    appointment?: AppointmentDTO;
    error?: { code: string; message: string };
  }> {
    try {
      const patient = await prisma.patient.findFirst({
        where: { userId: patientUserId },
      });

      const existing = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      });

      if (!existing || (patient && existing.patientId !== patient.id)) {
        return {
          success: false,
          error: { code: "NOT_FOUND", message: "Appointment not found or not authorized." },
        };
      }

      if (existing.status !== "CONFIRMED") {
        return {
          success: false,
          error: { code: "CANNOT_RESCHEDULE", message: `Cannot reschedule appointment in ${existing.status} status.` },
        };
      }

      // Check slot availability on new date/time
      const isAvailable = await SchedulingService.validateSlotAvailable(
        existing.doctorId,
        input.date,
        input.startTime
      );

      if (!isAvailable) {
        return {
          success: false,
          error: { code: "SLOT_UNAVAILABLE", message: "Selected new time slot is no longer available." },
        };
      }

      const updated = await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          date: new Date(input.date + "T00:00:00.000Z"),
          startTime: input.startTime,
        },
        include: {
          doctor: {
            include: {
              department: {
                include: { branch: true },
              },
            },
          },
        },
      });

      return {
        success: true,
        appointment: {
          id: updated.id,
          patientId: updated.patientId,
          doctorId: updated.doctorId,
          doctorName: updated.doctor.name,
          doctorSpecialty: updated.doctor.specialty,
          branchName: updated.doctor.department.branch.name,
          date: input.date,
          startTime: updated.startTime,
          tokenNumber: updated.tokenNumber,
          status: updated.status,
          fee: Number(updated.feeSnapshot),
          createdAt: updated.createdAt.toISOString(),
        },
      };
    } catch (dbError) {
      console.error("Database error in rescheduleAppointment:", dbError);
      if (!ALLOW_MEMORY_FALLBACK) {
        return {
          success: false,
          error: { code: "SERVICE_UNAVAILABLE", message: "Database is unavailable. Please try again." },
        };
      }

      const memApt = memoryAppointments.find((a) => a.id === appointmentId);
      if (memApt) {
        memApt.date = input.date;
        memApt.startTime = input.startTime;
        return { success: true, appointment: memApt };
      }

      return { success: false, error: { code: "NOT_FOUND", message: "Appointment not found." } };
    }
  }

  /**
   * Cancel an appointment
   */
  static async cancelAppointment(
    appointmentId: string,
    patientUserId: string,
    input: CancelAppointmentInput
  ): Promise<{
    success: boolean;
    error?: { code: string; message: string };
  }> {
    try {
      const patient = await prisma.patient.findFirst({
        where: { userId: patientUserId },
      });

      const existing = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      });

      if (!existing || (patient && existing.patientId !== patient.id)) {
        return {
          success: false,
          error: { code: "NOT_FOUND", message: "Appointment not found or not authorized." },
        };
      }

      if (existing.status === "COMPLETED" || existing.status === "CANCELLED") {
        return {
          success: false,
          error: { code: "CANNOT_CANCEL", message: `Appointment is already ${existing.status.toLowerCase()}.` },
        };
      }

      await prisma.$transaction([
        prisma.appointment.update({
          where: { id: appointmentId },
          data: {
            status: "CANCELLED",
            cancelledAt: new Date(),
            cancelReason: input.reason,
          },
        }),
        prisma.queueToken.updateMany({
          where: { appointmentId },
          data: { status: "NO_SHOW" },
        }),
      ]);

      return { success: true };
    } catch (dbError) {
      console.error("Database error in cancelAppointment:", dbError);
      if (!ALLOW_MEMORY_FALLBACK) {
        return {
          success: false,
          error: { code: "SERVICE_UNAVAILABLE", message: "Database is unavailable. Please try again." },
        };
      }

      const memApt = memoryAppointments.find((a) => a.id === appointmentId);
      if (memApt) {
        memApt.status = "CANCELLED";
        memApt.cancelReason = input.reason;
        return { success: true };
      }

      return { success: false, error: { code: "NOT_FOUND", message: "Appointment not found." } };
    }
  }
}
