import { NextResponse } from "next/server";
import { QueueService } from "@/lib/services/QueueService";
import { errorResponse, successResponse } from "@/lib/utils";

export async function GET(
  request: Request,
  props: { params: Promise<{ doctorId: string }> }
) {
  try {
    const params = await props.params;
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || new Date().toISOString().slice(0, 10);

    const snapshot = await QueueService.getQueueSnapshot(params.doctorId, date);
    return NextResponse.json(successResponse(snapshot));
  } catch (error) {
    console.error("Queue API error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "Failed to retrieve queue status"),
      { status: 500 }
    );
  }
}
