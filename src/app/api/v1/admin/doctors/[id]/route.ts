import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { AdminService } from "@/lib/services/AdminService";
import { UpdateDoctorAdminSchema } from "@/lib/validation/admin";
import { errorResponse, successResponse } from "@/lib/utils";

export async function PUT(
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
    const body = await request.json();
    const parseResult = UpdateDoctorAdminSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", parseResult.error.issues[0]?.message || "Invalid update data"),
        { status: 422 }
      );
    }

    const result = await AdminService.updateDoctor(params.id, parseResult.data);

    if (!result.success) {
      return NextResponse.json(
        errorResponse("UPDATE_FAILED", result.error || "Failed to update doctor"),
        { status: 400 }
      );
    }

    return NextResponse.json(
      successResponse({ updated: true }, { message: "Doctor profile updated successfully." })
    );
  } catch (error) {
    console.error("Admin update doctor API error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "Failed to update doctor profile"),
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    const { searchParams } = new URL(request.url);
    const resolution = (searchParams.get("resolution") as "CANCEL_APPOINTMENTS" | "REASSIGN") || "CANCEL_APPOINTMENTS";
    const reassignDoctorId = searchParams.get("reassignDoctorId") || undefined;

    const result = await AdminService.deleteDoctor(
      params.id,
      resolution,
      reassignDoctorId
    );

    if (!result.success) {
      return NextResponse.json(
        errorResponse("DELETE_FAILED", result.error || "Failed to remove doctor"),
        { status: 400 }
      );
    }

    return NextResponse.json(
      successResponse(
        { affectedAppointments: result.affectedAppointmentsCount },
        { message: `Doctor removed. ${result.affectedAppointmentsCount || 0} upcoming appointments handled.` }
      )
    );
  } catch (error) {
    console.error("Admin delete doctor API error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "Failed to remove doctor"),
      { status: 500 }
    );
  }
}
