import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { AdminService } from "@/lib/services/AdminService";
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
    const date = searchParams.get("date") || undefined;
    const doctorId = searchParams.get("doctorId") || undefined;
    const branchId = searchParams.get("branchId") || undefined;
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;

    const appointments = await AdminService.listAllAppointments({
      date,
      doctorId,
      branchId,
      status,
      search,
    });

    return NextResponse.json(successResponse(appointments));
  } catch (error) {
    console.error("Admin list appointments API error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "Failed to retrieve appointments ledger"),
      { status: 500 }
    );
  }
}
