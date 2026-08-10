import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { CheckInService } from "@/lib/services/CheckInService";
import { SweepNoShowsSchema } from "@/lib/validation/appointment";
import { errorResponse, successResponse } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        errorResponse("UNAUTHENTICATED", "Please sign in to perform no-show sweep"),
        { status: 401 }
      );
    }

    if (session.role !== "ADMIN" && session.role !== "DOCTOR") {
      return NextResponse.json(
        errorResponse("FORBIDDEN", "Only hospital staff can trigger no-show sweeps"),
        { status: 403 }
      );
    }

    let branchId: string | undefined;
    let dateStr: string | undefined;

    try {
      const body = await request.json();
      const parsed = SweepNoShowsSchema.safeParse(body);
      if (parsed.success) {
        branchId = parsed.data.branchId;
        dateStr = parsed.data.date;
      }
    } catch {
      // Empty body is valid
    }

    const result = await CheckInService.sweepNoShows({
      branchId,
      dateStr,
      actorUserId: session.userId,
    });

    return NextResponse.json(
      successResponse(result, {
        message:
          result.sweptCount > 0
            ? `Sweep completed: ${result.sweptCount} overdue appointment${result.sweptCount === 1 ? "" : "s"} marked as No-Show.`
            : "Sweep completed: No overdue appointments found for no-show marking.",
      })
    );
  } catch (error) {
    console.error("Sweep no-shows API error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "An error occurred during no-show sweep"),
      { status: 500 }
    );
  }
}
