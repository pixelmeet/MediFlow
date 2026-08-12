import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { PrescriptionService } from "@/lib/services/PrescriptionService";
import { errorResponse, successResponse } from "@/lib/utils";

export async function GET(
  _request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        errorResponse("UNAUTHENTICATED", "Please sign in to view this prescription"),
        { status: 401 }
      );
    }

    const { id } = await props.params;
    const result = await PrescriptionService.getPrescriptionById(
      id,
      session.userId,
      session.role
    );

    if (!result.success) {
      if (result.error === "FORBIDDEN") {
        return NextResponse.json(
          errorResponse("FORBIDDEN", result.message || "Access denied"),
          { status: 403 }
        );
      }
      return NextResponse.json(
        errorResponse("NOT_FOUND", result.message || "Prescription not found"),
        { status: 404 }
      );
    }

    return NextResponse.json(successResponse(result.data));
  } catch (error) {
    console.error("Prescription detail API error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "Failed to retrieve prescription"),
      { status: 500 }
    );
  }
}
