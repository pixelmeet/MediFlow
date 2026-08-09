import { z } from "zod";

export const BookAppointmentSchema = z.object({
  doctorId: z.string().min(1, "Doctor ID is required"),
  branchId: z.string().min(1, "Branch ID is required"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be in HH:mm format"),
  idempotencyKey: z.string().optional(),
});

export type BookAppointmentInput = z.infer<typeof BookAppointmentSchema>;

export const RescheduleAppointmentSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be in HH:mm format"),
});

export type RescheduleAppointmentInput = z.infer<typeof RescheduleAppointmentSchema>;

export const CancelAppointmentSchema = z.object({
  reason: z.string().min(3, "Please provide a reason for cancellation (at least 3 characters)").max(500),
});

export type CancelAppointmentInput = z.infer<typeof CancelAppointmentSchema>;
