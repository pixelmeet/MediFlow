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
    const history = await ConsultationService.getPatientHistory(params.id);

    return NextResponse.json(successResponse(history));
  } catch (error) {
    console.error("Patient history API error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "Failed to retrieve patient medical history"),
      { status: 500 }
    );
  }
}
