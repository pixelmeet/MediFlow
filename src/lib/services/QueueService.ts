import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { CheckInService } from "./CheckInService";
import { EventEmitter } from "events";

export type DoctorClinicalStatus = "CONSULTING" | "ON_BREAK" | "DELAYED" | "IDLE";

export interface DoctorCabinStatusDTO {
  status: DoctorClinicalStatus;
  delayMinutes: number;
  breakStartedAt?: string | null;
  note?: string | null;
  updatedAt: string;
}

export interface QueueItemDTO {
  tokenId: string;
  appointmentId: string;
  tokenNumber: string;
  patientName: string;
  scheduledTime: string;
  status: "WAITING" | "IN_PROGRESS" | "DONE" | "NO_SHOW" | "CANCELLED";
  appointmentStatus?: string;
  isCheckedIn?: boolean;
  checkedInAt?: string | null;
  calledAt?: string | null;
  position: number;
}

export interface QueueSnapshotDTO {
  doctorId: string;
  doctorName: string;
  specialty: string;
  branchName?: string;
  date: string;
  doctorStatus: DoctorCabinStatusDTO;
  currentToken: QueueItemDTO | null;
  waitingCount: number;
  totalToday: number;
  completedCount: number;
  avgDurationMinutes: number;
  estimatedWaitMinutes: number;
  queue: QueueItemDTO[];
}

export interface DoctorQueueSummaryDTO {
  doctorId: string;
  doctorName: string;
  specialty: string;
  branchName: string;
  doctorStatus: DoctorCabinStatusDTO;
  currentTokenNumber: string | null;
  currentPatientName: string | null;
  waitingCount: number;
  completedCount: number;
  totalToday: number;
  avgDurationMinutes: number;
  estimatedWaitMinutes: number;
}

// ─── Real-Time In-Memory Pub/Sub Bus ─────────────────────────
class QueueEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(200); // Support high concurrent client SSE streams
  }

  broadcast(doctorId: string, type: string, data: unknown) {
    this.emit(`queue:${doctorId}`, { type, data, timestamp: new Date().toISOString() });
    this.emit("queue:all", { doctorId, type, data, timestamp: new Date().toISOString() });
  }
}

export const queueEventBus = new QueueEventBus();

// Doctor status state store
const doctorCabinStatuses = new Map<string, DoctorCabinStatusDTO>([
  [
    "doc_patel_01",
    {
      status: "CONSULTING",
      delayMinutes: 0,
      note: "On schedule in Cabin 4",
      updatedAt: new Date().toISOString(),
    },
  ],
]);

export class QueueService {
  /**
   * Get doctor cabin status
   */
  static getDoctorStatus(doctorId: string): DoctorCabinStatusDTO {
    return (
      doctorCabinStatuses.get(doctorId) || {
        status: "CONSULTING",
        delayMinutes: 0,
        note: null,
        updatedAt: new Date().toISOString(),
      }
    );
  }

  /**
   * Update doctor cabin status (Consulting, On Break, Delayed) and broadcast live update
   */
  static setDoctorStatus(
    doctorId: string,
    status: DoctorClinicalStatus,
    delayMinutes: number = 0,
    note?: string
  ): DoctorCabinStatusDTO {
    const updated: DoctorCabinStatusDTO = {
      status,
      delayMinutes,
      breakStartedAt: status === "ON_BREAK" ? new Date().toISOString() : null,
      note: note || null,
      updatedAt: new Date().toISOString(),
    };

    doctorCabinStatuses.set(doctorId, updated);

    // Broadcast live event to all patients & doctors watching this queue
    queueEventBus.broadcast(doctorId, "doctor_status", updated);

    return updated;
  }

