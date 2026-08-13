import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { CheckInService } from "@/lib/services/CheckInService";
import { errorResponse, successResponse } from "@/lib/utils";

async function handleReminders(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      const session = await getSession();
      if (!session) {
        return NextResponse.json(
          errorResponse("UNAUTHENTICATED", "Please sign in or provide a valid authorization header to trigger reminders"),
          { status: 401 }
        );
      }

      if (session.role !== "ADMIN" && session.role !== "DOCTOR") {
        return NextResponse.json(
          errorResponse("FORBIDDEN", "Only hospital staff can trigger appointment reminders"),
          { status: 403 }
        );
      }
    }

    const result = await CheckInService.sendDueReminders();

    return NextResponse.json(
      successResponse(result, {
        message: `Reminder dispatch completed: ${result.sent24h} (24h window) and ${result.sent1h} (1h window) reminders dispatched.`,
      })
    );
  } catch (error) {
    console.error("Send reminders API error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "An error occurred during reminder dispatch"),
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return handleReminders(request);
}

export async function GET(request: Request) {
  return handleReminders(request);
}
