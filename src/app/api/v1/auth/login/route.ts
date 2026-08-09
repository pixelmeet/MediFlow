import { NextResponse } from "next/server";
import { LoginSchema } from "@/lib/validation/auth";
import { AuthService } from "@/lib/services/AuthService";
import { setSessionCookies } from "@/lib/auth/session";
import { errorResponse, successResponse } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parseResult = LoginSchema.safeParse(body);

    if (!parseResult.success) {
      const fieldErrors: Record<string, string[]> = {};
      parseResult.error.issues.forEach((err) => {
        const path = err.path.join(".");
        if (!fieldErrors[path]) fieldErrors[path] = [];
        fieldErrors[path].push(err.message);
      });

      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", "Please provide email/phone and password", fieldErrors),
        { status: 422 }
      );
    }

    const result = await AuthService.login(parseResult.data);

    if (!result.success || !result.user) {
      let status = 401;
      if (result.error?.code === "SERVICE_UNAVAILABLE") {
        status = 503;
      } else if (result.error?.code === "ACCOUNT_LOCKED") {
        status = 423;
      }

      return NextResponse.json(
        errorResponse(
          result.error?.code || "LOGIN_FAILED",
          result.error?.message || "Invalid credentials",
          result.error?.lockoutRemainingMinutes
            ? { lockout: [`${result.error.lockoutRemainingMinutes} minutes remaining`] }
            : undefined
        ),
        { status }
      );
    }

    // Set secure httpOnly session cookies
    await setSessionCookies({
      userId: result.user.id,
      email: result.user.email,
      phone: result.user.phone,
      role: result.user.role,
      name: result.user.name,
    });

    return NextResponse.json(
      successResponse(result.user, {
        message: "Login successful",
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Login API error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "An unexpected error occurred during login"),
      { status: 500 }
    );
  }
}