  /**
   * Get real-time queue snapshot for a doctor on a given date
   */
  static async getQueueSnapshot(
    doctorId: string,
    dateStr: string = new Date().toISOString().slice(0, 10)
  ): Promise<QueueSnapshotDTO> {
    const todayStart = new Date(dateStr + "T00:00:00.000Z");
    const todayEnd = new Date(dateStr + "T23:59:59.999Z");
    const doctorStatus = this.getDoctorStatus(doctorId);

    try {
      const [doctor, appointments] = await Promise.all([
        prisma.doctor.findUnique({
          where: { id: doctorId },
          include: {
            department: { include: { branch: true } },
          },
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
          orderBy: [{ queueToken: { position: "asc" } }, { startTime: "asc" }],
        }),
      ]);

      if (doctor) {
        const queueItems: QueueItemDTO[] = appointments.map((apt, idx) => {
          let qStatus: QueueItemDTO["status"] = "WAITING";
          if (apt.status === "COMPLETED") qStatus = "DONE";
          else if (apt.status === "IN_CONSULTATION") qStatus = "IN_PROGRESS";
          else if (apt.status === "CANCELLED") qStatus = "CANCELLED";
          else if (apt.status === "NO_SHOW") qStatus = "NO_SHOW";
          else if (apt.queueToken?.status) qStatus = apt.queueToken.status;

          const isCheckedIn =
            Boolean(apt.checkedInAt) ||
            apt.status === "CHECKED_IN" ||
            apt.status === "IN_CONSULTATION" ||
            apt.status === "COMPLETED";

          return {
            tokenId: apt.queueToken?.id || `tok_${apt.id}`,
            appointmentId: apt.id,
            tokenNumber: apt.tokenNumber,
            patientName: apt.patient.name,
            scheduledTime: apt.startTime,
            status: qStatus,
            appointmentStatus: apt.status,
            isCheckedIn,
            checkedInAt: apt.checkedInAt?.toISOString() || null,
            position: apt.queueToken?.position || idx + 1,
            calledAt: apt.queueToken?.calledAt?.toISOString() || null,
          };
        });

        const currentToken = queueItems.find((q) => q.status === "IN_PROGRESS") || null;
        const waitingCount = queueItems.filter((q) => q.status === "WAITING").length;
        const completedCount = queueItems.filter((q) => q.status === "DONE").length;
        const avgDuration = doctor.appointmentDurationMin || 20;

        // Dynamic ETA calculation
        const baseWaitMin = waitingCount * avgDuration;
        const extraOffset = doctorStatus.status === "ON_BREAK" || doctorStatus.status === "DELAYED" ? doctorStatus.delayMinutes : 0;
        const estimatedWaitMinutes = Math.max(0, baseWaitMin + extraOffset);

        return {
          doctorId,
          doctorName: doctor.name,
          specialty: doctor.specialty,
          branchName: doctor.department.branch.name,
          date: dateStr,
          doctorStatus,
          currentToken,
          waitingCount,
          totalToday: queueItems.length,
          completedCount,
          avgDurationMinutes: avgDuration,
          estimatedWaitMinutes,
          queue: queueItems,
        };
      }

      return {
        doctorId,
        doctorName: "Doctor",
        specialty: "General",
        date: dateStr,
        doctorStatus,
        currentToken: null,
        waitingCount: 0,
        totalToday: 0,
        completedCount: 0,
        avgDurationMinutes: 20,
        estimatedWaitMinutes: 0,
        queue: [],
      };
    } catch (dbError) {
      console.error("Database error in QueueService.getQueueSnapshot:", dbError);
      throw dbError;
    }
  }

