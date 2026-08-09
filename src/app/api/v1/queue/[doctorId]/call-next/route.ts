import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { QueueService } from "@/lib/services/QueueService";
import { prisma } from "@/lib/db";
import { ALLOW_MEMORY_FALLBACK } from "@/lib/auth/config";
import { errorResponse, successResponse } from "@/lib/utils";

export async function POST(
  _request: Request,
  props: { params: Promise<{ doctorId: string }> }
) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "DOCTOR" && session.role !== "ADMIN")) {
      return NextResponse.json(
        errorResponse("FORBIDDEN", "Only doctor or hospital admin can call next patient"),
        { status: 403 }
      );
    }

    const params = await props.params;

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
            errorResponse("FORBIDDEN", "You can only manage your own patient queue."),
            { status: 403 }
          );
        }
      } catch (dbError) {
        console.error("Database error in call-next doctor lookup:", dbError);
        if (!ALLOW_MEMORY_FALLBACK) {
          return NextResponse.json(
            errorResponse("SERVICE_UNAVAILABLE", "Database is unavailable. Please try again."),
            { status: 503 }
          );
        }
      }
    }

    const result = await QueueService.callNextPatient(params.doctorId);

    if (!result.success || !result.calledToken) {
      return NextResponse.json(
        errorResponse("CALL_NEXT_FAILED", result.error || "No waiting patients available"),
        { status: 400 }
      );
    }

    return NextResponse.json(
      successResponse(result.calledToken, { message: `Called patient ${result.calledToken.patientName} (Token ${result.calledToken.tokenNumber})` })
    );
  } catch (error) {
    console.error("Call next API error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "Failed to advance queue"),
      { status: 500 }
    );
  }
}
