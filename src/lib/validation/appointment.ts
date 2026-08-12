import { z } from "zod";

export const BookAppointmentSchema = z.object({
  doctorId: z.string().min(1, "Doctor ID is required"),
  branchId: z.string().min(1, "Branch ID is required"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be in HH:mm format"),
  idempotencyKey: z.string().min(1, "Idempotency key is required"),
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

export const CheckInAppointmentSchema = z.object({
  forceByStaff: z.boolean().optional(),
});

export type CheckInAppointmentInput = z.infer<typeof CheckInAppointmentSchema>;

export const ReinstateAppointmentSchema = z.object({
  reason: z.string().min(3, "Please provide a valid clinical/administrative reason for reinstating this patient").max(500),
});

export type ReinstateAppointmentInput = z.infer<typeof ReinstateAppointmentSchema>;

export const SweepNoShowsSchema = z.object({
  branchId: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format").optional(),
});

export type SweepNoShowsInput = z.infer<typeof SweepNoShowsSchema>;