  /**
   * Check in a patient on arrival (delegated to CheckInService)
   */
  static async checkInPatient(
    appointmentId: string,
    requestingUserId: string,
    options?: { forceByStaff?: boolean }
  ): Promise<{ success: boolean; error?: string; isLate?: boolean; checkedInAt?: string }> {
    const res = await CheckInService.checkInPatient(appointmentId, requestingUserId, options);
    if (res.success) {
      // Find appointment to broadcast update
      try {
        const apt = await prisma.appointment.findUnique({
          where: { id: appointmentId },
          select: { doctorId: true },
        });
        if (apt) {
          queueEventBus.broadcast(apt.doctorId, "queue_update", { appointmentId, status: "CHECKED_IN" });
        }
      } catch {
        queueEventBus.broadcast("doc_patel_01", "queue_update", { appointmentId, status: "CHECKED_IN" });
      }
    }
    return res;
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
      // Execute entire queue transition inside a single Serializable transaction to prevent race conditions
      const transitionResult = await prisma.$transaction(
        async (tx) => {
          // 1. Find and complete current active consultation
          const currentActive = await tx.appointment.findFirst({
            where: {
              doctorId,
              date: { gte: todayStart, lte: todayEnd },
              status: "IN_CONSULTATION",
            },
          });

          if (currentActive) {
            await tx.appointment.update({
              where: { id: currentActive.id },
              data: { status: "COMPLETED" },
            });
            await tx.queueToken.updateMany({
              where: { appointmentId: currentActive.id },
              data: { status: "DONE", completedAt: new Date() },
            });
          }

          // 2. Find next waiting appointment (prefer checked-in patients, monotonic order)
          const nextApt = await tx.appointment.findFirst({
            where: {
              doctorId,
              date: { gte: todayStart, lte: todayEnd },
              status: { in: ["CHECKED_IN", "WAITING", "CONFIRMED"] },
            },
            orderBy: [{ queueToken: { position: "asc" } }, { startTime: "asc" }],
            include: {
              patient: { select: { name: true } },
              queueToken: true,
            },
          });

          if (!nextApt) {
            return null;
          }

          // 3. Mark next appointment as IN_CONSULTATION
          const now = new Date();
          await tx.appointment.update({
            where: { id: nextApt.id },
            data: { status: "IN_CONSULTATION" },
          });
          await tx.queueToken.updateMany({
            where: { appointmentId: nextApt.id },
            data: {
              status: "IN_PROGRESS",
              calledAt: now,
            },
          });

          return { nextApt, now };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        }
      );

      if (!transitionResult) {
        return {
          success: false,
          error: "No more waiting patients in queue for today.",
        };
      }

      const { nextApt, now } = transitionResult;
      const calledToken: QueueItemDTO = {
        tokenId: nextApt.queueToken?.id || `tok_${nextApt.id}`,
        appointmentId: nextApt.id,
        tokenNumber: nextApt.tokenNumber,
        patientName: nextApt.patient.name,
        scheduledTime: nextApt.startTime,
        status: "IN_PROGRESS",
        appointmentStatus: "IN_CONSULTATION",
        isCheckedIn: true,
        calledAt: now.toISOString(),
        position: nextApt.queueToken?.position || 1,
      };

      // Broadcast live event to all clients
      queueEventBus.broadcast(doctorId, "call_next", calledToken);
      queueEventBus.broadcast(doctorId, "queue_diff", { doctorId });

      return {
        success: true,
        calledToken,
      };
    } catch (dbError) {
      console.error("Database error in QueueService.callNextPatient:", dbError);
      return { success: false, error: "Database error while advancing queue." };
    }
  }

  /**
   * Administrative queue reordering / priority adjustment
   */
  static async reorderQueue(
    doctorId: string,
    appointmentId: string,
    targetPosition: number,
    actorUserId: string,
    reason: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const todayStart = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");
      const todayEnd = new Date(new Date().toISOString().slice(0, 10) + "T23:59:59.999Z");

      const tokens = await prisma.queueToken.findMany({
        where: {
          appointment: {
            doctorId,
            date: { gte: todayStart, lte: todayEnd },
          },
        },
        orderBy: { position: "asc" },
      });

      const movingToken = tokens.find((t) => t.appointmentId === appointmentId);
      if (!movingToken) {
        return { success: false, error: "Queue token not found." };
      }

      const filtered = tokens.filter((t) => t.appointmentId !== appointmentId);
      const clampedPos = Math.max(1, Math.min(targetPosition, tokens.length));
      filtered.splice(clampedPos - 1, 0, movingToken);

      await prisma.$transaction(async (tx) => {
        for (let i = 0; i < filtered.length; i++) {
          await tx.queueToken.update({
            where: { id: filtered[i].id },
            data: { position: i + 1 },
          });
        }

        await tx.auditLog.create({
          data: {
            actorId: actorUserId,
            action: "reorder_queue",
            entity: "queue",
            entityId: appointmentId,
            reason,
            metadata: { targetPosition: clampedPos, previousPosition: movingToken.position },
          },
        });
      });

      queueEventBus.broadcast(doctorId, "queue_diff", { reordered: true, appointmentId });
      return { success: true };
    } catch (dbError) {
      console.error("Database error in QueueService.reorderQueue:", dbError);
      return { success: false, error: "Failed to reorder queue." };
    }
  }

  /**
   * Hospital-wide multi-doctor queue monitor overview
   */
  static async getHospitalQueueOverview(branchId?: string): Promise<DoctorQueueSummaryDTO[]> {
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayStart = new Date(`${todayStr}T00:00:00.000Z`);
    const todayEnd = new Date(`${todayStr}T23:59:59.999Z`);

    try {
      const doctors = await prisma.doctor.findMany({
        where: {
          isActive: true,
          ...(branchId ? { department: { branchId } } : {}),
        },
        include: {
          department: { include: { branch: true } },
          appointments: {
            where: {
              date: { gte: todayStart, lte: todayEnd },
              status: { in: ["CONFIRMED", "CHECKED_IN", "WAITING", "IN_CONSULTATION", "COMPLETED", "NO_SHOW"] },
            },
            include: { patient: true, queueToken: true },
          },
        },
      });

      return doctors.map((doc) => {
        const apts = doc.appointments;
        const current = apts.find((a) => a.status === "IN_CONSULTATION");
        const waitingCount = apts.filter((a) => a.status === "WAITING" || a.status === "CHECKED_IN").length;
        const completedCount = apts.filter((a) => a.status === "COMPLETED").length;
        const avgDuration = doc.appointmentDurationMin || 20;
        const docStatus = this.getDoctorStatus(doc.id);
        const extraOffset = docStatus.status === "ON_BREAK" || docStatus.status === "DELAYED" ? docStatus.delayMinutes : 0;

        return {
          doctorId: doc.id,
          doctorName: doc.name,
          specialty: doc.specialty,
          branchName: doc.department.branch.name,
          doctorStatus: docStatus,
          currentTokenNumber: current?.tokenNumber || null,
          currentPatientName: current?.patient.name || null,
          waitingCount,
          completedCount,
          totalToday: apts.length,
          avgDurationMinutes: avgDuration,
          estimatedWaitMinutes: Math.max(0, waitingCount * avgDuration + extraOffset),
        };
      });
    } catch (dbError) {
      console.error("Database error in getHospitalQueueOverview:", dbError);
      throw dbError;
    }
  }
}
