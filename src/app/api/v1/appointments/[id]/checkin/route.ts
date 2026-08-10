import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { CheckInService } from "@/lib/services/CheckInService";
import { CheckInAppointmentSchema } from "@/lib/validation/appointment";
import { errorResponse, successResponse } from "@/lib/utils";

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        errorResponse("UNAUTHENTICATED", "Please sign in to check in"),
        { status: 401 }
      );
    }

    let forceByStaff = false;
    try {
      const body = await request.json();
      const parsed = CheckInAppointmentSchema.safeParse(body);
      if (parsed.success && parsed.data.forceByStaff) {
        forceByStaff = true;
      }
    } catch {
      // Empty body is valid for simple POST
    }

    const params = await props.params;
    const result = await CheckInService.checkInPatient(params.id, session.userId, {
      forceByStaff,
    });

    if (!result.success) {
      if (result.error === "You can only check in for your own appointment.") {
        return NextResponse.json(
          errorResponse("FORBIDDEN", result.error),
          { status: 403 }
        );
      }

      if (result.error === "Appointment not found.") {
        return NextResponse.json(
          errorResponse("NOT_FOUND", result.error),
          { status: 404 }
        );
      }

      return NextResponse.json(
        errorResponse("CHECKIN_FAILED", result.error || "Failed to check in"),
        { status: 400 }
      );
    }

    return NextResponse.json(
      successResponse(
        {
          checkedIn: true,
          checkedInAt: result.checkedInAt,
          isLate: result.isLate,
        },
        {
          message: result.isLate
            ? "Checked in during grace period. You have been added to the doctor's waiting queue."
            : "Successfully checked in! You are now in the active waiting queue.",
        }
      )
    );
  } catch (error) {
    console.error("Check-in API error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "An error occurred during check-in"),
      { status: 500 }
    );
  }
}

