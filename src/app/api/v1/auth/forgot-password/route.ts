import { NextResponse } from "next/server";
import { ForgotPasswordSchema } from "@/lib/validation/auth";
import { AuthService } from "@/lib/services/AuthService";
import { errorResponse, successResponse, safeParseJson } from "@/lib/utils";
import { rateLimit, rateLimitResponse } from "@/lib/api/rate-limit";

export async function POST(request: Request) {
  try {
    const rl = rateLimit(request, "auth:forgot-password", { limit: 5, windowMs: 15 * 60_000 });
    if (!rl.allowed) return rateLimitResponse(rl.retryAfter);

    const body = await safeParseJson(request);
    if (!body) {
      return NextResponse.json(
        errorResponse("INVALID_JSON", "Malformed or empty JSON request body"),
        { status: 400 }
      );
    }

    const parseResult = ForgotPasswordSchema.safeParse(body);
    if (!parseResult.success) {
      const fieldErrors: Record<string, string[]> = {};
      parseResult.error.issues.forEach((err) => {
        const path = err.path.join(".");
        if (!fieldErrors[path]) fieldErrors[path] = [];
        fieldErrors[path].push(err.message);
      });

      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", "Please provide a valid email address or phone number", fieldErrors),
        { status: 422 }
      );
    }

    const result = await AuthService.requestPasswordReset(parseResult.data.identifier);

    if (!result.success) {
      const status = result.error?.code === "SERVICE_UNAVAILABLE" ? 503 : 429;
      return NextResponse.json(
        errorResponse(
          result.error?.code || "RESET_REQUEST_FAILED",
          result.error?.message || "Failed to process password reset request"
        ),
        { status }
      );
    }

    // Always return generic success message to prevent user enumeration
    return NextResponse.json(
      successResponse(
        { sent: true },
        {
          message: "If an account exists with this email or phone number, password reset instructions have been sent.",
        }
      ),
      { status: 200 }
    );
  } catch (error) {
    console.error("Forgot password API error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "An unexpected error occurred while requesting password reset"),
      { status: 500 }
    );
  }
}
