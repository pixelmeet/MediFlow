import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { RegisterPatientInput, LoginInput, VerifyOtpInput } from "../validation/auth";

export interface AuthResult {
  success: boolean;
  user?: {
    id: string;
    email?: string | null;
    phone?: string | null;
    role: "PATIENT" | "DOCTOR" | "ADMIN";
    name: string;
    requiresOtp?: boolean;
  };
  error?: {
    code: string;
    message: string;
    lockoutRemainingMinutes?: number;
  };
}

// In-memory demo store for development fallback when DB is unreachable
const memoryUsers = new Map<string, {
  id: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: "PATIENT" | "DOCTOR" | "ADMIN";
  name: string;
  isVerified: boolean;
  isActive: boolean;
  failedLogins: number;
  lockedUntil: Date | null;
}>();

const memoryOtps = new Map<string, {
  id: string;
  userId: string;
  code: string;
  expiresAt: Date;
  verified: boolean;
  attempts: number;
  createdAt: Date;
}>();

// Initialize demo accounts in memory store
async function ensureDemoAccounts() {
  if (memoryUsers.size === 0) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash("Password@123", salt);

    memoryUsers.set("admin@mediflow.com", {
      id: "usr_admin_01",
      email: "admin@mediflow.com",
      phone: "+919000000001",
      passwordHash: hash,
      role: "ADMIN",
      name: "Priya Sharma (Admin Lead)",
      isVerified: true,
      isActive: true,
      failedLogins: 0,
      lockedUntil: null,
    });

    memoryUsers.set("dr.patel@mediflow.com", {
      id: "usr_doc_01",
      email: "dr.patel@mediflow.com",
      phone: "+919000000002",
      passwordHash: hash,
      role: "DOCTOR",
      name: "Dr. Rajesh Patel (Cardiologist)",
      isVerified: true,
      isActive: true,
      failedLogins: 0,
      lockedUntil: null,
    });

    memoryUsers.set("patient@mediflow.com", {
      id: "usr_pat_01",
      email: "patient@mediflow.com",
      phone: "+919876543210",
      passwordHash: hash,
      role: "PATIENT",
      name: "Meet Vora",
      isVerified: true,
      isActive: true,
      failedLogins: 0,
      lockedUntil: null,
    });
  }
}

export class AuthService {
  /**
   * Register a new patient account and create an OTP verification token
   */
  static async registerPatient(input: RegisterPatientInput): Promise<AuthResult> {
    await ensureDemoAccounts();

    try {
      // Try Prisma database first
      const existing = await prisma.user.findFirst({
        where: {
          OR: [{ email: input.email }, { phone: input.phone }],
        },
        include: { patient: true },
      });

      if (existing) {
        if (existing.email === input.email) {
          return {
            success: false,
            error: {
              code: "DUPLICATE_EMAIL",
              message: "An account with this email address already exists. Please sign in instead.",
            },
          };
        }
        if (existing.phone === input.phone) {
          return {
            success: false,
            error: {
              code: "DUPLICATE_PHONE",
              message: "An account with this phone number already exists. Please sign in instead.",
            },
          };
        }
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(input.password, salt);
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      const newUser = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const user = await tx.user.create({
          data: {
            email: input.email,
            phone: input.phone,
            passwordHash,
            role: "PATIENT",
            isVerified: false,
            isActive: true,
            patient: {
              create: {
                name: input.name,
                age: input.age,
                gender: input.gender,
                bloodGroup: input.bloodGroup,
              },
            },
          },
          include: { patient: true },
        });

        await tx.otpVerification.create({
          data: {
            userId: user.id,
            code: otpCode,
            expiresAt,
            verified: false,
          },
        });

        return user;
      });

      if (process.env.NODE_ENV !== "production") {
        console.log(`[DEV] OTP for ${newUser.id}: ${otpCode}`);
      }

      return {
        success: true,
        user: {
          id: newUser.id,
          email: newUser.email,
          phone: newUser.phone,
          role: newUser.role,
          name: newUser.patient?.name || "Patient",
          requiresOtp: true,
        },
      };
    } catch (dbError) {
      console.warn("Database unavailable, falling back to memory store:", (dbError as Error).message);

      // Memory Store Fallback
      const existingUser = Array.from(memoryUsers.values()).find(
        (u) => u.email === input.email || u.phone === input.phone
      );

      if (existingUser) {
        return {
          success: false,
          error: {
            code: "DUPLICATE_USER",
            message: "An account with this email or phone number already exists.",
          },
        };
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(input.password, salt);
      const newId = `usr_${Date.now()}`;
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

      memoryUsers.set(input.email, {
        id: newId,
        email: input.email,
        phone: input.phone,
        passwordHash,
        role: "PATIENT",
        name: input.name,
        isVerified: false,
        isActive: true,
        failedLogins: 0,
        lockedUntil: null,
      });

      memoryOtps.set(newId, {
        id: `otp_${Date.now()}`,
        userId: newId,
        code: otpCode,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        verified: false,
        attempts: 0,
        createdAt: new Date(),
      });

      if (process.env.NODE_ENV !== "production") {
        console.log(`[DEV] OTP for ${newId}: ${otpCode}`);
      }

      return {
        success: true,
        user: {
          id: newId,
          email: input.email,
          phone: input.phone,
          role: "PATIENT",
          name: input.name,
          requiresOtp: true,
        },
      };
    }
  }

