import { z } from "zod";

export const DoctorSearchSchema = z.object({
  search: z.string().optional(),
  specialty: z.string().optional(),
  branchId: z.string().optional(),
  departmentId: z.string().optional(),
  language: z.string().optional(),
  minFee: z.coerce.number().min(0).optional(),
  maxFee: z.coerce.number().min(0).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format").optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
  cursor: z.string().optional(),
});

export type DoctorSearchInput = z.infer<typeof DoctorSearchSchema>;
