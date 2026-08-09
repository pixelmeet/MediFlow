import { z } from "zod";

export const CheckInSchema = z.object({
  appointmentId: z.string().min(1, "Appointment ID is required"),
});

export type CheckInInput = z.infer<typeof CheckInSchema>;

export const CallNextSchema = z.object({
  doctorId: z.string().min(1, "Doctor ID is required"),
});

export type CallNextInput = z.infer<typeof CallNextSchema>;
