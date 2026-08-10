import { prisma } from "../db";
import { ALLOW_MEMORY_FALLBACK } from "../auth/config";

export interface CheckInEligibility {
  eligible: boolean;
  status:
    | "ELIGIBLE"
    | "TOO_EARLY"
    | "GRACE_PERIOD"
    | "EXPIRED"
    | "ALREADY_CHECKED_IN"
    | "NOT_CONFIRMED";
  minutesUntilOpen?: number;
  minutesLate?: number;
  message: string;
}

export interface CheckInDeskItemDTO {
  id: string;
  tokenNumber: string;
  patientName: string;
  patientPhone?: string | null;
  doctorName: string;
  doctorId: string;
  specialty: string;
  branchName: string;
  branchId: string;
  date: string;
  startTime: string;
  status: "CONFIRMED" | "CHECKED_IN" | "WAITING" | "IN_CONSULTATION" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  fee: number;
  checkedInAt?: string | null;
  eligibility: CheckInEligibility;
}

// In-memory store for fallback mode in dev
const memoryCheckIns = new Map<string, { status: string; checkedInAt?: string; cancelReason?: string }>();

export class CheckInService {
  /**
   * Evaluate whether an appointment is currently eligible for check-in
   */
  static evaluateEligibility(
    appointment: {
      date: Date | string;
      startTime: string;
      status: string;
      checkedInAt?: Date | string | null;
      branch?: { earlyCheckinMin?: number; gracePeriodMin?: number } | null;
    },
    now: Date = new Date()
  ): CheckInEligibility {
    if (appointment.status === "CHECKED_IN" || appointment.status === "WAITING" || appointment.status === "IN_CONSULTATION") {
      return {
        eligible: false,
        status: "ALREADY_CHECKED_IN",
        message: "Patient is already checked in and in queue.",
      };
    }

    if (appointment.status === "COMPLETED") {
      return {
        eligible: false,
        status: "NOT_CONFIRMED",
        message: "Consultation has already been completed.",
      };
    }

    if (appointment.status === "CANCELLED") {
      return {
        eligible: false,
        status: "NOT_CONFIRMED",
        message: "Appointment was cancelled.",
      };
    }

    if (appointment.status === "NO_SHOW") {
      return {
        eligible: false,
        status: "EXPIRED",
        message: "Marked as No-Show. Reception reinstatement required.",
      };
    }

    // Parse appointment slot date & time
    const dateStr =
      appointment.date instanceof Date
        ? appointment.date.toISOString().slice(0, 10)
        : String(appointment.date).slice(0, 10);

    const [hoursStr, minsStr] = appointment.startTime.split(":");
    const hours = parseInt(hoursStr, 10);
    const mins = parseInt(minsStr, 10);

    // Construct slot time in UTC consistent space
    const slotTime = new Date(`${dateStr}T${hoursStr.padStart(2, "0")}:${minsStr.padStart(2, "0")}:00.000Z`);

    const earlyCheckinMin = appointment.branch?.earlyCheckinMin ?? 60;
    const gracePeriodMin = appointment.branch?.gracePeriodMin ?? 15;

    // Difference in minutes: positive = time past slot, negative = time before slot
    const diffMs = now.getTime() - slotTime.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    // 1. Too early (more than earlyCheckinMin before scheduled slot)
    if (diffMinutes < -earlyCheckinMin) {
      const minutesUntilOpen = -diffMinutes - earlyCheckinMin;
      return {
        eligible: false,
        status: "TOO_EARLY",
        minutesUntilOpen,
        message: `Check-in opens in ${minutesUntilOpen} minute${minutesUntilOpen === 1 ? "" : "s"} (${earlyCheckinMin} mins before slot).`,
      };
    }

    // 2. Normal check-in window (between -earlyCheckinMin and slotTime)
    if (diffMinutes <= 0) {
      return {
        eligible: true,
        status: "ELIGIBLE",
        message: "Check-in is open. Patient may check in now.",
      };
    }

    // 3. Grace period (after slot time, but within grace period)
    if (diffMinutes <= gracePeriodMin) {
      return {
        eligible: true,
        status: "GRACE_PERIOD",
        minutesLate: diffMinutes,
        message: `Grace period active (${gracePeriodMin - diffMinutes} min remaining). Patient is ${diffMinutes} min late.`,
      };
    }

    // 4. Past grace period
    return {
      eligible: false,
      status: "EXPIRED",
      minutesLate: diffMinutes,
      message: `Grace period expired (${diffMinutes} mins past slot). Eligible for automated No-Show sweep.`,
    };
  }

