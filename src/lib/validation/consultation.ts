import { z } from "zod";

export const PrescriptionItemInputSchema = z.object({
  medicineName: z.string().min(1, "Medicine name is required"),
  dosage: z.string().min(1, "Dosage is required"), // e.g. "500mg" or "1 tablet"
  frequency: z.string().min(1, "Frequency is required"), // e.g. "1-0-1", "1-1-1", "Once daily"
  duration: z.string().min(1, "Duration is required"), // e.g. "5 days", "1 month"
  instructions: z.string().optional().nullable(), // e.g. "After food", "Before breakfast"
});

export type PrescriptionItemInput = z.infer<typeof PrescriptionItemInputSchema>;

export const SaveConsultationDraftSchema = z.object({
  complaints: z.string().optional().nullable(),
  examinationNotes: z.string().optional().nullable(),
  diagnosis: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  followUpDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD").optional().nullable(),
  prescriptionItems: z.array(PrescriptionItemInputSchema).optional().default([]),
});

export type SaveConsultationDraftInput = z.infer<typeof SaveConsultationDraftSchema>;

export const CompleteConsultationSchema = z.object({
  complaints: z.string().optional().nullable(),
  examinationNotes: z.string().optional().nullable(),
  diagnosis: z.string().min(2, "Diagnosis is required to complete consultation"),
  notes: z.string().optional().nullable(),
  followUpDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD").optional().nullable(),
  prescriptionItems: z.array(PrescriptionItemInputSchema).optional().default([]),
});

export type CompleteConsultationInput = z.infer<typeof CompleteConsultationSchema>;
