import { prisma } from "../db";
import { ALLOW_MEMORY_FALLBACK } from "../auth/config";

export interface TimeSlot {
  startTime: string; // "10:00"
  endTime: string;   // "10:20"
  status: "AVAILABLE" | "BOOKED" | "BLOCKED";
}

export class SchedulingService {
  /**
   * Generates deterministic time slots for a doctor on a specific date.
   * Algorithm:
   * 1. Determine working hours (default 09:00 - 17:00, break 13:00 - 14:00)
   * 2. Step through day by appointmentDurationMin
   * 3. Subtract break intervals -> mark BLOCKED
   * 4. Subtract doctor blocked slots -> mark BLOCKED
   * 5. Subtract confirmed/waiting appointments -> mark BOOKED
   */
  static async generateSlots(
    doctorId: string,
    dateStr: string
  ): Promise<{
    date: string;
    doctorId: string;
    durationMinutes: number;
    slots: TimeSlot[];
  }> {
    const selectedDate = new Date(dateStr + "T00:00:00.000Z");
    const dayOfWeek = selectedDate.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat

    // Default configuration (Sunday is closed in default schedule)
    let startTimeMinutes = 9 * 60;   // 09:00
    let endTimeMinutes = 17 * 60;    // 17:00
    let breakStartMinutes = 13 * 60; // 13:00
    let breakEndMinutes = 14 * 60;   // 14:00
    let durationMin = 20;
    let isWorkingDay = dayOfWeek !== 0; // Mon-Sat open, Sun closed

    const bookedTimes = new Set<string>();
    const blockedIntervals: { startMin: number; endMin: number }[] = [];

    try {
      // 1. Fetch doctor availability for this day of week
      const [doctor, availability, appointments, blockedSlots] = await Promise.all([
        prisma.doctor.findUnique({
          where: { id: doctorId },
          select: { appointmentDurationMin: true },
        }),
        prisma.doctorAvailability.findUnique({
          where: { doctorId_dayOfWeek: { doctorId, dayOfWeek } },
        }),
        prisma.appointment.findMany({
          where: {
            doctorId,
            date: {
              gte: new Date(dateStr + "T00:00:00.000Z"),
              lte: new Date(dateStr + "T23:59:59.999Z"),
            },
            status: { in: ["CONFIRMED", "CHECKED_IN", "WAITING", "IN_CONSULTATION"] },
          },
          select: { startTime: true },
        }),
        prisma.blockedSlot.findMany({
          where: {
            doctorId,
            date: {
              gte: new Date(dateStr + "T00:00:00.000Z"),
              lte: new Date(dateStr + "T23:59:59.999Z"),
            },
          },
        }),
      ]);

      if (doctor) {
        durationMin = doctor.appointmentDurationMin || 20;
      }

      if (availability) {
        isWorkingDay = true;
        startTimeMinutes = this.timeToMinutes(availability.startTime);
        endTimeMinutes = this.timeToMinutes(availability.endTime);
        if (availability.breakStart && availability.breakEnd) {
          breakStartMinutes = this.timeToMinutes(availability.breakStart);
          breakEndMinutes = this.timeToMinutes(availability.breakEnd);
        }
      }

      appointments.forEach((apt) => bookedTimes.add(apt.startTime));

      blockedSlots.forEach((blk) => {
        if (blk.isFullDay || (!blk.startTime && !blk.endTime)) {
          blockedIntervals.push({ startMin: 0, endMin: 24 * 60 });
        } else if (blk.startTime && blk.endTime) {
          blockedIntervals.push({
            startMin: this.timeToMinutes(blk.startTime),
            endMin: this.timeToMinutes(blk.endTime),
          });
        }
      });
    } catch (dbError) {
      console.error("Database error in SchedulingService.generateSlots:", dbError);
      if (!ALLOW_MEMORY_FALLBACK) {
        throw dbError;
      }
      console.warn("Using default scheduling parameters in dev mode");
    }

    if (!isWorkingDay) {
      return {
        date: dateStr,
        doctorId,
        durationMinutes: durationMin,
        slots: [],
      };
    }

    const slots: TimeSlot[] = [];
    const isToday = new Date().toISOString().slice(0, 10) === dateStr;
    const now = new Date();
    const currentMinutesNow = now.getHours() * 60 + now.getMinutes();

    for (let current = startTimeMinutes; current + durationMin <= endTimeMinutes; current += durationMin) {
      const slotStart = this.minutesToTime(current);
      const slotEnd = this.minutesToTime(current + durationMin);

      // Check if slot is during break time
      const isBreak = current >= breakStartMinutes && current < breakEndMinutes;

      // Check if blocked by doctor's custom blocked slots
      const isBlocked = blockedIntervals.some(
        (b) => current >= b.startMin && current < b.endMin
      );

      // Check if already booked
      const isBooked = bookedTimes.has(slotStart);

      // If today and slot is in the past, mark as blocked
      const isPast = isToday && current <= currentMinutesNow + 10;

      let status: "AVAILABLE" | "BOOKED" | "BLOCKED" = "AVAILABLE";

      if (isBooked) {
        status = "BOOKED";
      } else if (isBreak || isBlocked || isPast) {
        status = "BLOCKED";
      }

      slots.push({
        startTime: slotStart,
        endTime: slotEnd,
        status,
      });
    }

    return {
      date: dateStr,
      doctorId,
      durationMinutes: durationMin,
      slots,
    };
  }

