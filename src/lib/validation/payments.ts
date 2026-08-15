import { z } from "zod";

export const ProcessPaymentSchema = z.object({
  appointmentId: z.string().min(1, "Appointment ID is required"),
  amount: z.number().positive("Payment amount must be greater than 0"),
  provider: z.enum(["online", "razorpay", "stripe", "clinic"]).default("online"),
  method: z.enum(["upi", "card", "netbanking", "cash"]).optional(),
  idempotencyKey: z.string().optional(),
});

export type ProcessPaymentInput = z.infer<typeof ProcessPaymentSchema>;

export const ProcessRefundSchema = z.object({
  appointmentId: z.string().min(1, "Appointment ID is required"),
  reason: z.string().min(3, "Refund reason is required (at least 3 characters)"),
});

export type ProcessRefundInput = z.infer<typeof ProcessRefundSchema>;
