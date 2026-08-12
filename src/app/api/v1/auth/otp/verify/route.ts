import { NextResponse } from "next/server";
import { VerifyOtpSchema } from "@/lib/validation/auth";
import { AuthService } from "@/lib/services/AuthService";
import { setSessionCookies } from "@/lib/auth/session";
import { errorResponse, successResponse } from "@/lib/utils";
import { rateLimit, rateLimitResponse } from "@/lib/api/rate-limit";

export async function POST(request: Request) {
  try {
    const rl = rateLimit(request, "auth:otp:verify", { limit: 5, windowMs: 15 * 60_000 });
    if (!rl.allowed) return rateLimitResponse(rl.retryAfter);

    const body = await request.json();
    const parseResult = VerifyOtpSchema.safeParse(body);

    if (!parseResult.success) {
      const fieldErrors: Record<string, string[]> = {};
      parseResult.error.issues.forEach((err) => {
        const path = err.path.join(".");
        if (!fieldErrors[path]) fieldErrors[path] = [];
        fieldErrors[path].push(err.message);
      });

      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", "Invalid OTP format", fieldErrors),
        { status: 422 }
      );
    }

    const result = await AuthService.verifyOtp(parseResult.data);

    if (!result.success || !result.user) {
      const status = result.error?.code === "SERVICE_UNAVAILABLE" ? 503 : 400;
      return NextResponse.json(
        errorResponse(result.error?.code || "OTP_VERIFY_FAILED", result.error?.message || "Invalid OTP"),
        { status }
      );
    }

    // Set secure session cookie now that OTP is verified
    await setSessionCookies({
      userId: result.user.id,
      email: result.user.email,
      phone: result.user.phone,
      role: result.user.role,
      name: result.user.name,
    });

    return NextResponse.json(
      successResponse(result.user, {
        message: "Verification successful",
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Verify OTP API error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "An unexpected error occurred during OTP verification"),
      { status: 500 }
    );
  }
}
