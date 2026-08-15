import { describe, it, expect } from "vitest";
import { BookAppointmentSchema } from "@/lib/validation/appointment";
import { ProcessPaymentSchema } from "@/lib/validation/payments";

describe("Appointment Booking & Payment Schema Validation", () => {
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

  describe("Payment Schema Validation", () => {
    it("should validate allowed provider values (online, razorpay, stripe, clinic) and reject mock", () => {
      const validOnline = ProcessPaymentSchema.safeParse({
        appointmentId: "apt_123",
        amount: 800,
        provider: "online",
      });
      expect(validOnline.success).toBe(true);

      const validClinic = ProcessPaymentSchema.safeParse({
        appointmentId: "apt_123",
        amount: 800,
        provider: "clinic",
      });
      expect(validClinic.success).toBe(true);

      const invalidMock = ProcessPaymentSchema.safeParse({
        appointmentId: "apt_123",
        amount: 800,
        provider: "mock",
      });
      expect(invalidMock.success).toBe(false);
    });
  });
});
