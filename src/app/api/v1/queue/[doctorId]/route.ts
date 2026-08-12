import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { QueueService } from "@/lib/services/QueueService";
import { prisma } from "@/lib/db";
import { ALLOW_MEMORY_FALLBACK } from "@/lib/auth/config";
import { errorResponse, successResponse } from "@/lib/utils";

export async function GET(
  request: Request,
  props: { params: Promise<{ doctorId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        errorResponse("UNAUTHENTICATED", "Please sign in to view the queue"),
        { status: 401 }
      );
    }

    if (session.role !== "DOCTOR" && session.role !== "ADMIN") {
      return NextResponse.json(
        errorResponse("FORBIDDEN", "Only clinical staff can view the patient queue"),
        { status: 403 }
      );
    }

    const params = await props.params;

    // DOCTOR role: verify they own this queue (prevents cross-doctor data access)
    if (session.role === "DOCTOR") {
      try {
        const doctor = await prisma.doctor.findUnique({
          where: { id: params.doctorId },
          select: { userId: true },
        });

        if (!doctor) {
          return NextResponse.json(
            errorResponse("NOT_FOUND", "Doctor not found"),
            { status: 404 }
          );
        }

        if (doctor.userId !== session.userId) {
          return NextResponse.json(
            errorResponse("FORBIDDEN", "You can only view your own patient queue."),
            { status: 403 }
          );
        }
      } catch (dbError) {
        console.error("Database error in queue GET doctor lookup:", dbError);
        if (!ALLOW_MEMORY_FALLBACK) {
          return NextResponse.json(
            errorResponse("SERVICE_UNAVAILABLE", "Database is unavailable. Please try again."),
            { status: 503 }
          );
        }
      }
    }

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
