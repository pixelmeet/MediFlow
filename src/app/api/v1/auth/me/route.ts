import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { AuthService } from "@/lib/services/AuthService";
import { errorResponse, successResponse } from "@/lib/utils";

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        errorResponse("UNAUTHENTICATED", "No active session found"),
        { status: 401 }
      );
    }

    const userProfile = await AuthService.getUserProfile(session.userId);

    if (!userProfile) {
      return NextResponse.json(
        errorResponse("USER_NOT_FOUND", "User profile not found"),
        { status: 404 }
      );
    }

    return NextResponse.json(
      successResponse({
        ...userProfile,
        displayName:
          userProfile.patient?.name ||
          userProfile.doctor?.name ||
          userProfile.admin?.name ||
          "User",
      })
    );
  } catch (error) {
    console.error("Auth Me API error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "Failed to retrieve session details"),
      { status: 500 }
    );
  }
}
