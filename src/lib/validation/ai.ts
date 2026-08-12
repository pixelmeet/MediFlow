import { z } from "zod";

export const SymptomCheckerSchema = z.object({
  symptoms: z
    .string()
    .min(3, "Please describe your symptoms with at least 3 characters")
    .max(1000, "Symptom description too long (max 1000 characters)"),
  age: z.coerce.number().int().min(0).max(120).optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  durationDays: z.coerce.number().int().min(0).max(365).optional(),
});

export type SymptomCheckerInput = z.infer<typeof SymptomCheckerSchema>;
