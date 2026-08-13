import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { AuthService } from "@/lib/services/AuthService";
import { UpdateDoctorProfileSchema } from "@/lib/validation/doctor";
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

    if (session.role !== "DOCTOR") {
      return NextResponse.json(
        errorResponse("FORBIDDEN", "Only doctors can access the doctor profile"),
        { status: 403 }
      );
    }

    const userProfile = await AuthService.getUserProfile(session.userId);
    if (!userProfile || !userProfile.doctor) {
      return NextResponse.json(
        errorResponse("NOT_FOUND", "Doctor profile not found"),
        { status: 404 }
      );
    }

    const doc = userProfile.doctor;
    return NextResponse.json(
      successResponse({
        id: doc.id,
        userId: userProfile.id,
        name: doc.name,
        email: userProfile.email,
        phone: userProfile.phone,
        specialty: doc.specialty,
        bio: doc.bio,
        qualifications: doc.qualifications,
        experience: doc.experience,
        language: doc.language,
        photoUrl: doc.photoUrl,
        fee: Number(doc.fee),
        departmentName: doc.department?.name,
        branchName: doc.department?.branch?.name,
        appointmentDurationMin: doc.appointmentDurationMin,
      })
    );
  } catch (error) {
    console.error("Get doctor profile error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "Failed to retrieve doctor profile"),
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

    if (session.role !== "DOCTOR") {
      return NextResponse.json(
        errorResponse("FORBIDDEN", "Only doctors can update their doctor profile"),
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

    const parse = UpdateDoctorProfileSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", parse.error.issues[0]?.message || "Invalid doctor profile data"),
        { status: 422 }
      );
    }

    const result = await AuthService.updateDoctorProfile(session.userId, parse.data);

    if (!result.success) {
      return NextResponse.json(
        errorResponse(result.error?.code || "UPDATE_FAILED", result.error?.message || "Failed to update doctor profile"),
        { status: 400 }
      );
    }

    return NextResponse.json(
      successResponse(result.data, { message: "Doctor profile updated successfully" })
    );
  } catch (error) {
    console.error("Update doctor profile error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "Failed to update doctor profile"),
      { status: 500 }
    );
  }
}
