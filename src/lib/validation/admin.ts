import { z } from "zod";

export const CreateDoctorAdminSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  specialty: z.string().min(2, "Specialty is required"),
  qualifications: z.string().min(2, "Qualifications required (e.g. MBBS, MD)"),
  experienceYears: z.number().int().min(0).max(60).default(5),
  consultationFee: z.number().min(0, "Fee must be non-negative").default(500),
  departmentId: z.string().min(1, "Department is required"),
  languages: z.array(z.string()).default(["English", "Hindi"]),
  appointmentDurationMin: z.number().int().min(10).max(120).default(20),
});

export type CreateDoctorAdminInput = z.infer<typeof CreateDoctorAdminSchema>;

export const UpdateDoctorAdminSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(10).optional(),
  specialty: z.string().min(2).optional(),
  qualifications: z.string().min(2).optional(),
  experienceYears: z.number().int().min(0).max(60).optional(),
  consultationFee: z.number().min(0).optional(),
  departmentId: z.string().min(1).optional(),
  languages: z.array(z.string()).optional(),
  appointmentDurationMin: z.number().int().min(10).max(120).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateDoctorAdminInput = z.infer<typeof UpdateDoctorAdminSchema>;

export const DepartmentAdminSchema = z.object({
  name: z.string().min(2, "Department name is required"),
  branchId: z.string().min(1, "Branch is required"),
  isActive: z.boolean().default(true),
});

export type DepartmentAdminInput = z.infer<typeof DepartmentAdminSchema>;

export const BranchAdminSchema = z.object({
  name: z.string().min(2, "Branch name is required"),
  address: z.string().optional().nullable(),
  timezone: z.string().default("Asia/Kolkata"),
  gracePeriodMin: z.number().int().min(5).max(60).default(15),
  rescheduleCutoffHrs: z.number().int().min(0).max(48).default(2),
  isActive: z.boolean().default(true),
});

export type BranchAdminInput = z.infer<typeof BranchAdminSchema>;

export const UpdateBranchAdminSchema = z.object({
  name: z.string().min(2).optional(),
  address: z.string().optional().nullable(),
  timezone: z.string().optional(),
  gracePeriodMin: z.number().int().min(5).max(60).optional(),
  rescheduleCutoffHrs: z.number().int().min(0).max(48).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateBranchAdminInput = z.infer<typeof UpdateBranchAdminSchema>;

export const AppointmentOverrideSchema = z.object({
  doctorId: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD").optional(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be HH:mm").optional(),
  status: z.enum(["CONFIRMED", "CHECKED_IN", "WAITING", "IN_CONSULTATION", "COMPLETED", "CANCELLED", "NO_SHOW"]).optional(),
  cancelReason: z.string().optional().nullable(),
  overrideReason: z.string().min(3, "Reason for administrative override is required"),
});

export type AppointmentOverrideInput = z.infer<typeof AppointmentOverrideSchema>;
