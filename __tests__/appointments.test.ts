import { describe, it, expect } from "vitest";
import { BookAppointmentSchema } from "@/lib/validation/appointment";
import { PaymentService } from "@/lib/services/PaymentService";

describe("Appointment Booking & Payment Idempotency", () => {
  describe("Schema Validation", () => {
    it("should enforce required idempotencyKey", () => {
      const invalid = BookAppointmentSchema.safeParse({
        doctorId: "doc_patel_01",
        branchId: "branch_main_01",
        date: "2026-08-20",
        startTime: "10:00",
        // missing idempotencyKey
      });
      expect(invalid.success).toBe(false);

      const valid = BookAppointmentSchema.safeParse({
        doctorId: "doc_patel_01",
        branchId: "branch_main_01",
        date: "2026-08-20",
        startTime: "10:00",
        idempotencyKey: "uuid-1234-5678",
      });
      expect(valid.success).toBe(true);
    });

    it("should validate date format YYYY-MM-DD and time format HH:mm", () => {
      const badDate = BookAppointmentSchema.safeParse({
        doctorId: "doc_patel_01",
        branchId: "branch_main_01",
        date: "20-08-2026", // bad format
        startTime: "10:00",
        idempotencyKey: "uuid-1234",
      });
      expect(badDate.success).toBe(false);

      const badTime = BookAppointmentSchema.safeParse({
        doctorId: "doc_patel_01",
        branchId: "branch_main_01",
        date: "2026-08-20",
        startTime: "10:00 AM", // bad format
        idempotencyKey: "uuid-1234",
      });
      expect(badTime.success).toBe(false);
    });
  });

  describe("Payment Idempotency", () => {
    it("should reject double-payment on already paid appointment in fallback store", async () => {
      const aptId = `apt_test_${Date.now()}`;

      // First payment
      const payment1 = await PaymentService.processPayment({
        appointmentId: aptId,
        amount: 800,
        provider: "mock",
        method: "card",
      });
      expect(payment1.success).toBe(true);
      expect(payment1.data?.status).toBe("PAID");

      // Second payment on same appointment should be rejected
      const payment2 = await PaymentService.processPayment({
        appointmentId: aptId,
        amount: 800,
        provider: "mock",
        method: "card",
      });
      expect(payment2.success).toBe(false);
      expect(payment2.error).toContain("already been completed");
    });
  });
});
