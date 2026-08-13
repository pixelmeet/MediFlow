import { NextResponse } from "next/server";
import { ResetPasswordSchema } from "@/lib/validation/auth";
import { AuthService } from "@/lib/services/AuthService";
import { errorResponse, successResponse, safeParseJson } from "@/lib/utils";
import { rateLimit, rateLimitResponse } from "@/lib/api/rate-limit";

export async function POST(request: Request) {
  try {
    const rl = rateLimit(request, "auth:reset-password", { limit: 10, windowMs: 15 * 60_000 });
    if (!rl.allowed) return rateLimitResponse(rl.retryAfter);

    const body = await safeParseJson(request);
    if (!body) {
      return NextResponse.json(
        errorResponse("INVALID_JSON", "Malformed or empty JSON request body"),
        { status: 400 }
      );
    }

    const parseResult = ResetPasswordSchema.safeParse(body);
    if (!parseResult.success) {
      const fieldErrors: Record<string, string[]> = {};
      parseResult.error.issues.forEach((err) => {
        const path = err.path.join(".");
        if (!fieldErrors[path]) fieldErrors[path] = [];
        fieldErrors[path].push(err.message);
      });

      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", "Password does not meet requirements", fieldErrors),
        { status: 422 }
      );
    }

    const result = await AuthService.resetPassword(
      parseResult.data.token,
      parseResult.data.password
    );

    if (!result.success) {
      let status = 400;
      if (result.error?.code === "SERVICE_UNAVAILABLE") {
        status = 503;
      } else if (result.error?.code === "INVALID_OR_EXPIRED_TOKEN") {
        status = 400;
      }

      return NextResponse.json(
        errorResponse(
          result.error?.code || "RESET_FAILED",
          result.error?.message || "Failed to reset password"
        ),
        { status }
      );
    }

    return NextResponse.json(
      successResponse(
        { reset: true },
        { message: "Your password has been successfully reset. Please sign in with your new password." }
      ),
      { status: 200 }
    );
  } catch (error) {
    console.error("Reset password API error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "An unexpected error occurred while resetting password"),
      { status: 500 }
    );
  }
}
