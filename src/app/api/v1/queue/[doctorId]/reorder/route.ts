import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { QueueService } from "@/lib/services/QueueService";
import { ReorderQueueSchema } from "@/lib/validation/queue";
import { errorResponse, successResponse, safeParseJson } from "@/lib/utils";

export async function POST(
  request: Request,
  props: { params: Promise<{ doctorId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        errorResponse("UNAUTHENTICATED", "Please sign in to reorder queue"),
        { status: 401 }
      );
    }

    if (session.role !== "ADMIN" && session.role !== "DOCTOR") {
      return NextResponse.json(
        errorResponse("FORBIDDEN", "Only staff can reorder queue"),
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
    const parsed = ReorderQueueSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", parsed.error.issues[0]?.message || "Invalid reorder payload"),
        { status: 422 }
      );
    }

    const params = await props.params;
    const result = await QueueService.reorderQueue(
      params.doctorId,
      parsed.data.appointmentId,
      parsed.data.targetPosition,
      session.userId,
      parsed.data.reason
    );

    if (!result.success) {
      return NextResponse.json(
        errorResponse("REORDER_FAILED", result.error || "Failed to reorder queue"),
        { status: 400 }
      );
    }

    return NextResponse.json(
      successResponse({ reordered: true }, { message: "Queue position successfully updated" })
    );
  } catch (error) {
    console.error("Reorder queue error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "Failed to reorder queue"),
      { status: 500 }
    );
  }
}