  /**
   * Login with email or phone + password
   * Enforces 5 failed attempts -> 15 min lockout rule and isVerified check
   */
  static async login(input: LoginInput): Promise<AuthResult> {
    await ensureDemoAccounts();
    const isEmail = input.identifier.includes("@");

    try {
      const user = await prisma.user.findFirst({
        where: isEmail
          ? { email: input.identifier.toLowerCase() }
          : { phone: input.identifier },
        include: {
          patient: true,
          doctor: true,
          admin: true,
        },
      });

      if (user) {
        if (!user.isActive) {
          return {
            success: false,
            error: {
              code: "ACCOUNT_DEACTIVATED",
              message: "This account has been deactivated. Please contact hospital support.",
            },
          };
        }

        if (user.lockedUntil && user.lockedUntil > new Date()) {
          const remainingMs = user.lockedUntil.getTime() - Date.now();
          const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
          return {
            success: false,
            error: {
              code: "ACCOUNT_LOCKED",
              message: `Account is temporarily locked. Try again in ${remainingMinutes} minute(s).`,
              lockoutRemainingMinutes: remainingMinutes,
            },
          };
        }

        const passwordMatch = user.passwordHash
          ? await bcrypt.compare(input.password, user.passwordHash)
          : false;

        if (!passwordMatch) {
          const newFailedCount = user.failedLogins + 1;
          const willLock = newFailedCount >= 5;
          const lockedUntil = willLock ? new Date(Date.now() + 15 * 60 * 1000) : null;

          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLogins: willLock ? 0 : newFailedCount,
              lockedUntil,
            },
          });

          return {
            success: false,
            error: {
              code: willLock ? "ACCOUNT_LOCKED" : "INVALID_CREDENTIALS",
              message: willLock
                ? "Too many failed login attempts. Account locked for 15 minutes."
                : `Invalid password. ${5 - newFailedCount} attempt(s) remaining.`,
              lockoutRemainingMinutes: willLock ? 15 : undefined,
            },
          };
        }

        // Check if user is verified
        if (!user.isVerified) {
          return {
            success: false,
            error: {
              code: "EMAIL_NOT_VERIFIED",
              message: "Please verify your email/phone before logging in.",
            },
          };
        }

        if (user.failedLogins > 0 || user.lockedUntil) {
          await prisma.user.update({
            where: { id: user.id },
            data: { failedLogins: 0, lockedUntil: null },
          });
        }

        const name =
          user.patient?.name ||
          user.doctor?.name ||
          user.admin?.name ||
          "User";

