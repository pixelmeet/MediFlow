import { z } from "zod";

const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{7,15}$/;

export const RegisterPatientSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters")
    .trim(),
  email: z
    .string()
    .email("Please enter a valid email address")
    .toLowerCase()
    .trim(),
  phone: z
    .string()
    .regex(phoneRegex, "Please enter a valid phone number")
    .trim(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  age: z
    .number()
    .int("Age must be an integer")
    .min(0, "Age must be positive")
    .max(120, "Please enter a valid age")
    .optional(),
  gender: z
    .enum(["MALE", "FEMALE", "OTHER"] as const)
    .optional(),
  bloodGroup: z
    .enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const)
    .optional(),
});

export const registerSchema = RegisterPatientSchema;
export type RegisterPatientInput = z.infer<typeof RegisterPatientSchema>;
export type RegisterInput = RegisterPatientInput;

export const LoginSchema = z.object({
  identifier: z
    .string()
    .min(1, "Email or phone is required")
    .trim(),
  password: z
    .string()
    .min(1, "Password is required"),
});

export const loginSchema = LoginSchema;
export type LoginInput = z.infer<typeof LoginSchema>;

export const VerifyOtpSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  code: z
    .string()
    .length(6, "OTP must be 6 digits")
    .regex(/^\d{6}$/, "OTP must contain only numbers"),
});

export const verifyOtpSchema = VerifyOtpSchema;
export type VerifyOtpInput = z.infer<typeof VerifyOtpSchema>;

export const ResendOtpSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
});

export const resendOtpSchema = ResendOtpSchema;
export type ResendOtpInput = z.infer<typeof ResendOtpSchema>;