  /**
   * Validate whether a specific slot can be booked
   */
  static async validateSlotAvailable(
    doctorId: string,
    dateStr: string,
    startTime: string
  ): Promise<boolean> {
    const { slots } = await this.generateSlots(doctorId, dateStr);
    const slot = slots.find((s) => s.startTime === startTime);
    return slot !== undefined && slot.status === "AVAILABLE";
  }

  /**
   * Get doctor's full weekly availability schedule and active blocked slots
   */
  static async getDoctorSchedule(doctorId: string): Promise<{
    appointmentDurationMin: number;
    schedules: {
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      breakStart?: string | null;
      breakEnd?: string | null;
      isWorkingDay: boolean;
    }[];
    blockedSlots: {
      id: string;
      date: string;
      startTime?: string | null;
      endTime?: string | null;
      reason?: string | null;
      isFullDay: boolean;
    }[];
  }> {
    const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");

    try {
      const [doctor, availabilities, blocked] = await Promise.all([
        prisma.doctor.findUnique({
          where: { id: doctorId },
          select: { appointmentDurationMin: true },
        }),
        prisma.doctorAvailability.findMany({
          where: { doctorId },
          orderBy: { dayOfWeek: "asc" },
        }),
        prisma.blockedSlot.findMany({
          where: {
            doctorId,
            date: { gte: today },
          },
          orderBy: { date: "asc" },
        }),
      ]);

      const duration = doctor?.appointmentDurationMin || 20;

      // Build 7-day schedule (0=Sun, 1=Mon, ..., 6=Sat)
      const dayMap = new Map(availabilities.map((a) => [a.dayOfWeek, a]));
      const schedules = [];

      for (let day = 0; day <= 6; day++) {
        const found = dayMap.get(day);
        if (found) {
          schedules.push({
            dayOfWeek: day,
            startTime: found.startTime,
            endTime: found.endTime,
            breakStart: found.breakStart,
            breakEnd: found.breakEnd,
            isWorkingDay: true,
          });
        } else {
          schedules.push({
            dayOfWeek: day,
            startTime: "09:00",
            endTime: "17:00",
            breakStart: "13:00",
            breakEnd: "14:00",
            isWorkingDay: day !== 0, // Default Sunday off
          });
        }
      }

      const formattedBlocked = blocked.map((b) => ({
        id: b.id,
        date: b.date.toISOString().slice(0, 10),
        startTime: b.startTime,
        endTime: b.endTime,
        reason: b.reason,
        isFullDay: b.isFullDay,
      }));

      return {
        appointmentDurationMin: duration,
        schedules,
        blockedSlots: formattedBlocked,
      };
    } catch (dbError) {
      console.error("Database error in getDoctorSchedule:", dbError);
      if (!ALLOW_MEMORY_FALLBACK) {
        throw dbError;
      }
    }

    // Dev fallback
    const fallbackSchedules = [
      { dayOfWeek: 0, startTime: "09:00", endTime: "17:00", isWorkingDay: false },
      { dayOfWeek: 1, startTime: "09:00", endTime: "17:00", breakStart: "13:00", breakEnd: "14:00", isWorkingDay: true },
      { dayOfWeek: 2, startTime: "09:00", endTime: "17:00", breakStart: "13:00", breakEnd: "14:00", isWorkingDay: true },
      { dayOfWeek: 3, startTime: "09:00", endTime: "17:00", breakStart: "13:00", breakEnd: "14:00", isWorkingDay: true },
      { dayOfWeek: 4, startTime: "09:00", endTime: "17:00", breakStart: "13:00", breakEnd: "14:00", isWorkingDay: true },
      { dayOfWeek: 5, startTime: "09:00", endTime: "17:00", breakStart: "13:00", breakEnd: "14:00", isWorkingDay: true },
      { dayOfWeek: 6, startTime: "09:00", endTime: "14:00", isWorkingDay: true },
    ];

    return {
      appointmentDurationMin: 20,
      schedules: fallbackSchedules,
      blockedSlots: [],
    };
  }

