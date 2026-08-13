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

export const UpdateDoctorProfileSchema = z.object({
  bio: z.string().max(1000, "Bio cannot exceed 1000 characters").optional().nullable(),
  qualifications: z.string().max(200, "Qualifications cannot exceed 200 characters").optional().nullable(),
  experience: z.number().int("Experience must be an integer").min(0, "Experience cannot be negative").max(70, "Please enter a valid experience").optional().nullable(),
  language: z.array(z.string()).optional(),
  photoUrl: z.string().url("Please enter a valid photo URL").optional().nullable().or(z.literal("")),
});

export const updateDoctorProfileSchema = UpdateDoctorProfileSchema;
export type UpdateDoctorProfileInput = z.infer<typeof UpdateDoctorProfileSchema>;
