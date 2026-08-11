import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { BookAppointmentSchema } from "@/lib/validation/appointment";
import { AppointmentService } from "@/lib/services/AppointmentService";
import { errorResponse, successResponse } from "@/lib/utils";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        errorResponse("UNAUTHENTICATED", "Please sign in to view appointments"),
        { status: 401 }
      );
    }

    const data = await AppointmentService.getPatientAppointments(session.userId);
    return NextResponse.json(successResponse(data));
  } catch (error) {
    console.error("Appointments list API error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "Failed to retrieve appointments"),
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        errorResponse("UNAUTHENTICATED", "Please sign in to book an appointment"),
        { status: 401 }
      );
    }

    const body = await request.json();
    const parseResult = BookAppointmentSchema.safeParse(body);

    if (!parseResult.success) {
      const fieldErrors: Record<string, string[]> = {};
      parseResult.error.issues.forEach((err) => {
        const path = err.path.join(".");
        if (!fieldErrors[path]) fieldErrors[path] = [];
        fieldErrors[path].push(err.message);
      });

      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", "Invalid appointment booking data", fieldErrors),
        { status: 422 }
      );
    }

    const result = await AppointmentService.createAppointment(
      session.userId,
      parseResult.data
    );

    if (!result.success || !result.appointment) {
      const status =
        result.error?.code === "SLOT_UNAVAILABLE"
          ? 409
          : result.error?.code === "SERVICE_UNAVAILABLE"
          ? 503
          : 400;
      return NextResponse.json(
        errorResponse(
          result.error?.code || "BOOKING_FAILED",
          result.error?.message || "Could not complete appointment booking"
        ),
        { status }
      );
    }

    return NextResponse.json(
      successResponse(result.appointment, {
        message: "Appointment booked successfully! Token confirmed.",
      }),
      { status: 201 }
    );
  } catch (error) {
    console.error("Book appointment API error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "An unexpected error occurred while booking"),
      { status: 500 }
    );
  }
}
