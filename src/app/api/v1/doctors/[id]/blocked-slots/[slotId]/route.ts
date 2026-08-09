import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { SchedulingService } from "@/lib/services/SchedulingService";
import { prisma } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/utils";

export async function DELETE(
  _request: Request,
  props: { params: Promise<{ id: string; slotId: string }> }
) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "DOCTOR" && session.role !== "ADMIN")) {
      return NextResponse.json(
        errorResponse("FORBIDDEN", "Only doctor or hospital admin can unblock slots"),
        { status: 403 }
      );
    }

    const params = await props.params;

    if (session.role === "DOCTOR") {
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

    const result = await SchedulingService.deleteBlockedSlot(params.id, params.slotId);

    if (!result.success) {
      return NextResponse.json(
        errorResponse("DELETE_FAILED", result.error || "Failed to remove blocked slot"),
        { status: 400 }
      );
    }

    return NextResponse.json(
      successResponse({ deleted: true }, { message: "Blocked slot removed successfully." })
    );
  } catch (error) {
    console.error("Delete blocked slot API error:", error);
    return NextResponse.json(
      errorResponse("SERVER_ERROR", "Failed to remove blocked slot"),
      { status: 500 }
    );
  }
}
