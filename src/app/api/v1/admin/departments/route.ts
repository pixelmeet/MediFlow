import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { AdminService } from "@/lib/services/AdminService";
import { DepartmentAdminSchema } from "@/lib/validation/admin";
import { errorResponse, successResponse } from "@/lib/utils";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json(
        errorResponse("FORBIDDEN", "Admin privileges required"),
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get("branchId") || undefined;

    const departments = await AdminService.listDepartments(branchId);
    return NextResponse.json(successResponse(departments));
  } catch (error) {
    console.error("Admin list departments API error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "Failed to retrieve departments"),
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json(
        errorResponse("FORBIDDEN", "Admin privileges required"),
        { status: 403 }
      );
    }

    const body = await request.json();
    const parseResult = DepartmentAdminSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", parseResult.error.issues[0]?.message || "Invalid department data"),
        { status: 422 }
      );
    }

    const result = await AdminService.createDepartment(parseResult.data);

    if (!result.success) {
      return NextResponse.json(
        errorResponse("CREATE_FAILED", result.error || "Failed to create department"),
        { status: 400 }
      );
    }

    return NextResponse.json(
      successResponse(result.department, { message: "Department created successfully." }),
      { status: 201 }
    );
  } catch (error) {
    console.error("Admin create department API error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "Failed to create department"),
      { status: 500 }
    );
  }
}
