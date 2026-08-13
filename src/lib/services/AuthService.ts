import crypto from "crypto";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { ALLOW_MEMORY_FALLBACK, AUTH_CONFIG } from "../auth/config";
import { hashToken } from "../auth/token-hash";
import { OtpDeliveryService } from "./OtpDeliveryService";
import { TokenCleanupService } from "./TokenCleanupService";
import { RegisterPatientInput, LoginInput, VerifyOtpInput } from "../validation/auth";

export interface AuthResult {
  success: boolean;
  user?: {
    id: string;
    email?: string | null;
    phone?: string | null;
    role: "PATIENT" | "DOCTOR" | "ADMIN";
    name: string;
    doctorId?: string;
    patientId?: string;
    requiresOtp?: boolean;
    devOtp?: string;
  };
  error?: {
    code: string;
    message: string;
    lockoutRemainingMinutes?: number;
  };
}

// In-memory demo store for development fallback when DB is unreachable (dev mode only)
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

const memoryPasswordResetTokens = new Map<string, {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
}>();

// Initialize demo accounts in memory store
async function ensureDemoAccounts() {
  if (ALLOW_MEMORY_FALLBACK && memoryUsers.size === 0) {
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
    if (ALLOW_MEMORY_FALLBACK) {
      await ensureDemoAccounts();
    }

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

      // Deliver OTP — real email in prod (RESEND_API_KEY set), dev console + meta otherwise
      const delivery = await OtpDeliveryService.deliver(
        newUser.email || newUser.phone,
        otpCode,
        newUser.id
      );

      return {
        success: true,
        user: {
          id: newUser.id,
          email: newUser.email,
          phone: newUser.phone,
          role: newUser.role,
          name: newUser.patient?.name || "Patient",
          requiresOtp: true,
          // devOtp is only set when no real provider is configured (dev mode)
          ...(delivery.devOtp ? { devOtp: delivery.devOtp } : {}),
        },
      };
    } catch (dbError) {
      console.error("Database error during registerPatient:", dbError);

      if (!ALLOW_MEMORY_FALLBACK) {
        return {
          success: false,
          error: {
            code: "SERVICE_UNAVAILABLE",
            message: "We're having trouble reaching the database. Please try again in a moment.",
          },
        };
      }

      console.warn("Database unavailable, falling back to memory store in dev mode:", (dbError as Error).message);

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

      // Deliver OTP via dev fallback (memory store path is always dev-only)
      const delivery = await OtpDeliveryService.deliver(
        input.email || input.phone,
        otpCode,
        newId
      );

      return {
        success: true,
        user: {
          id: newId,
          email: input.email,
          phone: input.phone,
          role: "PATIENT",
          name: input.name,
          requiresOtp: true,
          ...(delivery.devOtp ? { devOtp: delivery.devOtp } : {}),
        },
      };
    }
  }

  /**
   * Login with email or phone + password
   * Enforces 5 failed attempts -> 15 min lockout rule and isVerified check
   */
  static async login(input: LoginInput): Promise<AuthResult> {
    if (ALLOW_MEMORY_FALLBACK) {
      await ensureDemoAccounts();
    }
    const isEmail = input.identifier.includes("@");

    try {
      // Trigger background cleanup of expired tokens via TokenCleanupService
      TokenCleanupService.cleanupExpiredTokens().catch((err) => {
        console.warn("Background expired token cleanup skipped:", (err as Error).message);
      });

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
            doctorId: user.doctor?.id,
            patientId: user.patient?.id,
          },
        };
      }

      // User not found in DB
      if (!ALLOW_MEMORY_FALLBACK) {
        return {
          success: false,
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid email/phone or password.",
          },
        };
      }
    } catch (e) {
      console.error("Database error during login:", e);

      if (!ALLOW_MEMORY_FALLBACK) {
        return {
          success: false,
          error: {
            code: "SERVICE_UNAVAILABLE",
            message: "We're having trouble reaching the database. Please try again in a moment.",
          },
        };
      }

      console.warn("Database query failed during login, checking memory store in dev mode...");
    }

    // Check memory store for demo accounts or memory registered users (dev mode only)
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
        doctorId: memUser.role === "DOCTOR" ? (memUser.id === "usr_doc_01" ? "doc_patel_01" : `doc_${memUser.id}`) : undefined,
        patientId: memUser.role === "PATIENT" ? (memUser.id === "usr_pat_01" ? "pat_meet_01" : `pat_${memUser.id}`) : undefined,
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
        // 1. Check if max attempts reached (5 failed attempts)
        if (latestOtp.attempts >= AUTH_CONFIG.otpMaxAttempts) {
          return {
            success: false,
            error: {
              code: "OTP_MAX_ATTEMPTS",
              message: "Too many failed attempts. This code is invalidated. Please request a new OTP.",
            },
          };
        }

        // 2. Check expiration
        if (new Date() > latestOtp.expiresAt) {
          return {
            success: false,
            error: {
              code: "OTP_EXPIRED",
              message: "Verification code has expired. Please click resend to get a new code.",
            },
          };
        }

        // 3. Check code match
        if (latestOtp.code !== input.code) {
          const newAttempts = latestOtp.attempts + 1;
          const isMaxedOut = newAttempts >= AUTH_CONFIG.otpMaxAttempts;

          // Increment attempt count, and invalidate if max attempts hit
          await prisma.otpVerification.update({
            where: { id: latestOtp.id },
            data: {
              attempts: newAttempts,
              verified: isMaxedOut ? true : false, // Invalidate if limit reached
            },
          });

          return {
            success: false,
            error: {
              code: isMaxedOut ? "OTP_MAX_ATTEMPTS" : "INVALID_OTP",
              message: isMaxedOut
                ? "Too many failed attempts (5/5). This code has been invalidated. Please request a new OTP."
                : `Invalid verification code. ${AUTH_CONFIG.otpMaxAttempts - newAttempts} attempt(s) remaining.`,
            },
          };
        }

        // 4. Code valid -> mark verified and update user
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
            doctorId: user.doctor?.id,
            patientId: user.patient?.id,
          },
        };
      }

      if (!ALLOW_MEMORY_FALLBACK) {
        return {
          success: false,
          error: {
            code: "NO_OTP_FOUND",
            message: "No pending verification code found.",
          },
        };
      }
    } catch (dbError) {
      console.error("Database error during verifyOtp:", dbError);

      if (!ALLOW_MEMORY_FALLBACK) {
        return {
          success: false,
          error: {
            code: "SERVICE_UNAVAILABLE",
            message: "We're having trouble reaching the database. Please try again in a moment.",
          },
        };
      }

      console.warn("Database unavailable for OTP, checking memory store in dev mode...");
    }

    // Memory Store OTP verification (dev mode only)
    const memOtp = memoryOtps.get(input.userId);
    if (!memOtp || memOtp.verified) {
      return {
        success: false,
        error: { code: "NO_OTP_FOUND", message: "No pending verification code found." },
      };
    }

    if (memOtp.attempts >= AUTH_CONFIG.otpMaxAttempts) {
      return {
        success: false,
        error: {
          code: "OTP_MAX_ATTEMPTS",
          message: "Too many failed attempts. This code is invalidated. Please request a new OTP.",
        },
      };
    }

    if (new Date() > memOtp.expiresAt) {
      return {
        success: false,
        error: { code: "OTP_EXPIRED", message: "Verification code has expired." },
      };
    }

    if (memOtp.code !== input.code) {
      memOtp.attempts = (memOtp.attempts || 0) + 1;
      const isMaxedOut = memOtp.attempts >= AUTH_CONFIG.otpMaxAttempts;
      if (isMaxedOut) {
        memOtp.verified = true;
      }
      return {
        success: false,
        error: {
          code: isMaxedOut ? "OTP_MAX_ATTEMPTS" : "INVALID_OTP",
          message: isMaxedOut
            ? "Too many failed attempts (5/5). This code has been invalidated. Please request a new OTP."
            : `Invalid verification code. ${AUTH_CONFIG.otpMaxAttempts - memOtp.attempts} attempt(s) remaining.`,
        },
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
        patientId: input.userId === "usr_pat_01" ? "pat_meet_01" : `pat_${input.userId}`,
      },
    };
  }

  /**
   * Resend a new OTP with rate limiting (max 5 requests / 15 min window)
   */
  static async resendOtp(userId: string): Promise<{ success: boolean; error?: string; code?: string; devOtp?: string }> {
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const windowStart = new Date(Date.now() - AUTH_CONFIG.otpRateLimitWindowMs);
    let recipient: string | null = null;

    try {
      // 1. Fetch user to verify existence and get real email/phone recipient
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, phone: true },
      });

      if (user) {
        recipient = user.email || user.phone;
      }

      // 2. Enforce resend rate limit (AUTH_CONFIG.otpRateLimitMax per window)
      const recentOtpCount = await prisma.otpVerification.count({
        where: {
          userId,
          createdAt: { gte: windowStart },
        },
      });

      if (recentOtpCount >= AUTH_CONFIG.otpRateLimitMax) {
        return {
          success: false,
          code: "OTP_RATE_LIMITED",
          error: `Too many OTP requests. Maximum ${AUTH_CONFIG.otpRateLimitMax} requests allowed per 15 minutes. Please try again later.`,
        };
      }

      // 3. Create new OTP record
      await prisma.otpVerification.create({
        data: { userId, code: newCode, expiresAt, verified: false },
      });
    } catch (dbError) {
      console.error("Database error during resendOtp:", dbError);

      if (!ALLOW_MEMORY_FALLBACK) {
        return {
          success: false,
          code: "SERVICE_UNAVAILABLE",
          error: "We're having trouble reaching the database. Please try again in a moment.",
        };
      }

      console.warn("Database unavailable, falling back to memory store in dev mode for resendOtp");

      // Memory store rate limit check
      const memUser = Array.from(memoryUsers.values()).find((u) => u.id === userId);
      if (memUser) {
        recipient = memUser.email || memUser.phone;
      }

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

    // Deliver new OTP — provider choice based on env vars (same as registration)
    const delivery = await OtpDeliveryService.deliver(recipient || userId, newCode, userId);

    return {
      success: true,
      ...(delivery.devOtp ? { devOtp: delivery.devOtp } : {}),
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
      if (!ALLOW_MEMORY_FALLBACK) return null;
    } catch (dbError) {
      console.error("Database error in getUserProfile:", dbError);
      if (!ALLOW_MEMORY_FALLBACK) {
        throw dbError;
      }
      console.warn("Database unavailable for getUserProfile, falling back to memory store in dev mode...");
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
      patient: memUser.role === "PATIENT" ? { id: memUser.id === "usr_pat_01" ? "pat_meet_01" : `pat_${memUser.id}`, name: memUser.name, age: 34, gender: "MALE", bloodGroup: "O+" } : null,
      doctor: memUser.role === "DOCTOR" ? { id: memUser.id === "usr_doc_01" ? "doc_patel_01" : `doc_${memUser.id}`, name: memUser.name, specialty: "Cardiology" } : null,
      admin: memUser.role === "ADMIN" ? { id: `adm_${memUser.id}`, name: memUser.name } : null,
    };
  }

  /**
   * Request a password reset link.
   * Returns generic success regardless of whether the user exists (prevents user enumeration).
   * Rate limited to max 5 requests per 15 minutes per identifier/user.
   */
  static async requestPasswordReset(identifier: string): Promise<{
    success: boolean;
    error?: { code: string; message: string };
    devResetLink?: string;
    devToken?: string;
  }> {
    if (ALLOW_MEMORY_FALLBACK) {
      await ensureDemoAccounts();
    }

    const isEmail = identifier.includes("@");
    const windowStart = new Date(Date.now() - AUTH_CONFIG.passwordResetRateLimitWindowMs);

    try {
      // Trigger background cleanup of expired tokens
      TokenCleanupService.cleanupExpiredTokens().catch((err) => {
        console.warn("Background expired token cleanup skipped:", (err as Error).message);
      });

      const user = await prisma.user.findFirst({
        where: isEmail
          ? { email: identifier.toLowerCase() }
          : { phone: identifier },
        select: { id: true, email: true, phone: true, isActive: true },
      });

      let devResetLink: string | undefined;
      let devToken: string | undefined;

      if (user && user.isActive) {
        // Enforce rate limit (max 5 requests per 15 mins)
        const recentCount = await prisma.passwordResetToken.count({
          where: {
            userId: user.id,
            createdAt: { gte: windowStart },
          },
        });

        if (recentCount >= AUTH_CONFIG.passwordResetRateLimitMax) {
          return {
            success: false,
            error: {
              code: "RATE_LIMIT_EXCEEDED",
              message: `Too many password reset requests. Maximum ${AUTH_CONFIG.passwordResetRateLimitMax} requests allowed per 15 minutes. Please try again later.`,
            },
          };
        }

        const rawToken = crypto.randomBytes(32).toString("hex");
        const tokenHash = hashToken(rawToken);
        const expiresAt = new Date(Date.now() + AUTH_CONFIG.passwordResetExpiryMinutes * 60 * 1000);

        // Delete any existing unused reset tokens for this user
        await prisma.passwordResetToken.deleteMany({
          where: { userId: user.id },
        });

        // Store hashed token
        await prisma.passwordResetToken.create({
          data: {
            userId: user.id,
            tokenHash,
            expiresAt,
          },
        });

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const resetUrl = `${appUrl}/auth/reset-password?token=${rawToken}`;
        const recipient = user.email || user.phone || identifier;

        console.log(`[DEV PASSWORD RESET] Recipient: ${recipient} | Reset Link: ${resetUrl} | Token: ${rawToken}`);

        if (process.env.NODE_ENV !== "production") {
          devResetLink = resetUrl;
          devToken = rawToken;
        }
      }

      return {
        success: true,
        ...(devResetLink ? { devResetLink, devToken } : {}),
      };
    } catch (dbError) {
      console.error("Database error during requestPasswordReset:", dbError);

      if (!ALLOW_MEMORY_FALLBACK) {
        return {
          success: false,
          error: {
            code: "SERVICE_UNAVAILABLE",
            message: "We're having trouble reaching the database. Please try again in a moment.",
          },
        };
      }

      console.warn("Database unavailable, falling back to memory store for requestPasswordReset in dev mode");
    }

    // Memory Store Fallback (dev mode only)
    const memUser = Array.from(memoryUsers.values()).find((u) =>
      isEmail
        ? u.email.toLowerCase() === identifier.toLowerCase()
        : u.phone === identifier
    );

    let devResetLink: string | undefined;
    let devToken: string | undefined;

    if (memUser && memUser.isActive) {
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + AUTH_CONFIG.passwordResetExpiryMinutes * 60 * 1000);

      // Clean up previous tokens for this user in memory
      for (const [hash, t] of memoryPasswordResetTokens.entries()) {
        if (t.userId === memUser.id) {
          memoryPasswordResetTokens.delete(hash);
        }
      }

      memoryPasswordResetTokens.set(tokenHash, {
        id: `prt_${Date.now()}`,
        userId: memUser.id,
        tokenHash,
        expiresAt,
        createdAt: new Date(),
      });

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const resetUrl = `${appUrl}/auth/reset-password?token=${rawToken}`;
      const recipient = memUser.email || memUser.phone || identifier;

      console.log(`[DEV PASSWORD RESET] Recipient: ${recipient} | Reset Link: ${resetUrl} | Token: ${rawToken}`);
      devResetLink = resetUrl;
      devToken = rawToken;
    }

    return {
      success: true,
      ...(devResetLink ? { devResetLink, devToken } : {}),
    };
  }

  /**
   * Reset user password with a verified link token.
   * Hashes new password, invalidates the reset token, and terminates all active refresh tokens.
   */
  static async resetPassword(
    token: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: { code: string; message: string } }> {
    if (!token || !newPassword) {
      return {
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "Token and new password are required.",
        },
      };
    }

    const tokenHash = hashToken(token);
    const now = new Date();

    try {
      const resetRecord = await prisma.passwordResetToken.findUnique({
        where: { tokenHash },
      });

      if (!resetRecord || resetRecord.expiresAt < now) {
        if (resetRecord) {
          await prisma.passwordResetToken.delete({ where: { id: resetRecord.id } }).catch(() => {});
        }
        return {
          success: false,
          error: {
            code: "INVALID_OR_EXPIRED_TOKEN",
            message: "This password reset link is invalid or has expired. Please request a new one.",
          },
        };
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(newPassword, salt);

      // Atomically update password, invalidate reset token, and revoke all sessions
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.user.update({
          where: { id: resetRecord.userId },
          data: {
            passwordHash,
            failedLogins: 0,
            lockedUntil: null,
          },
        });

        await tx.passwordResetToken.delete({
          where: { id: resetRecord.id },
        });

        await tx.refreshToken.deleteMany({
          where: { userId: resetRecord.userId },
        });
      });

      return { success: true };
    } catch (dbError) {
      console.error("Database error during resetPassword:", dbError);

      if (!ALLOW_MEMORY_FALLBACK) {
        return {
          success: false,
          error: {
            code: "SERVICE_UNAVAILABLE",
            message: "We're having trouble reaching the database. Please try again in a moment.",
          },
        };
      }

      console.warn("Database query failed during resetPassword, checking memory store in dev mode...");
    }

    // Memory Store Fallback (dev mode only)
    const memRecord = memoryPasswordResetTokens.get(tokenHash);
    if (!memRecord || memRecord.expiresAt < now) {
      if (memRecord) {
        memoryPasswordResetTokens.delete(tokenHash);
      }
      return {
        success: false,
        error: {
          code: "INVALID_OR_EXPIRED_TOKEN",
          message: "This password reset link is invalid or has expired. Please request a new one.",
        },
      };
    }

    const memUser = Array.from(memoryUsers.values()).find((u) => u.id === memRecord.userId);
    if (!memUser) {
      memoryPasswordResetTokens.delete(tokenHash);
      return {
        success: false,
        error: {
          code: "USER_NOT_FOUND",
          message: "User account associated with this reset link could not be found.",
        },
      };
    }

    const salt = await bcrypt.genSalt(10);
    memUser.passwordHash = await bcrypt.hash(newPassword, salt);
    memUser.failedLogins = 0;
    memUser.lockedUntil = null;
    memoryPasswordResetTokens.delete(tokenHash);

    return { success: true };
  }
}


