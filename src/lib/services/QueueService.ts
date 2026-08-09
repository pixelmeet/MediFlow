import { prisma } from "../db";
import { ALLOW_MEMORY_FALLBACK } from "../auth/config";

export interface QueueItemDTO {
  tokenId: string;
  appointmentId: string;
  tokenNumber: string;
  patientName: string;
  scheduledTime: string;
  status: "WAITING" | "IN_PROGRESS" | "DONE" | "NO_SHOW";
  calledAt?: string | null;
  position: number;
}

export interface QueueSnapshotDTO {
  doctorId: string;
  doctorName: string;
  specialty: string;
  date: string;
  currentToken: QueueItemDTO | null;
  waitingCount: number;
  totalToday: number;
  completedCount: number;
  avgDurationMinutes: number;
  queue: QueueItemDTO[];
}

// In-memory queue state for dev mode fallback
const memoryQueueState = new Map<string, QueueItemDTO[]>([
  [
    "doc_patel_01",
    [
      {
        tokenId: "tok_01",
        appointmentId: "apt_01",
        tokenNumber: "A-01",
        patientName: "Suresh Gupta",
        scheduledTime: "10:00",
        status: "DONE",
        position: 1,
        calledAt: "10:02",
      },
      {
        tokenId: "tok_02",
        appointmentId: "apt_02",
        tokenNumber: "A-02",
        patientName: "Anita Sharma",
        scheduledTime: "10:20",
        status: "IN_PROGRESS",
        position: 2,
        calledAt: "10:25",
      },
      {
        tokenId: "tok_03",
        appointmentId: "apt_03",
        tokenNumber: "A-03",
        patientName: "Meet Vora",
        scheduledTime: "10:40",
        status: "WAITING",
        position: 3,
      },
      {
        tokenId: "tok_04",
        appointmentId: "apt_04",
        tokenNumber: "A-04",
        patientName: "Rohan Deshmukh",
        scheduledTime: "11:00",
        status: "WAITING",
        position: 4,
      },
    ],
  ],
]);

export class QueueService {
  /**
   * Get real-time queue snapshot for a doctor on a given date
   */
  static async getQueueSnapshot(
    doctorId: string,
    dateStr: string = new Date().toISOString().slice(0, 10)
  ): Promise<QueueSnapshotDTO> {
    const todayStart = new Date(dateStr + "T00:00:00.000Z");
    const todayEnd = new Date(dateStr + "T23:59:59.999Z");

    try {
      const [doctor, appointments] = await Promise.all([
        prisma.doctor.findUnique({
          where: { id: doctorId },
          select: { name: true, specialty: true, appointmentDurationMin: true },
        }),
        prisma.appointment.findMany({
          where: {
            doctorId,
            date: { gte: todayStart, lte: todayEnd },
            status: { in: ["CONFIRMED", "CHECKED_IN", "WAITING", "IN_CONSULTATION", "COMPLETED", "NO_SHOW"] },
          },
          include: {
            patient: { select: { name: true } },
            queueToken: true,
          },
          orderBy: { startTime: "asc" },
        }),
      ]);

      if (doctor) {
        const queueItems: QueueItemDTO[] = appointments.map((apt, idx) => {
          let qStatus: QueueItemDTO["status"] = "WAITING";
          if (apt.status === "COMPLETED") qStatus = "DONE";
          else if (apt.status === "IN_CONSULTATION") qStatus = "IN_PROGRESS";
          else if (apt.status === "NO_SHOW" || apt.status === "CANCELLED") qStatus = "NO_SHOW";
          else if (apt.queueToken?.status) qStatus = apt.queueToken.status;

          return {
            tokenId: apt.queueToken?.id || `tok_${apt.id}`,
            appointmentId: apt.id,
            tokenNumber: apt.tokenNumber,
            patientName: apt.patient.name,
            scheduledTime: apt.startTime,
            status: qStatus,
            position: apt.queueToken?.position || idx + 1,
            calledAt: apt.queueToken?.calledAt?.toISOString() || null,
          };
        });

        const currentToken = queueItems.find((q) => q.status === "IN_PROGRESS") || null;
        const waitingCount = queueItems.filter((q) => q.status === "WAITING").length;
        const completedCount = queueItems.filter((q) => q.status === "DONE").length;

        return {
          doctorId,
          doctorName: doctor.name,
          specialty: doctor.specialty,
          date: dateStr,
          currentToken,
          waitingCount,
          totalToday: queueItems.length,
          completedCount,
          avgDurationMinutes: doctor.appointmentDurationMin || 20,
          queue: queueItems,
        };
      }

      if (!ALLOW_MEMORY_FALLBACK) {
        return {
          doctorId,
          doctorName: "Doctor",
          specialty: "General",
          date: dateStr,
          currentToken: null,
          waitingCount: 0,
          totalToday: 0,
          completedCount: 0,
          avgDurationMinutes: 20,
          queue: [],
        };
      }
    } catch (dbError) {
      console.error("Database error in QueueService.getQueueSnapshot:", dbError);
      if (!ALLOW_MEMORY_FALLBACK) {
        throw dbError;
      }
    }

    // Dev fallback
    const items = memoryQueueState.get(doctorId) || memoryQueueState.get("doc_patel_01") || [];
    const currentToken = items.find((q) => q.status === "IN_PROGRESS") || null;
    const waitingCount = items.filter((q) => q.status === "WAITING").length;
    const completedCount = items.filter((q) => q.status === "DONE").length;

    return {
      doctorId,
      doctorName: "Dr. Rajesh Patel",
      specialty: "Cardiology",
      date: dateStr,
      currentToken,
      waitingCount,
      totalToday: items.length,
      completedCount,
      avgDurationMinutes: 20,
      queue: items,
    };
  }

