import { z } from "zod";

export const DayScheduleSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6), // 0=Sunday, 1=Monday, ..., 6=Saturday
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format must be HH:mm"),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format must be HH:mm"),
  breakStart: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format must be HH:mm").optional().nullable(),
  breakEnd: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format must be HH:mm").optional().nullable(),
  isWorkingDay: z.boolean().default(true),
});

export type DayScheduleInput = z.infer<typeof DayScheduleSchema>;

export const UpdateScheduleSchema = z.object({
  appointmentDurationMin: z.number().int().min(10).max(120).default(20),
  schedules: z.array(DayScheduleSchema).min(1, "At least one day schedule is required"),
});

export type UpdateScheduleInput = z.infer<typeof UpdateScheduleSchema>;

export const CreateBlockedSlotSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format must be HH:mm").optional().nullable(),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format must be HH:mm").optional().nullable(),
  reason: z.string().max(255).optional().nullable(),
  isFullDay: z.boolean().default(false),
});

export type CreateBlockedSlotInput = z.infer<typeof CreateBlockedSlotSchema>;