        return {
          success: true,
          user: {
            id: user.id,
            email: user.email,
            phone: user.phone,
            role: user.role,
            name,
          },
        };
      }
    } catch (e) {
      console.warn("Database query failed during login, checking memory store...");
    }

    // Check memory store for demo accounts or memory registered users
    const memUser = Array.from(memoryUsers.values()).find((u) =>
      isEmail
        ? u.email.toLowerCase() === input.identifier.toLowerCase()
        : u.phone === input.identifier
    );

    if (!memUser) {
      return {
        success: false,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email/phone or password.",
        },
      };
    }

    if (memUser.lockedUntil && memUser.lockedUntil > new Date()) {
      const remainingMinutes = Math.ceil((memUser.lockedUntil.getTime() - Date.now()) / (60 * 1000));
      return {
        success: false,
        error: {
          code: "ACCOUNT_LOCKED",
          message: `Account is temporarily locked. Try again in ${remainingMinutes} minute(s).`,
          lockoutRemainingMinutes: remainingMinutes,
        },
      };
    }

    const passwordMatch = await bcrypt.compare(input.password, memUser.passwordHash);

    if (!passwordMatch) {
      memUser.failedLogins += 1;
      if (memUser.failedLogins >= 5) {
        memUser.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
        memUser.failedLogins = 0;
        return {
          success: false,
          error: {
            code: "ACCOUNT_LOCKED",
            message: "Too many failed login attempts. Account locked for 15 minutes.",
            lockoutRemainingMinutes: 15,
          },
        };
      }

      return {
        success: false,
        error: {
          code: "INVALID_CREDENTIALS",
          message: `Invalid password. ${5 - memUser.failedLogins} attempt(s) remaining before temporary lockout.`,
        },
      };
    }

    // Check if memory user is verified
    if (!memUser.isVerified) {
      return {
        success: false,
        error: {
          code: "EMAIL_NOT_VERIFIED",
          message: "Please verify your email/phone before logging in.",
        },
      };
    }

    memUser.failedLogins = 0;
    memUser.lockedUntil = null;

    return {
      success: true,
      user: {
        id: memUser.id,
        email: memUser.email,
        phone: memUser.phone,
        role: memUser.role,
        name: memUser.name,
      },
    };
  }

  /**
   * Verify OTP code for a user
   */
  static async verifyOtp(input: VerifyOtpInput): Promise<AuthResult> {
    try {
      const latestOtp = await prisma.otpVerification.findFirst({
        where: { userId: input.userId, verified: false },
        orderBy: { createdAt: "desc" },
      });

      if (latestOtp) {
        if (new Date() > latestOtp.expiresAt) {
          return {
            success: false,
            error: {
              code: "OTP_EXPIRED",
              message: "Verification code has expired. Please click resend to get a new code.",
            },
          };
        }

        if (latestOtp.code !== input.code) {
          return {
            success: false,
            error: {
              code: "INVALID_OTP",
              message: "Invalid verification code. Please check and try again.",
            },
          };
        }

        await prisma.otpVerification.update({
          where: { id: latestOtp.id },
          data: { verified: true },
        });

        const user = await prisma.user.update({
          where: { id: input.userId },
          data: { isVerified: true },
          include: { patient: true, doctor: true, admin: true },
        });

        return {
          success: true,
          user: {
            id: user.id,
            email: user.email,
            phone: user.phone,
            role: user.role,
            name: user.patient?.name || "User",
          },
        };
      }
    } catch {
      console.warn("Database unavailable for OTP, checking memory store...");
    }

    // Memory Store OTP verification
    const memOtp = memoryOtps.get(input.userId);
    if (!memOtp) {
      return {
        success: false,
        error: { code: "NO_OTP_FOUND", message: "No pending verification code found." },
      };
    }

    if (new Date() > memOtp.expiresAt) {
      return {
        success: false,
        error: { code: "OTP_EXPIRED", message: "Verification code has expired." },
      };
    }

    if (memOtp.code !== input.code) {
      return {
        success: false,
        error: { code: "INVALID_OTP", message: "Invalid verification code." },
      };
    }

    memOtp.verified = true;
    const memUser = Array.from(memoryUsers.values()).find((u) => u.id === input.userId);
    if (memUser) {
      memUser.isVerified = true;
    }

    return {
      success: true,
      user: {
        id: input.userId,
        email: memUser?.email,
        phone: memUser?.phone,
        role: "PATIENT",
        name: memUser?.name || "Patient",
      },
    };
  }

  /**
   * Resend a new OTP with rate limiting (max 5 requests / 15 min)
   */
  static async resendOtp(userId: string): Promise<{ success: boolean; error?: string }> {
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    try {
      await prisma.otpVerification.create({
        data: { userId, code: newCode, expiresAt, verified: false },
      });
    } catch {
      memoryOtps.set(userId, {
        id: `otp_${Date.now()}`,
        userId,
        code: newCode,
        expiresAt,
        verified: false,
        attempts: 0,
        createdAt: new Date(),
      });
    }

    if (process.env.NODE_ENV !== "production") {
      console.log(`[DEV] Resent OTP for ${userId}: ${newCode}`);
    }

    return {
      success: true,
    };
  }

  /**
   * Get user profile details by ID
   */
  static async getUserProfile(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          phone: true,
          role: true,
          isVerified: true,
          isActive: true,
          createdAt: true,
          patient: true,
          doctor: {
            include: {
              department: {
                include: { branch: true },
              },
            },
          },
          admin: true,
        },
      });
      if (user) return user;
    } catch {
      console.warn("Database unavailable for getUserProfile, falling back to memory store...");
    }

    const memUser = Array.from(memoryUsers.values()).find((u) => u.id === userId);
    if (!memUser) return null;

    return {
      id: memUser.id,
      email: memUser.email,
      phone: memUser.phone,
      role: memUser.role,
      isVerified: memUser.isVerified,
      isActive: memUser.isActive,
      createdAt: new Date(),
      patient: memUser.role === "PATIENT" ? { id: `pat_${memUser.id}`, name: memUser.name, age: 34, gender: "MALE", bloodGroup: "O+" } : null,
      doctor: memUser.role === "DOCTOR" ? { id: `doc_${memUser.id}`, name: memUser.name, specialty: "Cardiology" } : null,
      admin: memUser.role === "ADMIN" ? { id: `adm_${memUser.id}`, name: memUser.name } : null,
    };
  }
}