  /**
   * Process patient or staff check-in
   */
  static async checkInPatient(
    appointmentId: string,
    actorUserId: string,
    options?: { forceByStaff?: boolean }
  ): Promise<{ success: boolean; error?: string; isLate?: boolean; checkedInAt?: string }> {
    try {
      const [actorUser, patient, appointment] = await Promise.all([
        prisma.user.findUnique({
          where: { id: actorUserId },
          select: { id: true, role: true },
        }),
        prisma.patient.findFirst({
          where: { userId: actorUserId },
        }),
        prisma.appointment.findUnique({
          where: { id: appointmentId },
          include: {
            branch: true,
            patient: true,
            queueToken: true,
          },
        }),
      ]);

      if (!appointment) {
        return { success: false, error: "Appointment not found." };
      }

      const isStaff = actorUser?.role === "ADMIN" || actorUser?.role === "DOCTOR";

      // Role authorization
      if (!isStaff) {
        if (!patient || appointment.patientId !== patient.id) {
          return { success: false, error: "You can only check in for your own appointment." };
        }
      }

      // If already checked in
      if (appointment.status === "CHECKED_IN" || appointment.status === "WAITING" || appointment.status === "IN_CONSULTATION") {
        return {
          success: true,
          checkedInAt: appointment.checkedInAt?.toISOString() || new Date().toISOString(),
        };
      }

      if (appointment.status === "NO_SHOW") {
        return {
          success: false,
          error: "Appointment has been marked as a No-Show. Please contact reception to be reinstated.",
        };
      }

      if (appointment.status === "CANCELLED" || appointment.status === "COMPLETED") {
        return {
          success: false,
          error: `Cannot check in an appointment that is already ${appointment.status.toLowerCase()}.`,
        };
      }

      const now = new Date();
      const eligibility = this.evaluateEligibility(appointment, now);

      // Enforce early check-in window for patients unless forced by staff
      if (!isStaff && !options?.forceByStaff && !eligibility.eligible) {
        return { success: false, error: eligibility.message };
      }

      const isLate = eligibility.status === "GRACE_PERIOD" || (eligibility.minutesLate !== undefined && eligibility.minutesLate > 0);

      // Perform check-in transaction
      await prisma.$transaction(async (tx) => {
        await tx.appointment.update({
          where: { id: appointmentId },
          data: {
            status: "CHECKED_IN",
            checkedInAt: now,
          },
        });

        await tx.queueToken.updateMany({
          where: { appointmentId },
          data: { status: "WAITING" },
        });

        await tx.auditLog.create({
          data: {
            actorId: actorUserId,
            action: isStaff ? "staff_checkin" : "patient_self_checkin",
            entity: "appointment",
            entityId: appointmentId,
            metadata: {
              isLate,
              checkedInAt: now.toISOString(),
              actorRole: actorUser?.role || "PATIENT",
              forceByStaff: Boolean(options?.forceByStaff),
            },
          },
        });
      });

      return {
        success: true,
        isLate,
        checkedInAt: now.toISOString(),
      };
    } catch (dbError) {
      console.error("Database error in CheckInService.checkInPatient:", dbError);
      if (!ALLOW_MEMORY_FALLBACK) {
        return { success: false, error: "Database error during check-in." };
      }

      const now = new Date();
      memoryCheckIns.set(appointmentId, {
        status: "CHECKED_IN",
        checkedInAt: now.toISOString(),
      });

      return {
        success: true,
        isLate: false,
        checkedInAt: now.toISOString(),
      };
    }
  }