  /**
   * Check in a patient on arrival
   */
  static async checkInPatient(
    appointmentId: string,
    requestingUserId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const [requestingUser, patient, existing] = await Promise.all([
        prisma.user.findUnique({
          where: { id: requestingUserId },
          select: { role: true },
        }),
        prisma.patient.findFirst({
          where: { userId: requestingUserId },
        }),
        prisma.appointment.findUnique({
          where: { id: appointmentId },
        }),
      ]);

      if (!existing) {
        return { success: false, error: "Appointment not found." };
      }

      const isStaff = requestingUser?.role === "DOCTOR" || requestingUser?.role === "ADMIN";

      if (!isStaff && (!patient || existing.patientId !== patient.id)) {
        return { success: false, error: "You can only check in your own appointment." };
      }

      await prisma.$transaction([
        prisma.appointment.update({
          where: { id: appointmentId },
          data: {
            status: "CHECKED_IN",
            checkedInAt: new Date(),
          },
        }),
        prisma.queueToken.updateMany({
          where: { appointmentId },
          data: { status: "WAITING" },
        }),
      ]);

      return { success: true };
    } catch (dbError) {
      console.error("Database error in QueueService.checkInPatient:", dbError);
      if (!ALLOW_MEMORY_FALLBACK) {
        return { success: false, error: "Database error. Could not complete check-in." };
      }

      return { success: true };
    }
  }

  /**
   * Doctor calls the next patient in queue
   */
  static async callNextPatient(doctorId: string): Promise<{
    success: boolean;
    calledToken?: QueueItemDTO;
    error?: string;
  }> {
    const todayStart = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");
    const todayEnd = new Date(new Date().toISOString().slice(0, 10) + "T23:59:59.999Z");

    try {
      // Find current in_progress token and mark as COMPLETED/DONE
      const currentActive = await prisma.appointment.findFirst({
        where: {
          doctorId,
          date: { gte: todayStart, lte: todayEnd },
          status: "IN_CONSULTATION",
        },
      });

      if (currentActive) {
        await prisma.$transaction([
          prisma.appointment.update({
            where: { id: currentActive.id },
            data: { status: "COMPLETED" },
          }),
          prisma.queueToken.updateMany({
            where: { appointmentId: currentActive.id },
            data: { status: "DONE" },
          }),
        ]);
      }

      // Find next waiting appointment
      const nextApt = await prisma.appointment.findFirst({
        where: {
          doctorId,
          date: { gte: todayStart, lte: todayEnd },
          status: { in: ["CONFIRMED", "CHECKED_IN", "WAITING"] },
        },
        orderBy: { startTime: "asc" },
        include: {
          patient: { select: { name: true } },
          queueToken: true,
        },
      });

      if (!nextApt) {
        return {
          success: false,
          error: "No more waiting patients in queue for today.",
        };
      }

      const now = new Date();
      await prisma.$transaction([
        prisma.appointment.update({
          where: { id: nextApt.id },
          data: { status: "IN_CONSULTATION" },
        }),
        prisma.queueToken.updateMany({
          where: { appointmentId: nextApt.id },
          data: {
            status: "IN_PROGRESS",
            calledAt: now,
          },
        }),
      ]);

      return {
        success: true,
        calledToken: {
          tokenId: nextApt.queueToken?.id || `tok_${nextApt.id}`,
          appointmentId: nextApt.id,
          tokenNumber: nextApt.tokenNumber,
          patientName: nextApt.patient.name,
          scheduledTime: nextApt.startTime,
          status: "IN_PROGRESS",
          calledAt: now.toISOString(),
          position: nextApt.queueToken?.position || 1,
        },
      };
    } catch (dbError) {
      console.error("Database error in QueueService.callNextPatient:", dbError);
      if (!ALLOW_MEMORY_FALLBACK) {
        return { success: false, error: "Database error while advancing queue." };
      }

      // Dev fallback state transition
      const items = memoryQueueState.get(doctorId) || memoryQueueState.get("doc_patel_01") || [];
      const current = items.find((q) => q.status === "IN_PROGRESS");
      if (current) current.status = "DONE";

      const next = items.find((q) => q.status === "WAITING");
      if (!next) {
        return { success: false, error: "No more waiting patients in queue for today." };
      }

      next.status = "IN_PROGRESS";
      next.calledAt = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      return {
        success: true,
        calledToken: next,
      };
    }
  }
}
