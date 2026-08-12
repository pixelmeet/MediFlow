import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { PrescriptionService } from "@/lib/services/PrescriptionService";
import { errorResponse, successResponse } from "@/lib/utils";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        errorResponse("UNAUTHENTICATED", "Please sign in to view prescriptions"),
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 50;

    const result = await PrescriptionService.getPatientPrescriptions(session.userId, {
      search,
      limit,
    });

    if (!result.success) {
      return NextResponse.json(
        errorResponse("NOT_FOUND", result.error || "Failed to load prescriptions"),
        { status: 404 }
      );
    }

    return NextResponse.json(successResponse(result.data));
  } catch (error) {
    console.error("Patient prescriptions API error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "Failed to retrieve prescriptions"),
      { status: 500 }
    );
  }
}
