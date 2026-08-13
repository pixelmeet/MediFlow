import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth/session";
import { REFRESH_COOKIE_NAME } from "@/lib/auth/jwt";
import { hashToken } from "@/lib/auth/token-hash";
import { AuthService } from "@/lib/services/AuthService";
import { ChangePasswordSchema } from "@/lib/validation/auth";
import { rateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { errorResponse, successResponse, safeParseJson } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    // Rate limit: 5 attempts per 15 minutes
    const rl = rateLimit(request, "auth:change-password", { limit: 5, windowMs: 15 * 60_000 });
    if (!rl.allowed) return rateLimitResponse(rl.retryAfter);

    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        errorResponse("UNAUTHENTICATED", "Please sign in to change your password"),
        { status: 401 }
      );
    }

    const body = await safeParseJson<Record<string, unknown>>(request);
    if (!body) {
      return NextResponse.json(
        errorResponse("INVALID_JSON", "Malformed or empty JSON request body"),
        { status: 400 }
      );
    }

    const parse = ChangePasswordSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", parse.error.issues[0]?.message || "Invalid password data"),
        { status: 422 }
      );
    }

    // Get current session refresh token hash to preserve current login while revoking others
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get(REFRESH_COOKIE_NAME)?.value;
    const currentRefreshTokenHash = refreshToken ? hashToken(refreshToken) : undefined;

    const result = await AuthService.changePassword(
      session.userId,
      parse.data.currentPassword,
      parse.data.newPassword,
      currentRefreshTokenHash
    );

    if (!result.success) {
      const status = result.error?.code === "INCORRECT_PASSWORD" ? 400 : 500;
      return NextResponse.json(
        errorResponse(result.error?.code || "PASSWORD_CHANGE_FAILED", result.error?.message || "Failed to change password"),
        { status }
      );
    }

    return NextResponse.json(
      successResponse({ changed: true }, { message: "Password has been successfully changed" })
    );
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "Failed to change password"),
      { status: 500 }
    );
  }
}
