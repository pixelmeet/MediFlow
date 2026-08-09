import { prisma } from "../db";
import { ALLOW_MEMORY_FALLBACK } from "../auth/config";
import { CompleteConsultationInput, PrescriptionItemInput, SaveConsultationDraftInput } from "../validation/consultation";

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
  medicines: {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
  }[];
}

// In-memory consultations store for dev fallback
const memoryConsultations = new Map<string, ConsultationDetailsDTO>();

export class ConsultationService {
  /**
   * Fetch consultation details by token ID or appointment ID
   */
  static async getConsultationDetails(tokenIdOrAppointmentId: string): Promise<ConsultationDetailsDTO | null> {
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
        const pat = appointment.patient;
        const consult = appointment.consultation;
        const rx = consult?.prescription || null;

        return {
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
                        frequency: item.dose || "1-0-1",
                        duration: item.duration || "5 Days",
                        instructions: item.instructions,
                      })),
                    }
                  : null,
              }
            : null,
        };
      }

      if (!ALLOW_MEMORY_FALLBACK) return null;
    } catch (dbError) {
      console.error("Database error in getConsultationDetails:", dbError);
      if (!ALLOW_MEMORY_FALLBACK) {
        throw dbError;
      }
    }

    // Dev fallback mock consultation session
    const cached = memoryConsultations.get(tokenIdOrAppointmentId);
    if (cached) return cached;

    const mock: ConsultationDetailsDTO = {
      id: `cons_${tokenIdOrAppointmentId}`,
      tokenId: tokenIdOrAppointmentId,
      tokenNumber: "A-02",
      appointmentId: "apt_02",
      appointmentDate: new Date().toISOString().slice(0, 10),
      appointmentTime: "10:20",
      status: "IN_CONSULTATION",
      patient: {
        id: "pat_demo_01",
        name: "Anita Sharma",
        email: "anita.sharma@example.com",
        phone: "+91 98765 43210",
        gender: "Female",
        bloodGroup: "B+",
        allergies: ["Penicillin", "Sulfa drugs"],
        dob: "1994-06-15",
        age: 32,
      },
      doctor: {
        id: "doc_patel_01",
        name: "Dr. Rajesh Patel",
        specialty: "Cardiology",
      },
      consultation: {
        id: `cons_${tokenIdOrAppointmentId}`,
        complaints: "Mild chest discomfort upon exertion, shortness of breath for past 3 days.",
        examinationNotes: "BP: 128/82 mmHg, Pulse: 76 bpm regular, SpO2: 99% on room air.",
        diagnosis: "Atypical Exertional Angina (Mild)",
        notes: "Advised 2D Echocardiography & lifestyle modification. Reduce salt intake.",
        followUpDate: "2026-08-24",
        prescription: {
          id: "rx_demo_01",
          prescriptionNumber: "RX-2026-0042",
          items: [
            {
              medicineName: "Tab. Aspirin 75mg",
              dosage: "75mg",
              frequency: "Once daily (0-1-0)",
              duration: "30 Days",
              instructions: "After lunch",
            },
            {
              medicineName: "Tab. Metoprolol 25mg",
              dosage: "25mg",
              frequency: "1-0-0",
              duration: "15 Days",
              instructions: "Before breakfast",
            },
          ],
        },
      },
    };

    memoryConsultations.set(tokenIdOrAppointmentId, mock);
    return mock;
  }

  /**
   * Start a consultation session (transition to IN_CONSULTATION)
   */
  static async startConsultation(
    tokenIdOrAppointmentId: string
  ): Promise<{ success: boolean; consultationId?: string; error?: string }> {
    try {
      const appointment = await prisma.appointment.findFirst({
        where: {
          OR: [
            { id: tokenIdOrAppointmentId },
            { queueToken: { id: tokenIdOrAppointmentId } },
          ],
        },
        include: { queueToken: true },
      });

      if (!appointment) {
        return { success: false, error: "Appointment not found" };
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
      if (!ALLOW_MEMORY_FALLBACK) {
        return { success: false, error: "Database error starting consultation" };
      }

      return { success: true, consultationId: `cons_${tokenIdOrAppointmentId}` };
    }
  }

  /**
   * Save draft consultation notes and clinical findings
   */
  static async saveDraft(
    tokenIdOrAppointmentId: string,
    data: SaveConsultationDraftInput
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const appointment = await prisma.appointment.findFirst({
        where: {
          OR: [
            { id: tokenIdOrAppointmentId },
            { queueToken: { id: tokenIdOrAppointmentId } },
          ],
        },
      });

      if (appointment) {
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
      }

      return { success: true };
    } catch (dbError) {
      console.error("Database error in saveDraft:", dbError);
      if (!ALLOW_MEMORY_FALLBACK) {
        return { success: false, error: "Failed to save draft" };
      }

      return { success: true };
    }
  }

  /**
   * Complete a consultation, generate prescription, and finish visit
   */
  static async completeConsultation(
    tokenIdOrAppointmentId: string,
    data: CompleteConsultationInput
  ): Promise<{
    success: boolean;
    prescriptionNumber?: string;
    error?: string;
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
        include: { queueToken: true },
      });

      if (!appointment) {
        return { success: false, error: "Appointment not found." };
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
                dose: item.frequency || item.dosage,
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

      return { success: true, prescriptionNumber };
    } catch (dbError) {
      console.error("Database error in completeConsultation:", dbError);
      if (!ALLOW_MEMORY_FALLBACK) {
        return { success: false, error: "Database error completing consultation" };
      }

      return { success: true, prescriptionNumber };
    }
  }

  /**
   * Get patient's past consultation history for clinical reference
   */
  static async getPatientHistory(patientId: string): Promise<PatientHistoryVisitDTO[]> {
    try {
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
        return appointments.map((apt) => {
          const c = apt.consultation;
          const rx = c?.prescription;

          return {
            consultationId: c?.id || apt.id,
            date: apt.date.toISOString().slice(0, 10),
            doctorName: apt.doctor.name,
            doctorSpecialty: apt.doctor.specialty,
            diagnosis: c?.diagnosis || "Routine Consultation",
            notes: c?.notes,
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
      }

      if (!ALLOW_MEMORY_FALLBACK) return [];
    } catch (dbError) {
      console.error("Database error in getPatientHistory:", dbError);
      if (!ALLOW_MEMORY_FALLBACK) {
        throw dbError;
      }
    }

    // Dev fallback past visits
    return [
      {
        consultationId: "hist_01",
        date: "2026-06-12",
        doctorName: "Dr. Rajesh Patel",
        doctorSpecialty: "Cardiology",
        diagnosis: "Hypertension Stage 1 (Controlled)",
        notes: "Patient advised to maintain regular aerobic exercise and low sodium diet.",
        medicines: [
          {
            name: "Tab. Telmisartan 40mg",
            dosage: "40mg",
            frequency: "1-0-0",
            duration: "30 Days",
          },
        ],
      },
      {
        consultationId: "hist_02",
        date: "2026-03-05",
        doctorName: "Dr. Sneha Kulkarni",
        doctorSpecialty: "General Medicine",
        diagnosis: "Upper Respiratory Tract Infection",
        notes: "Mild fever and sore throat. Hydration encouraged.",
        medicines: [
          {
            name: "Tab. Paracetamol 650mg",
            dosage: "650mg",
            frequency: "1-0-1 (SOS)",
            duration: "5 Days",
          },
          {
            name: "Tab. Levocetirizine 5mg",
            dosage: "5mg",
            frequency: "0-0-1",
            duration: "5 Days",
          },
        ],
      },
    ];
  }
}
