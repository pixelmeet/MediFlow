import { describe, it, expect } from "vitest";
import {
  PrescriptionItemInputSchema,
  CompleteConsultationSchema,
} from "@/lib/validation/consultation";

describe("Consultation & Prescription Field Validation", () => {
  describe("PrescriptionItemInputSchema", () => {
    it("should accept valid prescription item with separate dosage and frequency", () => {
      const valid = PrescriptionItemInputSchema.safeParse({
        medicineName: "Atorvastatin",
        dosage: "20mg",
        frequency: "Once daily at night",
        duration: "30 days",
        instructions: "After dinner",
      });
      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.dosage).toBe("20mg");
        expect(valid.data.frequency).toBe("Once daily at night");
      }
    });

    it("should reject item missing dosage or frequency", () => {
      const missingDosage = PrescriptionItemInputSchema.safeParse({
        medicineName: "Paracetamol",
        frequency: "1-0-1",
        duration: "3 days",
      });
      expect(missingDosage.success).toBe(false);

      const missingFrequency = PrescriptionItemInputSchema.safeParse({
        medicineName: "Paracetamol",
        dosage: "650mg",
        duration: "3 days",
      });
      expect(missingFrequency.success).toBe(false);
    });
  });

  describe("CompleteConsultationSchema", () => {
    it("should require diagnosis to complete consultation", () => {
      const missingDiag = CompleteConsultationSchema.safeParse({
        diagnosis: "",
        notes: "Some notes",
      });
      expect(missingDiag.success).toBe(false);

      const withDiag = CompleteConsultationSchema.safeParse({
        diagnosis: "Essential Hypertension",
        notes: "Patient advised to reduce sodium intake",
        prescriptionItems: [
          {
            medicineName: "Amlodipine",
            dosage: "5mg",
            frequency: "1-0-0",
            duration: "30 days",
          },
        ],
      });
      expect(withDiag.success).toBe(true);
    });
  });
});
