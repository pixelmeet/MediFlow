import crypto from "crypto";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { AUTH_CONFIG } from "../auth/config";
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

export class AuthService {
  /**
   * Register a new patient account and create an OTP verification token
   */
  static async registerPatient(input: RegisterPatientInput): Promise<AuthResult> {

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
      return {
        success: false,
        error: {
          code: "SERVICE_UNAVAILABLE",
          message: "We're having trouble reaching the database. Please try again in a moment.",
        },
      };
    }
  }

  /**
   * Login with email or phone + password
   * Enforces 5 failed attempts -> 15 min lockout rule and isVerified check
   */
  static async login(input: LoginInput): Promise<AuthResult> {
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

        // Accounts without password set (e.g. unactivated doctor accounts) fail immediately
        if (!user.passwordHash) {
          return {
            success: false,
            error: {
              code: "INVALID_CREDENTIALS",
              message: "Invalid email/phone or password.",
            },
          };
        }

        const passwordMatch = await bcrypt.compare(input.password, user.passwordHash);

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
      return {
        success: false,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email/phone or password.",
        },
      };
    } catch (e) {
      console.error("Database error during login:", e);
      return {
        success: false,
        error: {
          code: "SERVICE_UNAVAILABLE",
          message: "We're having trouble reaching the database. Please try again in a moment.",
        },
      };
    }
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

      return {
        success: false,
        error: {
          code: "NO_OTP_FOUND",
          message: "No pending verification code found.",
        },
      };
    } catch (dbError) {
      console.error("Database error during verifyOtp:", dbError);
      return {
        success: false,
        error: {
          code: "SERVICE_UNAVAILABLE",
          message: "We're having trouble reaching the database. Please try again in a moment.",
        },
      };
    }
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
      return {
        success: false,
        code: "SERVICE_UNAVAILABLE",
        error: "We're having trouble reaching the database. Please try again in a moment.",
      };
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
      return null;
    } catch (dbError) {
      console.error("Database error in getUserProfile:", dbError);
      return null;
    }
  }

  /**
   * Request a password reset link.
   * Returns generic success regardless of whether the user exists (prevents user enumeration).
   * Rate limited to max 5 requests per 15 minutes per identifier/user.
   */
  static async requestPasswordReset(identifier: string): Promise<{
    success: boolean;
    error?: { code: string; message: string };
  }> {
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
      }

      return {
        success: true,
      };
    } catch (dbError) {
      console.error("Database error during requestPasswordReset:", dbError);
      return {
        success: false,
        error: {
          code: "SERVICE_UNAVAILABLE",
          message: "We're having trouble reaching the database. Please try again in a moment.",
        },
      };
    }
  }

  /**
   * Generate and store an account activation token for an unactivated account (e.g. doctor created by admin).
   * Uses PasswordResetToken table with a 7-day expiration.
   * Logs dev-mode link to console following the established [DEV ...] convention.
   */
  static async generateActivationToken(
    userId: string,
    recipient: string
  ): Promise<{ success: boolean; token?: string }> {
    try {
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = hashToken(rawToken);
      // 7 days expiration for account activation
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      // Invalidate any existing unused reset/activation tokens for this user
      await prisma.passwordResetToken.deleteMany({
        where: { userId },
      });

      // Store hashed activation token
      await prisma.passwordResetToken.create({
        data: {
          userId,
          tokenHash,
          expiresAt,
        },
      });

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const activationUrl = `${appUrl}/auth/reset-password?token=${rawToken}&mode=activate`;

      console.log(`[DEV ACCOUNT ACTIVATION] Recipient: ${recipient} | Activation Link: ${activationUrl} | Token: ${rawToken}`);

      return {
        success: true,
        token: rawToken,
      };
    } catch (err) {
      console.error("Error generating activation token:", err);
      return {
        success: false,
      };
    }
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
      return {
        success: false,
        error: {
          code: "SERVICE_UNAVAILABLE",
          message: "We're having trouble reaching the database. Please try again in a moment.",
        },
      };
    }
  }

  /**
   * Update self-service patient profile.
   * Updates Patient record fields (name, age, gender, bloodGroup) and User phone (with uniqueness check).
   */
  static async updatePatientProfile(
    userId: string,
    input: {
      name?: string;
      phone?: string;
      age?: number | null;
      gender?: string | null;
      bloodGroup?: string | null;
    }
  ): Promise<{
    success: boolean;
    data?: {
      id: string;
      userId: string;
      name: string;
      email?: string | null;
      phone?: string | null;
      age?: number | null;
      gender?: string | null;
      bloodGroup?: string | null;
    };
    error?: { code: string; message: string };
  }> {
    try {
      const patient = await prisma.patient.findUnique({
        where: { userId },
        include: { user: true },
      });

      if (!patient) {
        return {
          success: false,
          error: { code: "PATIENT_NOT_FOUND", message: "Patient profile not found." },
        };
      }

      // If phone changed, check uniqueness across User table
      if (input.phone && input.phone !== patient.user.phone) {
        const existingPhone = await prisma.user.findFirst({
          where: {
            phone: input.phone,
            NOT: { id: userId },
          },
        });

        if (existingPhone) {
          return {
            success: false,
            error: {
              code: "PHONE_ALREADY_IN_USE",
              message: "This phone number is already registered by another account.",
            },
          };
        }
      }

      const updated = await prisma.$transaction(async (tx) => {
        if (input.phone && input.phone !== patient.user.phone) {
          await tx.user.update({
            where: { id: userId },
            data: { phone: input.phone },
          });
        }

        const updatedPatient = await tx.patient.update({
          where: { userId },
          data: {
            ...(input.name !== undefined ? { name: input.name } : {}),
            ...(input.age !== undefined ? { age: input.age } : {}),
            ...(input.gender !== undefined ? { gender: input.gender } : {}),
            ...(input.bloodGroup !== undefined ? { bloodGroup: input.bloodGroup } : {}),
          },
          include: { user: true },
        });

        return updatedPatient;
      });

      return {
        success: true,
        data: {
          id: updated.id,
          userId: updated.userId,
          name: updated.name,
          email: updated.user.email,
          phone: updated.user.phone,
          age: updated.age,
          gender: updated.gender,
          bloodGroup: updated.bloodGroup,
        },
      };
    } catch (dbError) {
      console.error("Database error during updatePatientProfile:", dbError);
      return {
        success: false,
        error: { code: "SERVICE_UNAVAILABLE", message: "Database is unavailable. Please try again." },
      };
    }
  }

  /**
   * Update self-service doctor profile.
   * Deliberately excludes fee, specialty, departmentId, appointmentDurationMin (admin-only).
   */
  static async updateDoctorProfile(
    userId: string,
    input: {
      bio?: string | null;
      qualifications?: string | null;
      experience?: number | null;
      language?: string[];
      photoUrl?: string | null;
    }
  ): Promise<{
    success: boolean;
    data?: {
      id: string;
      userId: string;
      name: string;
      specialty: string;
      bio?: string | null;
      qualifications?: string | null;
      experience?: number | null;
      language: string[];
      photoUrl?: string | null;
      fee: number;
      departmentName?: string;
      branchName?: string;
    };
    error?: { code: string; message: string };
  }> {
    try {
      const doctor = await prisma.doctor.findUnique({
        where: { userId },
        include: {
          user: true,
          department: { include: { branch: true } },
        },
      });

      if (!doctor) {
        return {
          success: false,
          error: { code: "DOCTOR_NOT_FOUND", message: "Doctor profile not found." },
        };
      }

      const updated = await prisma.doctor.update({
        where: { userId },
        data: {
          ...(input.bio !== undefined ? { bio: input.bio } : {}),
          ...(input.qualifications !== undefined ? { qualifications: input.qualifications } : {}),
          ...(input.experience !== undefined ? { experience: input.experience } : {}),
          ...(input.language !== undefined ? { language: input.language } : {}),
          ...(input.photoUrl !== undefined ? { photoUrl: input.photoUrl || null } : {}),
        },
        include: {
          department: { include: { branch: true } },
        },
      });

      return {
        success: true,
        data: {
          id: updated.id,
          userId: updated.userId,
          name: updated.name,
          specialty: updated.specialty,
          bio: updated.bio,
          qualifications: updated.qualifications,
          experience: updated.experience,
          language: updated.language,
          photoUrl: updated.photoUrl,
          fee: Number(updated.fee),
          departmentName: updated.department?.name,
          branchName: updated.department?.branch?.name,
        },
      };
    } catch (dbError) {
      console.error("Database error during updateDoctorProfile:", dbError);
      return {
        success: false,
        error: { code: "SERVICE_UNAVAILABLE", message: "Database is unavailable. Please try again." },
      };
    }
  }

  /**
   * Change user password.
   * Verifies current password before change. Hashes new password and revokes existing refresh tokens.
   */
  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    currentRefreshTokenHash?: string
  ): Promise<{ success: boolean; error?: { code: string; message: string } }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return {
          success: false,
          error: { code: "USER_NOT_FOUND", message: "User account not found." },
        };
      }

      const isMatch = user.passwordHash
        ? await bcrypt.compare(currentPassword, user.passwordHash)
        : false;

      if (!isMatch) {
        return {
          success: false,
          error: {
            code: "INCORRECT_PASSWORD",
            message: "The current password you entered is incorrect.",
          },
        };
      }

      const salt = await bcrypt.genSalt(10);
      const newHash = await bcrypt.hash(newPassword, salt);

      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: {
            passwordHash: newHash,
            failedLogins: 0,
            lockedUntil: null,
          },
        });

        // Invalidate all refresh tokens for this user EXCEPT current session token if provided
        await tx.refreshToken.deleteMany({
          where: {
            userId,
            ...(currentRefreshTokenHash ? { NOT: { tokenHash: currentRefreshTokenHash } } : {}),
          },
        });
      });

      return { success: true };
    } catch (dbError) {
      console.error("Database error in changePassword:", dbError);
      return {
        success: false,
        error: { code: "SERVICE_UNAVAILABLE", message: "Database is unavailable. Please try again." },
      };
    }
  }
}


