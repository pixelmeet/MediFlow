import { prisma } from "../db";
import { ALLOW_MEMORY_FALLBACK } from "../auth/config";
import { ProcessPaymentInput, ProcessRefundInput } from "../validation/payments";
import { NotificationService } from "./NotificationService";

export interface PaymentDTO {
  id: string;
  appointmentId: string;
  amount: number;
  status: "PENDING" | "PAID" | "FAILED" | "REFUND_PENDING" | "REFUNDED";
  provider: string;
  transactionId?: string | null;
  refundedAt?: string | null;
  createdAt: string;
  appointment?: {
    doctorName: string;
    patientName: string;
    tokenNumber: string;
    date: string;
    startTime: string;
  };
}

const memoryPayments = new Map<string, PaymentDTO>();

export class PaymentService {
  /**
   * Process a payment (online mock/gateway or pay-at-clinic)
   */
  static async processPayment(
    input: ProcessPaymentInput,
    actorUserId?: string
  ): Promise<{
    success: boolean;
    data?: PaymentDTO;
    error?: string;
  }> {
    try {
      const appointment = await prisma.appointment.findUnique({
        where: { id: input.appointmentId },
        include: {
          doctor: true,
          patient: { include: { user: true } },
          payment: true,
        },
      });

      if (!appointment) {
        if (ALLOW_MEMORY_FALLBACK && memoryPayments.has(input.appointmentId)) {
          const existingMem = memoryPayments.get(input.appointmentId)!;
          if (existingMem.status === "PAID") {
            return { success: false, error: "Payment for this appointment has already been completed." };
          }
          existingMem.status = input.provider === "clinic" ? "PENDING" : "PAID";
          existingMem.transactionId = `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
          return { success: true, data: existingMem };
        }
        return { success: false, error: "Appointment not found" };
      }

      // Idempotency: Reject duplicate payments for an already paid appointment
      if (appointment.payment && appointment.payment.status === "PAID") {
        return {
          success: false,
          error: "Payment for this appointment has already been completed.",
        };
      }

      // Generate mock transaction ID if paid online
      const isOnline = input.provider !== "clinic";
      const status = isOnline ? "PAID" : "PENDING";
      const transactionId = isOnline
        ? `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
        : null;

      // Upsert payment row
      const payment = await prisma.payment.upsert({
        where: { appointmentId: appointment.id },
        update: {
          amount: input.amount,
          status,
          provider: input.provider,
          transactionId,
        },
        create: {
          appointmentId: appointment.id,
          amount: input.amount,
          status,
          provider: input.provider,
          transactionId,
        },
      });

      // Write Audit Log
      await prisma.auditLog.create({
        data: {
          actorId: actorUserId || appointment.patient.userId,
          action: isOnline ? "PAYMENT_SUCCESS" : "PAYMENT_CLINIC_SELECTED",
          entity: "payment",
          entityId: payment.id,
          reason: `Payment of ₹${input.amount} marked as ${status} via ${input.provider}`,
          metadata: {
            appointmentId: appointment.id,
            tokenNumber: appointment.tokenNumber,
            method: input.method || "card",
            transactionId,
          },
        },
      });

      // Dispatch Notification if online payment completed
      if (isOnline && appointment.patient?.user?.id) {
        await NotificationService.createNotification({
          userId: appointment.patient.user.id,
          type: "payment_success",
          title: "Payment Received",
          message: `Payment of ₹${input.amount} for appointment token ${appointment.tokenNumber} was confirmed.`,
          payload: { appointmentId: appointment.id, transactionId, amount: input.amount },
        });
      }

      const dto: PaymentDTO = {
        id: payment.id,
        appointmentId: payment.appointmentId,
        amount: Number(payment.amount),
        status: payment.status as PaymentDTO["status"],
        provider: payment.provider || "mock",
        transactionId: payment.transactionId,
        refundedAt: payment.refundedAt?.toISOString() || null,
        createdAt: payment.createdAt.toISOString(),
        appointment: {
          doctorName: appointment.doctor.name,
          patientName: appointment.patient.name,
          tokenNumber: appointment.tokenNumber,
          date: appointment.date.toISOString().split("T")[0],
          startTime: appointment.startTime,
        },
      };

      return { success: true, data: dto };
    } catch (err) {
      console.error("PaymentService.processPayment error:", err);
      if (ALLOW_MEMORY_FALLBACK) {
        const existing = memoryPayments.get(input.appointmentId);
        if (existing && existing.status === "PAID") {
          return { success: false, error: "Payment for this appointment has already been completed." };
        }
        const mock: PaymentDTO = {
          id: `pay_${Date.now()}`,
          appointmentId: input.appointmentId,
          amount: input.amount,
          status: input.provider === "clinic" ? "PENDING" : "PAID",
          provider: input.provider,
          transactionId: `TXN-MEM-${Date.now()}`,
          createdAt: new Date().toISOString(),
        };
        memoryPayments.set(input.appointmentId, mock);
        return { success: true, data: mock };
      }
      return { success: false, error: "Payment processing failed" };
    }
  }

  /**
   * Process refund for a cancelled appointment
   */
  static async processRefund(
    input: ProcessRefundInput,
    actorUserId: string
  ): Promise<{
    success: boolean;
    data?: PaymentDTO;
    error?: string;
  }> {
    try {
      const payment = await prisma.payment.findUnique({
        where: { appointmentId: input.appointmentId },
        include: {
          appointment: {
            include: {
              doctor: true,
              patient: { include: { user: true } },
            },
          },
        },
      });

      if (!payment) {
        if (ALLOW_MEMORY_FALLBACK && memoryPayments.has(input.appointmentId)) {
          const p = memoryPayments.get(input.appointmentId)!;
          p.status = "REFUNDED";
          p.refundedAt = new Date().toISOString();
          return { success: true, data: p };
        }
        return { success: false, error: "Payment record not found for this appointment" };
      }

      if (payment.status !== "PAID" && payment.status !== "REFUND_PENDING") {
        return {
          success: false,
          error: `Cannot refund appointment with payment status ${payment.status}`,
        };
      }

      const updated = await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "REFUNDED",
          refundedAt: new Date(),
        },
      });

      // Audit Log
      await prisma.auditLog.create({
        data: {
          actorId: actorUserId,
          action: "REFUND_PROCESSED",
          entity: "payment",
          entityId: payment.id,
          reason: input.reason,
          metadata: {
            appointmentId: payment.appointmentId,
            refundAmount: Number(payment.amount),
          },
        },
      });

      // Dispatch refund notification
      if (payment.appointment?.patient?.user?.id) {
        await NotificationService.createNotification({
          userId: payment.appointment.patient.user.id,
          type: "refund_processed",
          title: "Refund Processed",
          message: `Refund of ₹${payment.amount} has been processed for appointment ${payment.appointment.tokenNumber}. Reason: ${input.reason}`,
          payload: { appointmentId: payment.appointmentId, amount: Number(payment.amount) },
        });
      }

      const dto: PaymentDTO = {
        id: updated.id,
        appointmentId: updated.appointmentId,
        amount: Number(updated.amount),
        status: updated.status as PaymentDTO["status"],
        provider: updated.provider || "mock",
        transactionId: updated.transactionId,
        refundedAt: updated.refundedAt?.toISOString() || null,
        createdAt: updated.createdAt.toISOString(),
      };

      return { success: true, data: dto };
    } catch (err) {
      console.error("PaymentService.processRefund error:", err);
      if (ALLOW_MEMORY_FALLBACK) {
        const mem = memoryPayments.get(input.appointmentId);
        if (mem) {
          mem.status = "REFUNDED";
          mem.refundedAt = new Date().toISOString();
          return { success: true, data: mem };
        }
      }
      return { success: false, error: "Refund processing failed" };
    }
  }

  /**
   * Get payment details by appointment ID
   */
  static async getPaymentByAppointmentId(appointmentId: string): Promise<PaymentDTO | null> {
    try {
      const p = await prisma.payment.findUnique({
        where: { appointmentId },
        include: {
          appointment: {
            include: {
              doctor: true,
              patient: true,
            },
          },
        },
      });

      if (!p) {
        return memoryPayments.get(appointmentId) || null;
      }

      return {
        id: p.id,
        appointmentId: p.appointmentId,
        amount: Number(p.amount),
        status: p.status as PaymentDTO["status"],
        provider: p.provider || "mock",
        transactionId: p.transactionId,
        refundedAt: p.refundedAt?.toISOString() || null,
        createdAt: p.createdAt.toISOString(),
        appointment: {
          doctorName: p.appointment.doctor.name,
          patientName: p.appointment.patient.name,
          tokenNumber: p.appointment.tokenNumber,
          date: p.appointment.date.toISOString().split("T")[0],
          startTime: p.appointment.startTime,
        },
      };
    } catch (err) {
      console.error("PaymentService.getPaymentByAppointmentId error:", err);
      return memoryPayments.get(appointmentId) || null;
    }
  }
}
