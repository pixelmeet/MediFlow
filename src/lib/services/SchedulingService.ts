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
