import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { AuthService } from "@/lib/services/AuthService";
import { UpdatePatientProfileSchema } from "@/lib/validation/auth";
import { errorResponse, successResponse, safeParseJson } from "@/lib/utils";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        errorResponse("UNAUTHENTICATED", "Please sign in to view your profile"),
        { status: 401 }
      );
    }

    if (session.role !== "PATIENT") {
      return NextResponse.json(
        errorResponse("FORBIDDEN", "Only patients can access the patient profile"),
        { status: 403 }
      );
    }

    const userProfile = await AuthService.getUserProfile(session.userId);
    if (!userProfile || !userProfile.patient) {
      return NextResponse.json(
        errorResponse("NOT_FOUND", "Patient profile not found"),
        { status: 404 }
      );
    }

    return NextResponse.json(
      successResponse({
        id: userProfile.patient.id,
        userId: userProfile.id,
        name: userProfile.patient.name,
        email: userProfile.email,
        phone: userProfile.phone,
        age: userProfile.patient.age,
        gender: userProfile.patient.gender,
        bloodGroup: userProfile.patient.bloodGroup,
      })
    );
  } catch (error) {
    console.error("Get patient profile error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "Failed to retrieve profile"),
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        errorResponse("UNAUTHENTICATED", "Please sign in to update your profile"),
        { status: 401 }
      );
    }

    if (session.role !== "PATIENT") {
      return NextResponse.json(
        errorResponse("FORBIDDEN", "Only patients can update their patient profile"),
        { status: 403 }
      );
    }

    const body = await safeParseJson<Record<string, unknown>>(request);
    if (!body) {
      return NextResponse.json(
        errorResponse("INVALID_JSON", "Malformed or empty JSON request body"),
        { status: 400 }
      );
    }

    const parse = UpdatePatientProfileSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", parse.error.issues[0]?.message || "Invalid profile data"),
        { status: 422 }
      );
    }

    const result = await AuthService.updatePatientProfile(session.userId, parse.data);

    if (!result.success) {
      const status = result.error?.code === "PHONE_ALREADY_IN_USE" ? 409 : 400;
      return NextResponse.json(
        errorResponse(result.error?.code || "UPDATE_FAILED", result.error?.message || "Failed to update profile"),
        { status }
      );
    }

    return NextResponse.json(
      successResponse(result.data, { message: "Profile updated successfully" })
    );
  } catch (error) {
    console.error("Update patient profile error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "Failed to update profile"),
      { status: 500 }
    );
  }
}
