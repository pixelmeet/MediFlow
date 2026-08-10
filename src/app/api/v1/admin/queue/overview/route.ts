import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { QueueService } from "@/lib/services/QueueService";
import { errorResponse, successResponse } from "@/lib/utils";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        errorResponse("UNAUTHENTICATED", "Please sign in to view queue monitor"),
        { status: 401 }
      );
    }

    if (session.role !== "ADMIN" && session.role !== "DOCTOR") {
      return NextResponse.json(
        errorResponse("FORBIDDEN", "Staff access required for live queue monitor"),
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get("branchId") || undefined;

    const overview = await QueueService.getHospitalQueueOverview(branchId);
    return NextResponse.json(successResponse(overview));
  } catch (error) {
    console.error("Queue overview error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "Failed to retrieve hospital queue overview"),
      { status: 500 }
    );
  }
}
