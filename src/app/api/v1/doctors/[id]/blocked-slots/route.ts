import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { SchedulingService } from "@/lib/services/SchedulingService";
import { CreateBlockedSlotSchema } from "@/lib/validation/schedule";
import { prisma } from "@/lib/db";
import { errorResponse, successResponse, safeParseJson } from "@/lib/utils";

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        errorResponse("UNAUTHENTICATED", "Please sign in to manage schedule"),
        { status: 401 }
      );
    }

    const params = await props.params;

    if (session.role !== "ADMIN") {
      const doctor = await prisma.doctor.findUnique({
        where: { id: params.id },
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
          errorResponse("FORBIDDEN", "You can only manage your own schedule"),
          { status: 403 }
        );
      }
    }

    const body = await safeParseJson(request);
    if (!body) {
      return NextResponse.json(
        errorResponse("INVALID_JSON", "Malformed or empty JSON request body"),
        { status: 400 }
      );
    }
    const parseResult = CreateBlockedSlotSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", parseResult.error.issues[0]?.message || "Invalid blocked slot data"),
        { status: 422 }
      );
    }

    const result = await SchedulingService.addBlockedSlot(params.id, parseResult.data);

    if (!result.success || !result.blockedSlot) {
      return NextResponse.json(
        errorResponse("CREATE_FAILED", result.error || "Failed to create blocked slot"),
        { status: 400 }
      );
    }

    return NextResponse.json(
      successResponse(result.blockedSlot, {
        conflictCount: result.conflictCount || 0,
        message:
          result.conflictCount && result.conflictCount > 0
            ? `Blocked slot added. Note: ${result.conflictCount} appointment(s) already exist on this date/time.`
            : "Blocked slot added successfully.",
      }),
      { status: 201 }
    );
  } catch (error) {
    console.error("Create blocked slot API error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "Failed to block slot"),
      { status: 500 }
    );
  }
}
