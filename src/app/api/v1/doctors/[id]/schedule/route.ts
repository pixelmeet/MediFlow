import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { SchedulingService } from "@/lib/services/SchedulingService";
import { UpdateScheduleSchema } from "@/lib/validation/schedule";
import { prisma } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/utils";

export async function GET(
  _request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const scheduleData = await SchedulingService.getDoctorSchedule(params.id);
    return NextResponse.json(successResponse(scheduleData));
  } catch (error) {
    console.error("Get doctor schedule API error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "Failed to retrieve doctor schedule"),
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "DOCTOR" && session.role !== "ADMIN")) {
      return NextResponse.json(
        errorResponse("FORBIDDEN", "Only the doctor or hospital admin can update schedule"),
        { status: 403 }
      );
    }

    const params = await props.params;

    // Verify ownership for DOCTOR role
    if (session.role === "DOCTOR") {
      const doctor = await prisma.doctor.findUnique({
        where: { id: params.id },
        select: { userId: true },
      });

      if (!doctor) {
        return NextResponse.json(
          errorResponse("NOT_FOUND", "Doctor not found"),
          { status: 404 }
        );
      }

      if (doctor.userId !== session.userId) {
        return NextResponse.json(
          errorResponse("FORBIDDEN", "You can only update your own schedule"),
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const parseResult = UpdateScheduleSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", "Invalid schedule format", {
          errors: parseResult.error.issues.map((i) => i.message),
        }),
        { status: 422 }
      );
    }

    const result = await SchedulingService.updateDoctorSchedule(params.id, parseResult.data);

    if (!result.success) {
      return NextResponse.json(
        errorResponse("UPDATE_FAILED", "Failed to update doctor schedule"),
        { status: 400 }
      );
    }

    return NextResponse.json(
      successResponse(
        { updated: true },
        { message: "Weekly schedule and appointment duration saved successfully." }
      )
    );
  } catch (error) {
    console.error("Update doctor schedule API error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "Failed to update doctor schedule"),
      { status: 500 }
    );
  }
}
