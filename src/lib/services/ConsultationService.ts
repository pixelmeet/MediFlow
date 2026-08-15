import { prisma } from "../db";
import { CompleteConsultationInput, PrescriptionItemInput, SaveConsultationDraftInput } from "../validation/consultation";
import { NotificationService } from "./NotificationService";

export interface ConsultationDetailsDTO {
  id: string;
  tokenId: string;
  tokenNumber: string;
  appointmentId: string;
  appointmentDate: string;
  appointmentTime: string;
  status: "CONFIRMED" | "CHECKED_IN" | "WAITING" | "IN_CONSULTATION" | "COMPLETED";
  patient: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    gender?: string | null;
    bloodGroup?: string | null;
    allergies?: string[] | null;
    dob?: string | null;
    age?: number | null;
  };
  doctor: {
    id: string;
    name: string;
    specialty: string;
  };
  consultation?: {
    id: string;
    complaints?: string | null;
    examinationNotes?: string | null;
    diagnosis?: string | null;
    notes?: string | null;
    followUpDate?: string | null;
    completedAt?: string | null;
    prescription?: {
      id: string;
      prescriptionNumber: string;
      items: PrescriptionItemInput[];
    } | null;
  } | null;
}

export interface PatientHistoryVisitDTO {
  consultationId: string;
  date: string;
  doctorName: string;
  doctorSpecialty: string;
  diagnosis: string;
  notes?: string | null;
  prescriptionId?: string | null;
  medicines: {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
  }[];
}

export class ConsultationService {
  /**
   * Fetch consultation details by token ID or appointment ID with role/ownership enforcement
   */
  static async getConsultationDetails(
    tokenIdOrAppointmentId: string,
    requestingUserId: string,
    requestingRole: string
  ): Promise<{
    success: boolean;
    data?: ConsultationDetailsDTO;
    error?: "NOT_FOUND" | "FORBIDDEN" | "SERVER_ERROR";
    message?: string;
  }> {
    try {
      // Find appointment by id or by queueToken id
      const appointment = await prisma.appointment.findFirst({
        where: {
          OR: [
            { id: tokenIdOrAppointmentId },
            { queueToken: { id: tokenIdOrAppointmentId } },
          ],
        },
        include: {
          patient: {
            include: { user: true },
          },
          doctor: {
            include: { user: true },
          },
          queueToken: true,
          consultation: {
            include: {
              prescription: {
                include: { items: true },
              },
            },
          },
        },
      });

      if (appointment) {
        // Ownership / Authorization verification
        if (requestingRole === "DOCTOR") {
          if (appointment.doctor.userId !== requestingUserId) {
            return {
              success: false,
              error: "FORBIDDEN",
              message: "You are not assigned to this patient's consultation.",
            };
          }
        } else if (requestingRole !== "ADMIN") {
          return {
            success: false,
            error: "FORBIDDEN",
            message: "You do not have permission to view this consultation.",
          };
        }

        const pat = appointment.patient;
        const consult = appointment.consultation;
        const rx = consult?.prescription || null;

        const dto: ConsultationDetailsDTO = {
          id: consult?.id || `draft_${appointment.id}`,
          tokenId: appointment.queueToken?.id || appointment.id,
          tokenNumber: appointment.tokenNumber,
          appointmentId: appointment.id,
          appointmentDate: appointment.date.toISOString().slice(0, 10),
          appointmentTime: appointment.startTime,
          status: appointment.status as ConsultationDetailsDTO["status"],
          patient: {
            id: pat.id,
            name: pat.name,
            email: pat.user.email,
            phone: pat.user.phone,
            gender: pat.gender,
            bloodGroup: pat.bloodGroup,
            allergies: ["NKDA (None documented)"],
            dob: null,
            age: pat.age || null,
          },
          doctor: {
            id: appointment.doctor.id,
            name: appointment.doctor.name,
            specialty: appointment.doctor.specialty,
          },
          consultation: consult
            ? {
                id: consult.id,
                diagnosis: consult.diagnosis,
                notes: consult.notes,
                followUpDate: consult.followUpDate ? consult.followUpDate.toISOString().slice(0, 10) : null,
                completedAt: consult.completedAt?.toISOString() || null,
                prescription: rx
                  ? {
                      id: rx.id,
                      prescriptionNumber: `RX-${rx.id.slice(-6).toUpperCase()}`,
                      items: rx.items.map((item) => ({
                        medicineName: item.medicine,
                        dosage: item.dose || "1 tablet",
                        frequency: item.frequency || "1-0-1",
                        duration: item.duration || "5 Days",
                        instructions: item.instructions,
                      })),
                    }
                  : null,
              }
            : null,
        };

        return { success: true, data: dto };
      }

      return { success: false, error: "NOT_FOUND", message: "Consultation session not found" };
    } catch (dbError) {
      console.error("Database error in getConsultationDetails:", dbError);
      throw dbError;
    }
  }

