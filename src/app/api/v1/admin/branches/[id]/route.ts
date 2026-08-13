import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { AdminService } from "@/lib/services/AdminService";
import { UpdateBranchAdminSchema } from "@/lib/validation/admin";
import { errorResponse, successResponse, safeParseJson } from "@/lib/utils";

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
    const body = await safeParseJson(request);
    if (!body) {
      return NextResponse.json(
        errorResponse("INVALID_JSON", "Malformed or empty JSON request body"),
        { status: 400 }
      );
    }
    const parseResult = UpdateBranchAdminSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", parseResult.error.issues[0]?.message || "Invalid update data"),
        { status: 422 }
      );
    }

    const result = await AdminService.updateBranch(params.id, parseResult.data);

    if (!result.success) {
      return NextResponse.json(
        errorResponse("UPDATE_FAILED", result.error || "Failed to update branch"),
        { status: 400 }
      );
    }

    return NextResponse.json(
      successResponse({ updated: true }, { message: "Branch updated successfully." })
    );
  } catch (error) {
    console.error("Admin update branch API error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "Failed to update branch"),
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
    const result = await AdminService.deleteBranch(params.id);

    if (!result.success) {
      if (result.conflict) {
        return NextResponse.json(
          errorResponse(
            "CONFLICT",
            result.error || "Branch has active linked entities",
            {
              departmentsCount: [`${result.details?.departmentsCount || 0}`],
              doctorsCount: [`${result.details?.doctorsCount || 0}`],
              activeAppointmentsCount: [`${result.details?.activeAppointmentsCount || 0}`],
            }
          ),
          { status: 409 }
        );
      }
      return NextResponse.json(
        errorResponse("DELETE_FAILED", result.error || "Failed to remove branch"),
        { status: 400 }
      );
    }

    return NextResponse.json(
      successResponse(
        { deleted: true },
        { message: "Branch deactivated successfully." }
      )
    );
  } catch (error) {
    console.error("Admin delete branch API error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "Failed to remove branch"),
      { status: 500 }
    );
  }
}
