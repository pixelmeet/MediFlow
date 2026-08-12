import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { TokenCleanupService } from "@/lib/services/TokenCleanupService";
import { errorResponse, successResponse } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    // Authenticate via either ADMIN session OR CRON_SECRET authorization header
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get("authorization");
    const isCronAuthorized = cronSecret && authHeader === `Bearer ${cronSecret}`;

    if (!isCronAuthorized) {
      const session = await getSession();
      if (!session) {
        return NextResponse.json(
          errorResponse("UNAUTHENTICATED", "Please sign in to trigger token cleanup"),
          { status: 401 }
        );
      }

      if (session.role !== "ADMIN") {
        return NextResponse.json(
          errorResponse("FORBIDDEN", "Only hospital administrators can trigger token cleanup"),
          { status: 403 }
        );
      }
    }

    const result = await TokenCleanupService.cleanupExpiredTokens();

    if (!result.success) {
      return NextResponse.json(
        errorResponse("CLEANUP_FAILED", result.error || "Token cleanup encountered an error"),
        { status: 500 }
      );
    }

    return NextResponse.json(
      successResponse(result, {
        message: `Successfully cleaned up ${result.deletedTokensCount} expired token(s) and ${result.deletedOtpsCount} stale OTP(s).`,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Token cleanup API error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "Failed to run token cleanup"),
      { status: 500 }
    );
  }
}