  /**
   * Update doctor's weekly working hours and appointment duration
   */
  static async updateDoctorSchedule(
    doctorId: string,
    input: {
      appointmentDurationMin: number;
      schedules: {
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        breakStart?: string | null;
        breakEnd?: string | null;
        isWorkingDay: boolean;
      }[];
    }
  ): Promise<{ success: boolean }> {
    try {
      await prisma.$transaction(async (tx) => {
        // 1. Update doctor appointment duration
        await tx.doctor.update({
          where: { id: doctorId },
          data: { appointmentDurationMin: input.appointmentDurationMin },
        });

        // 2. Update/upsert day availabilities
        for (const s of input.schedules) {
          if (s.isWorkingDay) {
            await tx.doctorAvailability.upsert({
              where: {
                doctorId_dayOfWeek: {
                  doctorId,
                  dayOfWeek: s.dayOfWeek,
                },
              },
              update: {
                startTime: s.startTime,
                endTime: s.endTime,
                breakStart: s.breakStart || null,
                breakEnd: s.breakEnd || null,
              },
              create: {
                doctorId,
                dayOfWeek: s.dayOfWeek,
                startTime: s.startTime,
                endTime: s.endTime,
                breakStart: s.breakStart || null,
                breakEnd: s.breakEnd || null,
              },
            });
          } else {
            // If day is marked not working, remove availability record if exists
            await tx.doctorAvailability.deleteMany({
              where: {
                doctorId,
                dayOfWeek: s.dayOfWeek,
              },
            });
          }
        }
      });

      return { success: true };
    } catch (dbError) {
      console.error("Database error in updateDoctorSchedule:", dbError);
      if (!ALLOW_MEMORY_FALLBACK) {
        throw dbError;
      }
      return { success: true };
    }
  }

  /**
   * Add a blocked slot / holiday for a doctor with conflict check
   */
  static async addBlockedSlot(
    doctorId: string,
    input: {
      date: string;
      startTime?: string | null;
      endTime?: string | null;
      reason?: string | null;
      isFullDay: boolean;
    }
  ): Promise<{
    success: boolean;
    blockedSlot?: { id: string; date: string; isFullDay: boolean };
    conflictCount?: number;
    error?: string;
  }> {
    const slotDate = new Date(input.date + "T00:00:00.000Z");

    try {
      // Check existing confirmed appointments that conflict with this window
      const conflictingAppointments = await prisma.appointment.count({
        where: {
          doctorId,
          date: {
            gte: new Date(input.date + "T00:00:00.000Z"),
            lte: new Date(input.date + "T23:59:59.999Z"),
          },
          status: { in: ["CONFIRMED", "CHECKED_IN", "WAITING"] },
          ...(input.isFullDay
            ? {}
            : {
                ...(input.startTime && input.endTime
                  ? { startTime: { gte: input.startTime, lte: input.endTime } }
                  : {}),
              }),
        },
      });

      const created = await prisma.blockedSlot.create({
        data: {
          doctorId,
          date: slotDate,
          startTime: input.isFullDay ? null : input.startTime,
          endTime: input.isFullDay ? null : input.endTime,
          reason: input.reason || "Doctor unavailable",
          isFullDay: input.isFullDay,
        },
      });

      return {
        success: true,
        blockedSlot: {
          id: created.id,
          date: input.date,
          isFullDay: created.isFullDay,
        },
        conflictCount: conflictingAppointments,
      };
    } catch (dbError) {
      console.error("Database error in addBlockedSlot:", dbError);
      if (!ALLOW_MEMORY_FALLBACK) {
        return { success: false, error: "Database error creating blocked slot" };
      }

      return {
        success: true,
        blockedSlot: {
          id: `blk_${Date.now()}`,
          date: input.date,
          isFullDay: input.isFullDay,
        },
        conflictCount: 0,
      };
    }
  }

  /**
   * Delete a blocked slot
   */
  static async deleteBlockedSlot(
    doctorId: string,
    slotId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await prisma.blockedSlot.deleteMany({
        where: {
          id: slotId,
          doctorId,
        },
      });

      return { success: true };
    } catch (dbError) {
      console.error("Database error in deleteBlockedSlot:", dbError);
      if (!ALLOW_MEMORY_FALLBACK) {
        return { success: false, error: "Database error deleting blocked slot" };
      }

      return { success: true };
    }
  }

  private static timeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + (minutes || 0);
  }

  private static minutesToTime(totalMinutes: number): string {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  }
}

