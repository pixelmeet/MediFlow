import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { QueueService } from "@/lib/services/QueueService";
import { errorResponse, successResponse } from "@/lib/utils";

export async function POST(
  _request: Request,
  props: { params: Promise<{ doctorId: string }> }
) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "DOCTOR" && session.role !== "ADMIN")) {
      return NextResponse.json(
        errorResponse("FORBIDDEN", "Only doctor or hospital admin can call next patient"),
        { status: 403 }
      );
    }

    const params = await props.params;
    const result = await QueueService.callNextPatient(params.doctorId);

    if (!result.success || !result.calledToken) {
      return NextResponse.json(
        errorResponse("CALL_NEXT_FAILED", result.error || "No waiting patients available"),
        { status: 400 }
      );
    }

    return NextResponse.json(
      successResponse(result.calledToken, { message: `Called patient ${result.calledToken.patientName} (Token ${result.calledToken.tokenNumber})` })
    );
  } catch (error) {
    console.error("Call next API error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "Failed to advance queue"),
      { status: 500 }
    );
  }
}