  /**
   * Start a consultation session with doctor assignment validation
   */
  static async startConsultation(
    tokenIdOrAppointmentId: string,
    requestingUserId: string,
    requestingRole: string
  ): Promise<{
    success: boolean;
    consultationId?: string;
    error?: "NOT_FOUND" | "FORBIDDEN" | "SERVER_ERROR" | "START_FAILED";
    message?: string;
  }> {
    try {
      const appointment = await prisma.appointment.findFirst({
        where: {
          OR: [
            { id: tokenIdOrAppointmentId },
            { queueToken: { id: tokenIdOrAppointmentId } },
          ],
        },
        include: {
          doctor: { select: { id: true, userId: true } },
          queueToken: true,
        },
      });

      if (!appointment) {
        return { success: false, error: "NOT_FOUND", message: "Appointment not found." };
      }

      // Ownership / Authorization verification
      if (requestingRole === "DOCTOR") {
        if (appointment.doctor.userId !== requestingUserId) {
          return {
            success: false,
            error: "FORBIDDEN",
            message: "You are not assigned to this patient's consultation.",
          };
        }
      } else if (requestingRole !== "ADMIN") {
        return {
          success: false,
          error: "FORBIDDEN",
          message: "Only assigned doctor or admin can start consultation.",
        };
      }

      const now = new Date();

      const consultation = await prisma.$transaction(async (tx) => {
        // Update appointment and token status
        await tx.appointment.update({
          where: { id: appointment.id },
          data: { status: "IN_CONSULTATION" },
        });

        if (appointment.queueToken) {
          await tx.queueToken.update({
            where: { id: appointment.queueToken.id },
            data: {
              status: "IN_PROGRESS",
              calledAt: appointment.queueToken.calledAt || now,
            },
          });
        }

        // Upsert consultation record
        const existingCons = await tx.consultation.findUnique({
          where: { appointmentId: appointment.id },
        });

        if (existingCons) return existingCons;

        return await tx.consultation.create({
          data: {
            appointmentId: appointment.id,
            doctorId: appointment.doctorId,
            diagnosis: "Consultation in progress",
            startedAt: now,
          },
        });
      });

      return { success: true, consultationId: consultation.id };
    } catch (dbError) {
      console.error("Database error in startConsultation:", dbError);
      return { success: false, error: "SERVER_ERROR", message: "Database error starting consultation" };
    }
  }

  /**
   * Save draft consultation notes with doctor assignment validation
   */
  static async saveDraft(
    tokenIdOrAppointmentId: string,
    data: SaveConsultationDraftInput,
    requestingUserId: string,
    requestingRole: string
  ): Promise<{
    success: boolean;
    error?: "NOT_FOUND" | "FORBIDDEN" | "SERVER_ERROR" | "SAVE_DRAFT_FAILED";
    message?: string;
  }> {
    try {
      const appointment = await prisma.appointment.findFirst({
        where: {
          OR: [
            { id: tokenIdOrAppointmentId },
            { queueToken: { id: tokenIdOrAppointmentId } },
          ],
        },
        include: {
          doctor: { select: { id: true, userId: true } },
        },
      });

      if (!appointment) {
        return { success: false, error: "NOT_FOUND", message: "Appointment not found." };
      }

      // Ownership / Authorization verification
      if (requestingRole === "DOCTOR") {
        if (appointment.doctor.userId !== requestingUserId) {
          return {
            success: false,
            error: "FORBIDDEN",
            message: "You are not assigned to this patient's consultation.",
          };
        }
      } else if (requestingRole !== "ADMIN") {
        return {
          success: false,
          error: "FORBIDDEN",
          message: "Only assigned doctor or admin can save consultation draft.",
        };
      }

      await prisma.consultation.upsert({
        where: { appointmentId: appointment.id },
        update: {
          diagnosis: data.diagnosis || "Draft consultation",
          notes: data.notes || null,
          followUpDate: data.followUpDate ? new Date(data.followUpDate + "T00:00:00.000Z") : null,
        },
        create: {
          appointmentId: appointment.id,
          doctorId: appointment.doctorId,
          diagnosis: data.diagnosis || "Draft consultation",
          notes: data.notes || null,
          followUpDate: data.followUpDate ? new Date(data.followUpDate + "T00:00:00.000Z") : null,
          startedAt: new Date(),
        },
      });

      return { success: true };
    } catch (dbError) {
      console.error("Database error in saveDraft:", dbError);
      return { success: false, error: "SERVER_ERROR", message: "Failed to save draft" };
    }
  }

