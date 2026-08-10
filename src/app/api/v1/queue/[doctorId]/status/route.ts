import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { QueueService } from "@/lib/services/QueueService";
import { SetDoctorStatusSchema } from "@/lib/validation/queue";
import { errorResponse, successResponse } from "@/lib/utils";

export async function POST(
  request: Request,
  props: { params: Promise<{ doctorId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        errorResponse("UNAUTHENTICATED", "Please sign in to update doctor status"),
        { status: 401 }
      );
    }

    if (session.role !== "DOCTOR" && session.role !== "ADMIN") {
      return NextResponse.json(
        errorResponse("FORBIDDEN", "Only clinical staff can update cabin status"),
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = SetDoctorStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", parsed.error.issues[0]?.message || "Invalid status data"),
        { status: 422 }
      );
    }

    const params = await props.params;
    const updated = QueueService.setDoctorStatus(
      params.doctorId,
      parsed.data.status,
      parsed.data.delayMinutes || 0,
      parsed.data.note
    );

    return NextResponse.json(
      successResponse(updated, { message: `Doctor status updated to ${parsed.data.status}` })
    );
  } catch (error) {
    console.error("Set doctor status error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "Failed to update doctor status"),
      { status: 500 }
    );
  }
}