  /**
   * Reinstate a NO_SHOW appointment back to active waiting queue (Admin/Reception only)
   */
  static async reinstateNoShow(
    appointmentId: string,
    adminUserId: string,
    reason: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const [adminUser, appointment] = await Promise.all([
        prisma.user.findUnique({
          where: { id: adminUserId },
          select: { role: true },
        }),
        prisma.appointment.findUnique({
          where: { id: appointmentId },
          include: { queueToken: true },
        }),
      ]);

      if (!appointment) {
        return { success: false, error: "Appointment not found." };
      }

      if (adminUser?.role !== "ADMIN" && adminUser?.role !== "DOCTOR") {
        return { success: false, error: "Only reception or hospital staff can reinstate a No-Show." };
      }

      if (appointment.status !== "NO_SHOW") {
        return {
          success: false,
          error: `Only NO_SHOW appointments can be reinstated (current status: ${appointment.status}).`,
        };
      }

      const now = new Date();

      await prisma.$transaction(async (tx) => {
        await tx.appointment.update({
          where: { id: appointmentId },
          data: {
            status: "CHECKED_IN",
            checkedInAt: now,
          },
        });

        await tx.queueToken.updateMany({
          where: { appointmentId },
          data: { status: "WAITING" },
        });

        await tx.auditLog.create({
          data: {
            actorId: adminUserId,
            action: "reinstate_noshow",
            entity: "appointment",
            entityId: appointmentId,
            reason,
            metadata: {
              reinstatedAt: now.toISOString(),
              adminUserId,
            },
          },
        });
      });

      return { success: true };
    } catch (dbError) {
      console.error("Database error in CheckInService.reinstateNoShow:", dbError);
      if (!ALLOW_MEMORY_FALLBACK) {
        return { success: false, error: "Failed to reinstate appointment." };
      }

      memoryCheckIns.set(appointmentId, {
        status: "CHECKED_IN",
        checkedInAt: new Date().toISOString(),
      });

      return { success: true };
    }
  }

  /**
   * Run automated no-show sweep for appointments past their grace period
   */
  static async sweepNoShows(params?: {
    branchId?: string;
    dateStr?: string;
    actorUserId?: string;
  }): Promise<{ sweptCount: number; sweptIds: string[]; date: string }> {
    const targetDateStr = params?.dateStr || new Date().toISOString().slice(0, 10);
    const dateStart = new Date(`${targetDateStr}T00:00:00.000Z`);
    const dateEnd = new Date(`${targetDateStr}T23:59:59.999Z`);
    const now = new Date();

    try {
      // Find all CONFIRMED appointments for target date
      const candidates = await prisma.appointment.findMany({
        where: {
          date: { gte: dateStart, lte: dateEnd },
          status: "CONFIRMED",
          ...(params?.branchId ? { branchId: params.branchId } : {}),
        },
        include: {
          branch: true,
          queueToken: true,
        },
      });

      const sweptIds: string[] = [];

      for (const apt of candidates) {
        const eligibility = this.evaluateEligibility(apt, now);
        // If past grace period and expired
        if (eligibility.status === "EXPIRED") {
          sweptIds.push(apt.id);
        }
      }

      if (sweptIds.length > 0) {
        await prisma.$transaction(async (tx) => {
          await tx.appointment.updateMany({
            where: { id: { in: sweptIds } },
            data: { status: "NO_SHOW" },
          });

          await tx.queueToken.updateMany({
            where: { appointmentId: { in: sweptIds } },
            data: { status: "NO_SHOW" },
          });

          for (const id of sweptIds) {
            await tx.auditLog.create({
              data: {
                actorId: params?.actorUserId || "system_noshow_sweep_worker",
                action: "auto_sweep_noshow",
                entity: "appointment",
                entityId: id,
                reason: "Automated sweep: Grace period elapsed with no patient check-in",
                metadata: { sweptAt: now.toISOString(), targetDate: targetDateStr },
              },
            });
          }
        });
      }

      return {
        sweptCount: sweptIds.length,
        sweptIds,
        date: targetDateStr,
      };
    } catch (dbError) {
      console.error("Database error in CheckInService.sweepNoShows:", dbError);
      if (!ALLOW_MEMORY_FALLBACK) {
        throw dbError;
      }
      return { sweptCount: 0, sweptIds: [], date: targetDateStr };
    }
  }

  /**
   * Fetch high-density check-in ledger for front-desk reception console
   */
  static async listCheckInDeskItems(params?: {
    date?: string;
    branchId?: string;
    search?: string;
    status?: string;
  }): Promise<CheckInDeskItemDTO[]> {
    const targetDateStr = params?.date || new Date().toISOString().slice(0, 10);
    const dateStart = new Date(`${targetDateStr}T00:00:00.000Z`);
    const dateEnd = new Date(`${targetDateStr}T23:59:59.999Z`);
    const now = new Date();

    try {
      const appointments = await prisma.appointment.findMany({
        where: {
          date: { gte: dateStart, lte: dateEnd },
          ...(params?.branchId ? { branchId: params.branchId } : {}),
          ...(params?.status ? { status: params.status as any } : {}),
          ...(params?.search
            ? {
                OR: [
                  { tokenNumber: { contains: params.search, mode: "insensitive" } },
                  { patient: { name: { contains: params.search, mode: "insensitive" } } },
                  { doctor: { name: { contains: params.search, mode: "insensitive" } } },
                ],
              }
            : {}),
        },
        include: {
          patient: { include: { user: true } },
          doctor: true,
          branch: true,
        },
        orderBy: [{ startTime: "asc" }, { tokenNumber: "asc" }],
      });

      return appointments.map((a) => {
        const eligibility = this.evaluateEligibility(a, now);
        return {
          id: a.id,
          tokenNumber: a.tokenNumber,
          patientName: a.patient.name,
          patientPhone: a.patient.user?.phone || null,
          doctorName: a.doctor.name,
          doctorId: a.doctorId,
          specialty: a.doctor.specialty,
          branchName: a.branch.name,
          branchId: a.branchId,
          date: targetDateStr,
          startTime: a.startTime,
          status: a.status,
          fee: Number(a.feeSnapshot),
          checkedInAt: a.checkedInAt?.toISOString() || null,
          eligibility,
        };
      });
    } catch (dbError) {
      console.error("Database error in listCheckInDeskItems:", dbError);
      if (!ALLOW_MEMORY_FALLBACK) {
        throw dbError;
      }

      // Dev fallback
      return [
        {
          id: "apt_chk_01",
          tokenNumber: "A-01",
          patientName: "Suresh Gupta",
          patientPhone: "+91 98201 11223",
          doctorName: "Dr. Rajesh Patel",
          doctorId: "doc_patel_01",
          specialty: "Cardiology",
          branchName: "Central Hospital - Main Branch",
          branchId: "br_01",
          date: targetDateStr,
          startTime: "10:00",
          status: "COMPLETED",
          fee: 800,
          checkedInAt: `${targetDateStr}T09:50:00.000Z`,
          eligibility: {
            eligible: false,
            status: "NOT_CONFIRMED",
            message: "Consultation completed",
          },
        },
        {
          id: "apt_chk_02",
          tokenNumber: "A-02",
          patientName: "Anita Sharma",
          patientPhone: "+91 98334 55667",
          doctorName: "Dr. Rajesh Patel",
          doctorId: "doc_patel_01",
          specialty: "Cardiology",
          branchName: "Central Hospital - Main Branch",
          branchId: "br_01",
          date: targetDateStr,
          startTime: "10:20",
          status: "CHECKED_IN",
          fee: 800,
          checkedInAt: `${targetDateStr}T10:15:00.000Z`,
          eligibility: {
            eligible: false,
            status: "ALREADY_CHECKED_IN",
            message: "Patient checked in and waiting in queue",
          },
        },
        {
          id: "apt_chk_03",
          tokenNumber: "A-03",
          patientName: "Meet Vora",
          patientPhone: "+91 98450 99887",
          doctorName: "Dr. Rajesh Patel",
          doctorId: "doc_patel_01",
          specialty: "Cardiology",
          branchName: "Central Hospital - Main Branch",
          branchId: "br_01",
          date: targetDateStr,
          startTime: "10:40",
          status: "CONFIRMED",
          fee: 800,
          eligibility: {
            eligible: true,
            status: "ELIGIBLE",
            message: "Ready for check-in",
          },
        },
      ];
    }
  }
}
