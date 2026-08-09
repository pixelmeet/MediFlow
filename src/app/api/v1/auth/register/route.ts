import { NextResponse } from "next/server";
import { RegisterPatientSchema } from "@/lib/validation/auth";
import { AuthService } from "@/lib/services/AuthService";
import { errorResponse, successResponse } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parseResult = RegisterPatientSchema.safeParse(body);

    if (!parseResult.success) {
      const fieldErrors: Record<string, string[]> = {};
      parseResult.error.issues.forEach((err) => {
        const path = err.path.join(".");
        if (!fieldErrors[path]) fieldErrors[path] = [];
        fieldErrors[path].push(err.message);
      });

      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", "Invalid registration details", fieldErrors),
        { status: 422 }
      );
    }

    const result = await AuthService.registerPatient(parseResult.data);

    if (!result.success || !result.user) {
      const status = result.error?.code === "SERVICE_UNAVAILABLE" ? 503 : 400;
      return NextResponse.json(
        errorResponse(result.error?.code || "REGISTRATION_FAILED", result.error?.message || "Registration failed"),
        { status }
      );
    }

    return NextResponse.json(
      successResponse(result.user, {
        message: "Registration successful. Please verify the OTP sent to your phone/email.",
      }),
      { status: 201 }
    );
  } catch (error) {
    console.error("Register API error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "An unexpected error occurred during registration"),
      { status: 500 }
    );
  }
}
