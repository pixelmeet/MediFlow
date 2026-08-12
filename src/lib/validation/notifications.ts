import { z } from "zod";

export const NotificationFilterSchema = z.object({
  unreadOnly: z.enum(["true", "false"]).optional().default("false"),
  limit: z.coerce.number().int().min(1).max(100).optional().default(30),
});

export type NotificationFilterInput = z.infer<typeof NotificationFilterSchema>;

export const UpdateNotificationSchema = z.object({
  action: z.enum(["mark_read", "mark_all_read", "delete"]),
  notificationId: z.string().optional(),
});

export type UpdateNotificationInput = z.infer<typeof UpdateNotificationSchema>;

export const CreateNotificationSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  type: z.enum([
    "booking_confirmed",
    "appointment_cancelled",
    "appointment_rescheduled",
    "queue_alert",
    "delay_warning",
    "checkin_reminder",
    "consultation_started",
    "consultation_completed",
    "prescription_issued",
    "payment_success",
    "refund_processed",
    "system_alert",
  ]),
  title: z.string().min(1, "Notification title is required"),
  message: z.string().min(1, "Notification message is required"),
  channel: z.enum(["email", "push", "sms"]).optional().default("push"),
  payload: z.record(z.string(), z.any()).optional(),
});

export type CreateNotificationInput = z.input<typeof CreateNotificationSchema>;
