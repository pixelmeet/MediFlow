import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { AnalyticsService } from "@/lib/services/AnalyticsService";
import { errorResponse, successResponse } from "@/lib/utils";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        errorResponse("UNAUTHENTICATED", "Please sign in to view analytics"),
        { status: 401 }
      );
    }

    if (session.role !== "ADMIN") {
      return NextResponse.json(
        errorResponse("FORBIDDEN", "Admin authorization required to view hospital analytics"),
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const range = (searchParams.get("range") || "7days") as "today" | "7days" | "30days" | "all";
    const branchId = searchParams.get("branchId") || undefined;
    const departmentId = searchParams.get("departmentId") || undefined;

    const result = await AnalyticsService.getHospitalAnalytics(range, branchId, departmentId);

    if (!result.success) {
      return NextResponse.json(
        errorResponse("SERVER_ERROR", result.error || "Failed to load analytics"),
        { status: 500 }
      );
    }

    return NextResponse.json(successResponse(result.data));
  } catch (error) {
    console.error("Admin Analytics API error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "Failed to retrieve analytics"),
      { status: 500 }
    );
  }
}
