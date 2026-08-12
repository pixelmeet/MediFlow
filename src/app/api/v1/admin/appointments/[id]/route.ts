import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { AdminService } from "@/lib/services/AdminService";
import { AppointmentOverrideSchema } from "@/lib/validation/admin";
import { errorResponse, successResponse, safeParseJson } from "@/lib/utils";

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json(
        errorResponse("FORBIDDEN", "Admin privileges required"),
        { status: 403 }
      );
    }

    const params = await props.params;
    const body = await safeParseJson(request);
    if (!body) {
      return NextResponse.json(
        errorResponse("INVALID_JSON", "Malformed or empty JSON request body"),
        { status: 400 }
      );
    }
    const parseResult = AppointmentOverrideSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", parseResult.error.issues[0]?.message || "Invalid override payload"),
        { status: 422 }
      );
    }

    const result = await AdminService.overrideAppointment(
      params.id,
      parseResult.data
    );

    if (!result.success) {
      return NextResponse.json(
        errorResponse("OVERRIDE_FAILED", result.error || "Failed to override appointment"),
        { status: 400 }
      );
    }

    return NextResponse.json(
      successResponse({ overridden: true }, { message: "Appointment updated and logged successfully." })
    );
  } catch (error) {
    console.error("Admin appointment override API error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "Failed to override appointment"),
      { status: 500 }
    );
  }
}
