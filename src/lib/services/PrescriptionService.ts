import { prisma } from "../db";
import { ALLOW_MEMORY_FALLBACK } from "../auth/config";

export interface PrescriptionItemDTO {
  id: string;
  medicine: string;
  dose?: string | null;
  duration?: string | null;
  instructions?: string | null;
  sortOrder: number;
}

export interface PrescriptionDTO {
  id: string;
  prescriptionNumber: string;
  consultationId: string;
  appointmentId: string;
  tokenNumber: string;
  date: string;
  time: string;
  version: number;
  pdfUrl?: string | null;
  doctor: {
    id: string;
    name: string;
    specialty: string;
    qualifications?: string | null;
    branchName?: string;
  };
  patient: {
    id: string;
    name: string;
    gender?: string | null;
    age?: number | null;
    bloodGroup?: string | null;
    phone?: string | null;
  };
  clinicalSummary: {
    diagnosis: string;
    complaints?: string | null;
    notes?: string | null;
    followUpDate?: string | null;
  };
  items: PrescriptionItemDTO[];
  createdAt: string;
}

// In-memory store for fallback/dev
const memoryPrescriptions = new Map<string, PrescriptionDTO>();

export class PrescriptionService {
  /**
   * List all prescriptions for a logged-in patient
   */
  static async getPatientPrescriptions(
    patientUserId: string,
    options?: { search?: string; limit?: number; offset?: number }
  ): Promise<{
    success: boolean;
    data?: {
      prescriptions: PrescriptionDTO[];
      total: number;
    };
    error?: string;
  }> {
    try {
      // Find patient record by userId
      const patient = await prisma.patient.findUnique({
        where: { userId: patientUserId },
      });

      if (!patient) {
        // Dev fallback check
        if (ALLOW_MEMORY_FALLBACK) {
          const list = Array.from(memoryPrescriptions.values()).filter(
            (p) => p.patient.id === patientUserId || p.patient.name.toLowerCase().includes("patient")
          );
          return {
            success: true,
            data: { prescriptions: list, total: list.length },
          };
        }
        return { success: false, error: "Patient record not found" };
      }

      const prescriptions = await prisma.prescription.findMany({
        where: {
          consultation: {
            appointment: {
              patientId: patient.id,
            },
          },
        },
        include: {
          items: {
            orderBy: { sortOrder: "asc" },
          },
          consultation: {
            include: {
              appointment: {
                include: {
                  branch: true,
                },
              },
              doctor: {
                include: {
                  department: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      const formatted: PrescriptionDTO[] = prescriptions.map((p) => ({
        id: p.id,
        prescriptionNumber: `RX-${p.id.slice(-6).toUpperCase()}`,
        consultationId: p.consultationId,
        appointmentId: p.consultation.appointmentId,
        tokenNumber: p.consultation.appointment.tokenNumber,
        date: p.consultation.appointment.date.toISOString().split("T")[0],
        time: p.consultation.appointment.startTime,
        version: p.version,
        pdfUrl: p.pdfUrl,
        doctor: {
          id: p.consultation.doctor.id,
          name: p.consultation.doctor.name,
          specialty: p.consultation.doctor.specialty,
          qualifications: p.consultation.doctor.qualifications,
          branchName: p.consultation.appointment.branch?.name || "Main Branch",
        },
        patient: {
          id: patient.id,
          name: patient.name,
          gender: patient.gender,
          age: patient.age,
          bloodGroup: patient.bloodGroup,
        },
        clinicalSummary: {
          diagnosis: p.consultation.diagnosis,
          notes: p.consultation.notes,
          followUpDate: p.consultation.followUpDate ? p.consultation.followUpDate.toISOString().split("T")[0] : null,
        },
        items: p.items.map((it) => ({
          id: it.id,
          medicine: it.medicine,
          dose: it.dose,
          duration: it.duration,
          instructions: it.instructions,
          sortOrder: it.sortOrder,
        })),
        createdAt: p.createdAt.toISOString(),
      }));

      // Apply search filter if present
      let resultList = formatted;
      if (options?.search) {
        const query = options.search.toLowerCase();
        resultList = formatted.filter(
          (p) =>
            p.doctor.name.toLowerCase().includes(query) ||
            p.doctor.specialty.toLowerCase().includes(query) ||
            p.clinicalSummary.diagnosis.toLowerCase().includes(query) ||
            p.items.some((it) => it.medicine.toLowerCase().includes(query))
        );
      }

      return {
        success: true,
        data: {
          prescriptions: resultList,
          total: resultList.length,
        },
      };
    } catch (err) {
      console.error("PrescriptionService.getPatientPrescriptions error:", err);
      if (ALLOW_MEMORY_FALLBACK) {
        const list = Array.from(memoryPrescriptions.values());
        return { success: true, data: { prescriptions: list, total: list.length } };
      }
      return { success: false, error: "Failed to retrieve prescriptions" };
    }
  }

  /**
   * Fetch detailed prescription by ID with RBAC ownership validation
   */
  static async getPrescriptionById(
    prescriptionId: string,
    requestingUserId: string,
    requestingRole: string
  ): Promise<{
    success: boolean;
    data?: PrescriptionDTO;
    error?: "NOT_FOUND" | "FORBIDDEN" | "SERVER_ERROR";
    message?: string;
  }> {
    try {
      const p = await prisma.prescription.findUnique({
        where: { id: prescriptionId },
        include: {
          items: {
            orderBy: { sortOrder: "asc" },
          },
          consultation: {
            include: {
              appointment: {
                include: {
                  branch: {
                    include: { hospital: true },
                  },
                  patient: {
                    include: { user: true },
                  },
                },
              },
              doctor: {
                include: {
                  user: true,
                  department: true,
                },
              },
            },
          },
        },
      });

      if (!p) {
        if (ALLOW_MEMORY_FALLBACK && memoryPrescriptions.has(prescriptionId)) {
          return { success: true, data: memoryPrescriptions.get(prescriptionId) };
        }
        return { success: false, error: "NOT_FOUND", message: "Prescription not found" };
      }

      // Authorization checks
      if (requestingRole === "PATIENT") {
        if (p.consultation.appointment.patient.userId !== requestingUserId) {
          return { success: false, error: "FORBIDDEN", message: "You do not have access to this prescription" };
        }
      } else if (requestingRole === "DOCTOR") {
        if (p.consultation.doctor.userId !== requestingUserId) {
          // Doctors can only view if same hospital / treating
          return { success: false, error: "FORBIDDEN", message: "Prescription access restricted" };
        }
      }

      const dto: PrescriptionDTO = {
        id: p.id,
        prescriptionNumber: `RX-${p.id.slice(-6).toUpperCase()}`,
        consultationId: p.consultationId,
        appointmentId: p.consultation.appointmentId,
        tokenNumber: p.consultation.appointment.tokenNumber,
        date: p.consultation.appointment.date.toISOString().split("T")[0],
        time: p.consultation.appointment.startTime,
        version: p.version,
        pdfUrl: p.pdfUrl,
        doctor: {
          id: p.consultation.doctor.id,
          name: p.consultation.doctor.name,
          specialty: p.consultation.doctor.specialty,
          qualifications: p.consultation.doctor.qualifications || "MBBS, MD",
          branchName: p.consultation.appointment.branch?.name || "Main Hospital Branch",
        },
        patient: {
          id: p.consultation.appointment.patient.id,
          name: p.consultation.appointment.patient.name,
          gender: p.consultation.appointment.patient.gender,
          age: p.consultation.appointment.patient.age,
          bloodGroup: p.consultation.appointment.patient.bloodGroup,
          phone: p.consultation.appointment.patient.user?.phone,
        },
        clinicalSummary: {
          diagnosis: p.consultation.diagnosis,
          notes: p.consultation.notes,
          followUpDate: p.consultation.followUpDate ? p.consultation.followUpDate.toISOString().split("T")[0] : null,
        },
        items: p.items.map((it) => ({
          id: it.id,
          medicine: it.medicine,
          dose: it.dose,
          duration: it.duration,
          instructions: it.instructions,
          sortOrder: it.sortOrder,
        })),
        createdAt: p.createdAt.toISOString(),
      };

      return { success: true, data: dto };
    } catch (err) {
      console.error("PrescriptionService.getPrescriptionById error:", err);
      if (ALLOW_MEMORY_FALLBACK && memoryPrescriptions.has(prescriptionId)) {
        return { success: true, data: memoryPrescriptions.get(prescriptionId) };
      }
      return { success: false, error: "SERVER_ERROR", message: "Failed to load prescription details" };
    }
  }

  /**
   * Helper for in-memory seed / testing
   */
  static seedMemoryPrescription(dto: PrescriptionDTO) {
    memoryPrescriptions.set(dto.id, dto);
  }
}
