import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { AdminService } from "@/lib/services/AdminService";
import { BranchAdminSchema } from "@/lib/validation/admin";
import { errorResponse, successResponse, safeParseJson } from "@/lib/utils";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json(
        errorResponse("FORBIDDEN", "Admin privileges required"),
        { status: 403 }
      );
    }

    const branches = await AdminService.listBranches();
    return NextResponse.json(successResponse(branches));
  } catch (error) {
    console.error("Admin list branches API error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "Failed to retrieve branches"),
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

    const body = await safeParseJson(request);
    if (!body) {
      return NextResponse.json(
        errorResponse("INVALID_JSON", "Malformed or empty JSON request body"),
        { status: 400 }
      );
    }
    const parseResult = BranchAdminSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", parseResult.error.issues[0]?.message || "Invalid branch payload"),
        { status: 422 }
      );
    }

    const result = await AdminService.createBranch(parseResult.data);

    if (!result.success) {
      return NextResponse.json(
        errorResponse("CREATE_FAILED", result.error || "Failed to create branch"),
        { status: 400 }
      );
    }

    return NextResponse.json(
      successResponse(
        { branchId: result.branchId },
        { message: "Branch created successfully." }
      ),
      { status: 201 }
    );
  } catch (error) {
    console.error("Admin create branch API error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "Failed to create branch"),
      { status: 500 }
    );
  }
}
