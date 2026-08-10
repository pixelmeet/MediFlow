import { z } from "zod";

export const CheckInSchema = z.object({
  appointmentId: z.string().min(1, "Appointment ID is required"),
});

export type CheckInInput = z.infer<typeof CheckInSchema>;

export const CallNextSchema = z.object({
  doctorId: z.string().min(1, "Doctor ID is required"),
});

export type CallNextInput = z.infer<typeof CallNextSchema>;

export const SetDoctorStatusSchema = z.object({
  status: z.enum(["CONSULTING", "ON_BREAK", "DELAYED", "IDLE"]),
  delayMinutes: z.number().min(0).max(180).optional(),
  note: z.string().max(200).optional(),
});

export type SetDoctorStatusInput = z.infer<typeof SetDoctorStatusSchema>;

export const ReorderQueueSchema = z.object({
  appointmentId: z.string().min(1, "Appointment ID is required"),
  targetPosition: z.number().int().min(1, "Target position must be at least 1"),
  reason: z.string().min(3, "Reason for reordering is required").max(300),
});

export type ReorderQueueInput = z.infer<typeof ReorderQueueSchema>;

