import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { RescheduleAppointmentSchema, CancelAppointmentSchema } from "@/lib/validation/appointment";
import { AppointmentService } from "@/lib/services/AppointmentService";
import { errorResponse, successResponse, safeParseJson } from "@/lib/utils";

export async function GET(
  _request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        errorResponse("UNAUTHENTICATED", "Please sign in to view appointment"),
        { status: 401 }
      );
    }

    const params = await props.params;
    const result = await AppointmentService.getAppointmentById(
      params.id,
      session.userId
    );

    if (!result.success) {
      if (result.error?.code === "NOT_FOUND") {
        return NextResponse.json(
          errorResponse("NOT_FOUND", result.error.message),
          { status: 404 }
        );
      }
      if (result.error?.code === "FORBIDDEN") {
        return NextResponse.json(
          errorResponse("FORBIDDEN", result.error.message),
          { status: 403 }
        );
      }
      return NextResponse.json(
        errorResponse(result.error?.code || "SERVER_ERROR", result.error?.message || "Failed to fetch appointment"),
        { status: 500 }
      );
    }

    return NextResponse.json(successResponse(result.appointment));
  } catch (error) {
    console.error("Get appointment API error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "Failed to fetch appointment"),
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        errorResponse("UNAUTHENTICATED", "Please sign in to update appointment"),
        { status: 401 }
      );
    }

    const params = await props.params;
    const body = await safeParseJson<{ action?: string } & Record<string, unknown>>(request);
    if (!body) {
      return NextResponse.json(
        errorResponse("INVALID_JSON", "Malformed or empty JSON request body"),
        { status: 400 }
      );
    }

    // Check if cancellation
    if (body.action === "cancel") {
      const cancelParse = CancelAppointmentSchema.safeParse(body);
      if (!cancelParse.success) {
        return NextResponse.json(
          errorResponse("VALIDATION_ERROR", cancelParse.error.issues[0]?.message || "Cancellation reason is required"),
          { status: 422 }
        );
      }

      const result = await AppointmentService.cancelAppointment(
        params.id,
        session.userId,
        cancelParse.data
      );

      if (!result.success) {
        return NextResponse.json(
          errorResponse(result.error?.code || "CANCEL_FAILED", result.error?.message || "Failed to cancel appointment"),
          { status: 400 }
        );
      }

      return NextResponse.json(
        successResponse({ cancelled: true }, { message: "Appointment has been cancelled." })
      );
    }

    // Otherwise reschedule
    const rescheduleParse = RescheduleAppointmentSchema.safeParse(body);
    if (!rescheduleParse.success) {
      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", "Invalid reschedule date or time format"),
        { status: 422 }
      );
    }

    const result = await AppointmentService.rescheduleAppointment(
      params.id,
      session.userId,
      rescheduleParse.data
    );

    if (!result.success || !result.appointment) {
      const status = result.error?.code === "SLOT_UNAVAILABLE" ? 409 : 400;
      return NextResponse.json(
        errorResponse(result.error?.code || "RESCHEDULE_FAILED", result.error?.message || "Failed to reschedule"),
        { status }
      );
    }

    return NextResponse.json(
      successResponse(result.appointment, { message: "Appointment successfully rescheduled." })
    );
  } catch (error) {
    console.error("Update appointment API error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "Failed to update appointment"),
      { status: 500 }
    );
  }
}
