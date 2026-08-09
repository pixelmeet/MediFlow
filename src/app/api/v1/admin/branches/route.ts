import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { AdminService } from "@/lib/services/AdminService";
import { errorResponse, successResponse } from "@/lib/utils";

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
