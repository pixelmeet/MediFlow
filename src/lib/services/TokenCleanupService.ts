import { prisma } from "../db";
import { ALLOW_MEMORY_FALLBACK } from "../auth/config";

export class TokenCleanupService {
  /**
   * Sweep and delete all expired refresh tokens and stale unverified OTPs.
   */
  static async cleanupExpiredTokens(): Promise<{
    success: boolean;
    deletedTokensCount: number;
    deletedOtpsCount: number;
    error?: string;
  }> {
    try {
      const now = new Date();
      const [tokenResult, otpResult] = await Promise.all([
        prisma.refreshToken.deleteMany({
          where: { expiresAt: { lt: now } },
        }),
        prisma.otpVerification.deleteMany({
          where: { expiresAt: { lt: now }, verified: false },
        }),
      ]);

      return {
        success: true,
        deletedTokensCount: tokenResult.count,
        deletedOtpsCount: otpResult.count,
      };
    } catch (error) {
      console.error("TokenCleanupService error:", error);
      if (ALLOW_MEMORY_FALLBACK) {
        return { success: true, deletedTokensCount: 0, deletedOtpsCount: 0 };
      }
      return {
        success: false,
        deletedTokensCount: 0,
        deletedOtpsCount: 0,
        error: (error as Error).message,
      };
    }
  }
}
