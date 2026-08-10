import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { ConsultationService } from "@/lib/services/ConsultationService";
import { errorResponse, successResponse } from "@/lib/utils";

export async function GET(
  _request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        errorResponse("UNAUTHENTICATED", "Sign in required to view medical history"),
        { status: 401 }
      );
    }

    const params = await props.params;
    const result = await ConsultationService.getPatientHistory(
      params.id,
      session.userId,
      session.role
    );

    if (!result.success) {
      if (result.error === "FORBIDDEN") {
        return NextResponse.json(
          errorResponse("FORBIDDEN", result.message || "You do not have permission to view this patient's medical history"),
          { status: 403 }
        );
      }

      if (result.error === "NOT_FOUND") {
        return NextResponse.json(
          errorResponse("NOT_FOUND", result.message || "Patient not found"),
          { status: 404 }
        );
      }

      return NextResponse.json(
        errorResponse("SERVER_ERROR", result.message || "Failed to retrieve patient medical history"),
        { status: 500 }
      );
    }

    return NextResponse.json(successResponse(result.data));
  } catch (error) {
    console.error("Patient history API error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "Failed to retrieve patient medical history"),
      { status: 500 }
    );
  }
}
