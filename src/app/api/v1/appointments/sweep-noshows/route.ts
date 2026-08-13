import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { CheckInService } from "@/lib/services/CheckInService";
import { SweepNoShowsSchema } from "@/lib/validation/appointment";
import { errorResponse, successResponse } from "@/lib/utils";

async function handleSweep(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    let actorUserId: string;

    if (cronSecret && authHeader && authHeader === `Bearer ${cronSecret}`) {
      actorUserId = "system:cron";
    } else {
      const session = await getSession();
      if (!session) {
        return NextResponse.json(
          errorResponse("UNAUTHENTICATED", "Please sign in or provide a valid authorization header to perform no-show sweep"),
          { status: 401 }
        );
      }

      if (session.role !== "ADMIN" && session.role !== "DOCTOR") {
        return NextResponse.json(
          errorResponse("FORBIDDEN", "Only hospital staff can trigger no-show sweeps"),
          { status: 403 }
        );
      }

      actorUserId = session.userId;
    }

    let branchId: string | undefined;
    let dateStr: string | undefined;

    if (request.method === "POST") {
      try {
        const body = await request.json();
        const parsed = SweepNoShowsSchema.safeParse(body);
        if (parsed.success) {
          branchId = parsed.data.branchId;
          dateStr = parsed.data.date;
        }
      } catch {
        // Empty or non-JSON body is valid
      }
    } else if (request.method === "GET") {
      try {
        const url = new URL(request.url);
        const qBranchId = url.searchParams.get("branchId") || undefined;
        const qDate = url.searchParams.get("date") || undefined;
        const parsed = SweepNoShowsSchema.safeParse({ branchId: qBranchId, date: qDate });
        if (parsed.success) {
          branchId = parsed.data.branchId;
          dateStr = parsed.data.date;
        }
      } catch {
        // Fallback to defaults
      }
    }

    const result = await CheckInService.sweepNoShows({
      branchId,
      dateStr,
      actorUserId,
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

export async function POST(request: Request) {
  return handleSweep(request);
}

export async function GET(request: Request) {
  return handleSweep(request);
}
