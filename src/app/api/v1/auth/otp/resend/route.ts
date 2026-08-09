import { NextResponse } from "next/server";
import { ResendOtpSchema } from "@/lib/validation/auth";
import { AuthService } from "@/lib/services/AuthService";
import { errorResponse, successResponse } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parseResult = ResendOtpSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", "User ID is required"),
        { status: 422 }
      );
    }

    const result = await AuthService.resendOtp(parseResult.data.userId);

    if (!result.success) {
      const status = result.code === "SERVICE_UNAVAILABLE" ? 503 : 429;
      return NextResponse.json(
        errorResponse(result.code || "RATE_LIMIT_EXCEEDED", result.error || "Too many OTP requests. Please wait."),
        { status }
      );
    }

    return NextResponse.json(
      successResponse(
        { sent: true },
        { message: "A new OTP code has been generated and sent." }
      ),
      { status: 200 }
    );
  } catch (error) {
    console.error("Resend OTP API error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "An unexpected error occurred during OTP resend"),
      { status: 500 }
    );
  }
}
