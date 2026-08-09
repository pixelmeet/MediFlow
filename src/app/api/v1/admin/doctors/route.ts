import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { AdminService } from "@/lib/services/AdminService";
import { CreateDoctorAdminSchema } from "@/lib/validation/admin";
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
    const search = searchParams.get("search") || undefined;
    const departmentId = searchParams.get("departmentId") || undefined;
    const branchId = searchParams.get("branchId") || undefined;

    const doctors = await AdminService.listDoctors({ search, departmentId, branchId });
    return NextResponse.json(successResponse(doctors));
  } catch (error) {
    console.error("Admin list doctors API error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "Failed to retrieve doctors list"),
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
    const parseResult = CreateDoctorAdminSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", parseResult.error.issues[0]?.message || "Invalid doctor payload"),
        { status: 422 }
      );
    }

    const result = await AdminService.createDoctor(parseResult.data);

    if (!result.success) {
      return NextResponse.json(
        errorResponse("CREATE_FAILED", result.error || "Failed to create doctor"),
        { status: 400 }
      );
    }

    return NextResponse.json(
      successResponse(
        { doctorId: result.doctorId },
        { message: "Doctor registered successfully with default schedule." }
      ),
      { status: 201 }
    );
  } catch (error) {
    console.error("Admin create doctor API error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "Failed to register doctor"),
      { status: 500 }
    );
  }
}
