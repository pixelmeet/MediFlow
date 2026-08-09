import { NextResponse } from "next/server";
import { SchedulingService } from "@/lib/services/SchedulingService";
import { errorResponse, successResponse } from "@/lib/utils";

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || new Date().toISOString().slice(0, 10);

    const slotGrid = await SchedulingService.generateSlots(params.id, date);

    return NextResponse.json(successResponse(slotGrid));
  } catch (error) {
    console.error("Availability API error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "Failed to compute doctor availability slots"),
      { status: 500 }
    );
  }
}
