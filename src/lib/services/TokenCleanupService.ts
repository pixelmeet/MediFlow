import { prisma } from "../db";

export class TokenCleanupService {
  /**
   * Sweep and delete all expired refresh tokens, password reset tokens, and stale unverified OTPs.
   */
  static async cleanupExpiredTokens(): Promise<{
    success: boolean;
    deletedTokensCount: number;
    deletedOtpsCount: number;
    deletedResetTokensCount: number;
    error?: string;
  }> {
    try {
      const now = new Date();
      const [tokenResult, otpResult, resetResult] = await Promise.all([
        prisma.refreshToken.deleteMany({
          where: { expiresAt: { lt: now } },
        }),
        prisma.otpVerification.deleteMany({
          where: { expiresAt: { lt: now }, verified: false },
        }),
        prisma.passwordResetToken.deleteMany({
          where: { expiresAt: { lt: now } },
        }),
      ]);

      return {
        success: true,
        deletedTokensCount: tokenResult.count,
        deletedOtpsCount: otpResult.count,
        deletedResetTokensCount: resetResult.count,
      };
    } catch (error) {
      console.error("TokenCleanupService error:", error);
      return {
        success: false,
        deletedTokensCount: 0,
        deletedOtpsCount: 0,
        deletedResetTokensCount: 0,
        error: (error as Error).message,
      };
    }
  }
}
