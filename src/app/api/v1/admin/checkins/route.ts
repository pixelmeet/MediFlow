import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { CheckInService } from "@/lib/services/CheckInService";
import { errorResponse, successResponse } from "@/lib/utils";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        errorResponse("UNAUTHENTICATED", "Please sign in as hospital staff"),
        { status: 401 }
      );
    }

    if (session.role !== "ADMIN" && session.role !== "DOCTOR") {
      return NextResponse.json(
        errorResponse("FORBIDDEN", "Staff access required for check-in ledger"),
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || undefined;
    const branchId = searchParams.get("branchId") || undefined;
    const search = searchParams.get("search") || undefined;
    const status = searchParams.get("status") || undefined;

    const items = await CheckInService.listCheckInDeskItems({
      date,
      branchId,
      search,
      status,
    });

    return NextResponse.json(successResponse(items));
  } catch (error) {
    console.error("Admin checkins API error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "An error occurred fetching check-in items"),
      { status: 500 }
    );
  }
}
