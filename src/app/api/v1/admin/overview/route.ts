import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { AdminService } from "@/lib/services/AdminService";
import { errorResponse, successResponse } from "@/lib/utils";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json(
        errorResponse("FORBIDDEN", "Admin privileges required to access overview"),
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get("branchId") || undefined;

    const data = await AdminService.getAdminOverview(branchId);
    return NextResponse.json(successResponse(data));
  } catch (error) {
    console.error("Admin overview API error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "Failed to retrieve admin overview metrics"),
      { status: 500 }
    );
  }
}
