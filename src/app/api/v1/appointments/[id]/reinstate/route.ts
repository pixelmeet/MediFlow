import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { CheckInService } from "@/lib/services/CheckInService";
import { ReinstateAppointmentSchema } from "@/lib/validation/appointment";
import { errorResponse, successResponse } from "@/lib/utils";

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        errorResponse("UNAUTHENTICATED", "Please sign in to perform administrative actions"),
        { status: 401 }
      );
    }

    if (session.role !== "ADMIN" && session.role !== "DOCTOR") {
      return NextResponse.json(
        errorResponse("FORBIDDEN", "Only reception or hospital staff can reinstate a No-Show patient"),
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = ReinstateAppointmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", parsed.error.issues[0]?.message || "Invalid reason supplied"),
        { status: 422 }
      );
    }

    const params = await props.params;
    const result = await CheckInService.reinstateNoShow(
      params.id,
      session.userId,
      parsed.data.reason
    );

    if (!result.success) {
      return NextResponse.json(
        errorResponse("REINSTATE_FAILED", result.error || "Could not reinstate appointment"),
        { status: 400 }
      );
    }

    return NextResponse.json(
      successResponse(
        { reinstated: true, appointmentId: params.id },
        { message: "Patient has been reinstated and added back into the active waiting queue." }
      )
    );
  } catch (error) {
    console.error("Reinstate API error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "An error occurred while reinstating appointment"),
      { status: 500 }
    );
  }
}
