import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { QueueService } from "@/lib/services/QueueService";
import { errorResponse, successResponse } from "@/lib/utils";

export async function POST(
  _request: Request,
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

    const params = await props.params;
    const result = await QueueService.checkInPatient(params.id, session.userId);

    if (!result.success) {
      if (result.error === "You can only check in your own appointment.") {
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
      successResponse({ checkedIn: true }, { message: "Successfully checked in! You are now in the active queue." })
    );
  } catch (error) {
    console.error("Check-in API error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "An error occurred during check-in"),
      { status: 500 }
    );
  }
}