  /**
   * Complete a consultation with doctor assignment validation
   */
  static async completeConsultation(
    tokenIdOrAppointmentId: string,
    data: CompleteConsultationInput,
    requestingUserId: string,
    requestingRole: string
  ): Promise<{
    success: boolean;
    prescriptionNumber?: string;
    error?: "NOT_FOUND" | "FORBIDDEN" | "SERVER_ERROR" | "COMPLETE_FAILED";
    message?: string;
  }> {
    const now = new Date();
    const prescriptionNumber = `RX-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      const appointment = await prisma.appointment.findFirst({
        where: {
          OR: [
            { id: tokenIdOrAppointmentId },
            { queueToken: { id: tokenIdOrAppointmentId } },
          ],
        },
        include: {
          doctor: { select: { id: true, userId: true, name: true } },
          queueToken: true,
        },
      });

      if (!appointment) {
        return { success: false, error: "NOT_FOUND", message: "Appointment not found." };
      }

      // Ownership / Authorization verification
      if (requestingRole === "DOCTOR") {
        if (appointment.doctor.userId !== requestingUserId) {
          return {
            success: false,
            error: "FORBIDDEN",
            message: "You are not assigned to this patient's consultation.",
          };
        }
      } else if (requestingRole !== "ADMIN") {
        return {
          success: false,
          error: "FORBIDDEN",
          message: "Only assigned doctor or admin can complete consultation.",
        };
      }

      await prisma.$transaction(async (tx) => {
        // 1. Upsert Consultation record with completed data
        const consultation = await tx.consultation.upsert({
          where: { appointmentId: appointment.id },
          update: {
            diagnosis: data.diagnosis,
            notes: data.notes || null,
            followUpDate: data.followUpDate ? new Date(data.followUpDate + "T00:00:00.000Z") : null,
            completedAt: now,
          },
          create: {
            appointmentId: appointment.id,
            doctorId: appointment.doctorId,
            diagnosis: data.diagnosis,
            notes: data.notes || null,
            followUpDate: data.followUpDate ? new Date(data.followUpDate + "T00:00:00.000Z") : null,
            startedAt: now,
            completedAt: now,
          },
        });

        // 2. Create Prescription and PrescriptionItems if items exist
        if (data.prescriptionItems && data.prescriptionItems.length > 0) {
          // Delete existing prescription items if draft existed
          await tx.prescription.deleteMany({
            where: { consultationId: consultation.id },
          });

          const rx = await tx.prescription.create({
            data: {
              consultationId: consultation.id,
            },
          });

          for (let i = 0; i < data.prescriptionItems.length; i++) {
            const item = data.prescriptionItems[i];
            await tx.prescriptionItem.create({
              data: {
                prescriptionId: rx.id,
                medicine: item.medicineName,
                dose: item.dosage,
                frequency: item.frequency,
                duration: item.duration,
                instructions: item.instructions || null,
                sortOrder: i,
              },
            });
          }
        }

        // 3. Mark appointment as COMPLETED and token as DONE
        await tx.appointment.update({
          where: { id: appointment.id },
          data: { status: "COMPLETED" },
        });

        if (appointment.queueToken) {
          await tx.queueToken.update({
            where: { id: appointment.queueToken.id },
            data: {
              status: "DONE",
              completedAt: now,
            },
          });
        }
      });

      // Dispatch consultation completed and prescription notifications
      const patientRecord = await prisma.patient.findUnique({
        where: { id: appointment.patientId },
        select: { userId: true },
      });

      if (patientRecord?.userId) {
        NotificationService.createNotification({
          userId: patientRecord.userId,
          type: "prescription_issued",
          title: "Prescription Available",
          message: `Your digital prescription (${prescriptionNumber}) and clinical instructions from ${appointment.doctor?.name || "your doctor"} are now ready to view.`,
          payload: { appointmentId: appointment.id, prescriptionNumber },
        }).catch((err) => console.error("Prescription notification error:", err));
      }

      return { success: true, prescriptionNumber };
    } catch (dbError) {
      console.error("Database error in completeConsultation:", dbError);
      return { success: false, error: "SERVER_ERROR", message: "Database error completing consultation" };
    }
  }

  /**
   * Get patient's past consultation history with patient and doctor relationship authorization
   */
  static async getPatientHistory(
    patientId: string,
    requestingUserId: string,
    requestingRole: string
  ): Promise<{
    success: boolean;
    data?: PatientHistoryVisitDTO[];
    error?: "NOT_FOUND" | "FORBIDDEN" | "SERVER_ERROR";
    message?: string;
  }> {
    try {
      // 1. Patient role ownership check
      if (requestingRole === "PATIENT") {
        const patient = await prisma.patient.findUnique({
          where: { id: patientId },
          select: { id: true, userId: true },
        });

        if (!patient) {
          return { success: false, error: "NOT_FOUND", message: "Patient not found." };
        }

        if (patient.userId !== requestingUserId) {
          return { success: false, error: "FORBIDDEN", message: "You can only view your own medical history." };
        }
      }
      // 2. Doctor role clinical relationship check
      else if (requestingRole === "DOCTOR") {
        const doctor = await prisma.doctor.findUnique({
          where: { userId: requestingUserId },
          select: { id: true },
        });

        if (!doctor) {
          return { success: false, error: "FORBIDDEN", message: "Doctor profile not found." };
        }

        // Verify doctor has at least one past or present appointment with this patient
        const existingAppointment = await prisma.appointment.findFirst({
          where: {
            doctorId: doctor.id,
            patientId,
          },
        });

        if (!existingAppointment) {
          return {
            success: false,
            error: "FORBIDDEN",
            message: "You can only view medical history for patients you have treated or are scheduled to treat.",
          };
        }
      }
      // 3. Admin role has hospital oversight per PRD §3.8
      else if (requestingRole !== "ADMIN") {
        return {
          success: false,
          error: "FORBIDDEN",
          message: "You do not have permission to view this patient's medical history.",
        };
      }

      // Fetch patient's past completed consultation visits
      const appointments = await prisma.appointment.findMany({
        where: {
          patientId,
          consultation: { completedAt: { not: null } },
        },
        include: {
          doctor: { select: { name: true, specialty: true } },
          consultation: {
            include: {
              prescription: {
                include: { items: true },
              },
            },
          },
        },
        orderBy: { date: "desc" },
        take: 10,
      });

      if (appointments.length > 0) {
        const visits: PatientHistoryVisitDTO[] = appointments.map((apt) => {
          const c = apt.consultation;
          const rx = c?.prescription;

          return {
            consultationId: c?.id || apt.id,
            date: apt.date.toISOString().slice(0, 10),
            doctorName: apt.doctor.name,
            doctorSpecialty: apt.doctor.specialty,
            diagnosis: c?.diagnosis || "Routine Consultation",
            notes: c?.notes,
            prescriptionId: rx?.id ?? null,
            medicines: rx?.items
              ? rx.items.map((i) => ({
                  name: i.medicine,
                  dosage: i.dose || "1 tab",
                  frequency: i.dose || "1-0-1",
                  duration: i.duration || "5 Days",
                }))
              : [],
          };
        });

        return { success: true, data: visits };
      }

      return { success: true, data: [] };
    } catch (dbError) {
      console.error("Database error in getPatientHistory:", dbError);
      return { success: false, error: "SERVER_ERROR", message: "Failed to retrieve patient medical history." };
    }
  }
}
