import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { BookAppointmentInput, CancelAppointmentInput, RescheduleAppointmentInput } from "../validation/appointment";
import { SchedulingService } from "./SchedulingService";
import { CheckInService, type CheckInEligibility } from "./CheckInService";
import { NotificationService } from "./NotificationService";

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
  queueStatus?: "WAITING" | "IN_PROGRESS" | "DONE" | "NO_SHOW" | "CANCELLED" | null;
  queuePosition?: number | null;
  checkedInAt?: string | null;
  eligibility?: CheckInEligibility;
  createdAt: string;
}

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
      // 0. Idempotency check: if an appointment with this key was already created, return it
      if (input.idempotencyKey) {
        const existingApt = await prisma.appointment.findUnique({
          where: { idempotencyKey: input.idempotencyKey },
          include: {
            patient: true,
            doctor: {
              include: {
                department: { include: { branch: true } },
              },
            },
            queueToken: true,
          },
        });

        if (existingApt) {
          return {
            success: true,
            appointment: {
              id: existingApt.id,
              patientId: existingApt.patientId,
              doctorId: existingApt.doctorId,
              doctorName: existingApt.doctor.name,
              doctorSpecialty: existingApt.doctor.specialty,
              branchName: existingApt.doctor.department.branch.name,
              branchAddress: existingApt.doctor.department.branch.address,
              date: input.date,
              startTime: existingApt.startTime,
              tokenNumber: existingApt.tokenNumber,
              status: existingApt.status,
              fee: Number(existingApt.feeSnapshot),
              patientName: existingApt.patient.name,
              queuePosition: existingApt.queueToken?.position || 1,
              createdAt: existingApt.createdAt.toISOString(),
            },
          };
        }
      }

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

      // Dispatch booking confirmation notification asynchronously
      NotificationService.createNotification({
        userId: patientUserId,
        type: "booking_confirmed",
        title: "Appointment Confirmed",
        message: `Your appointment with ${newApt.doctor.name} (${newApt.doctor.specialty}) is confirmed for ${input.date} at ${newApt.startTime}. Token: ${newApt.tokenNumber}`,
        payload: { appointmentId: newApt.id, tokenNumber: newApt.tokenNumber, doctorId: newApt.doctorId },
      }).catch((err) => console.error("Notification trigger error:", err));

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

      return {
        success: false,
        error: {
          code: "SERVICE_UNAVAILABLE",
          message: "We're having trouble reaching the database. Please try again in a moment.",
        },
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

      return { upcoming: [], past: [] };
    } catch (dbError) {
      console.error("Database error in getPatientAppointments:", dbError);
      throw dbError;
    }
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
      return {
        success: false,
        error: { code: "SERVICE_UNAVAILABLE", message: "Database is unavailable. Please try again." },
      };
    }
  }

  /**
   * Fetch a single appointment by ID, enforcing patient ownership.
   * Returns NOT_FOUND if the appointment doesn't exist; FORBIDDEN if it
   * exists but belongs to a different patient — the two cases are kept
   * distinct to allow the API layer to map them to 404 vs 403.
   */
  static async getAppointmentById(
    appointmentId: string,
    patientUserId: string
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
        include: {
          doctor: {
            include: {
              department: { include: { branch: true } },
            },
          },
          queueToken: true,
        },
      });

      if (!existing) {
        return {
          success: false,
          error: { code: "NOT_FOUND", message: "Appointment not found." },
        };
      }

      if (patient && existing.patientId !== patient.id) {
        return {
          success: false,
          error: { code: "FORBIDDEN", message: "This appointment does not belong to your account." },
        };
      }

      const aptDateStr = existing.date.toISOString().slice(0, 10);
      const now = new Date();
      const eligibility = CheckInService.evaluateEligibility(
        {
          date: existing.date,
          startTime: existing.startTime,
          status: existing.status,
          checkedInAt: existing.checkedInAt,
          branch: existing.doctor.department.branch,
        },
        now
      );

      return {
        success: true,
        appointment: {
          id: existing.id,
          patientId: existing.patientId,
          doctorId: existing.doctorId,
          doctorName: existing.doctor.name,
          doctorSpecialty: existing.doctor.specialty,
          branchName: existing.doctor.department.branch.name,
          branchAddress: existing.doctor.department.branch.address,
          date: aptDateStr,
          startTime: existing.startTime,
          tokenNumber: existing.tokenNumber,
          status: existing.status,
          fee: Number(existing.feeSnapshot),
          queueStatus: existing.queueToken?.status || null,
          queuePosition: existing.queueToken?.position || null,
          checkedInAt: existing.checkedInAt?.toISOString() || null,
          cancelReason: existing.cancelReason,
          eligibility,
          createdAt: existing.createdAt.toISOString(),
        },
      };
    } catch (dbError) {
      console.error("Database error in getAppointmentById:", dbError);
      return {
        success: false,
        error: { code: "SERVICE_UNAVAILABLE", message: "Database is unavailable. Please try again." },
      };
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
          data: { status: "CANCELLED" },
        }),
      ]);

      return { success: true };
    } catch (dbError) {
      console.error("Database error in cancelAppointment:", dbError);
      return {
        success: false,
        error: { code: "SERVICE_UNAVAILABLE", message: "Database is unavailable. Please try again." },
      };
    }
  }
}
