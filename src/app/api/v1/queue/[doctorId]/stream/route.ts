import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { QueueService, queueEventBus } from "@/lib/services/QueueService";
import { prisma } from "@/lib/db";
import { ALLOW_MEMORY_FALLBACK } from "@/lib/auth/config";
import { errorResponse } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  props: { params: Promise<{ doctorId: string }> }
) {
  const params = await props.params;
  const doctorId = params.doctorId;

  // ── Auth guard — must be done before stream opens ──────────────────
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      errorResponse("UNAUTHENTICATED", "Please sign in to access the queue stream"),
      { status: 401 }
    );
  }

  if (session.role !== "DOCTOR" && session.role !== "ADMIN") {
    return NextResponse.json(
      errorResponse("FORBIDDEN", "Only clinical staff can access the queue stream"),
      { status: 403 }
    );
  }

  // DOCTOR role: verify they own this queue
  if (session.role === "DOCTOR") {
    try {
      const doctor = await prisma.doctor.findUnique({
        where: { id: doctorId },
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
          errorResponse("FORBIDDEN", "You can only stream your own patient queue."),
          { status: 403 }
        );
      }
    } catch (dbError) {
      console.error("Database error in stream auth doctor lookup:", dbError);
      if (!ALLOW_MEMORY_FALLBACK) {
        return NextResponse.json(
          errorResponse("SERVICE_UNAVAILABLE", "Database is unavailable. Please try again."),
          { status: 503 }
        );
      }
    }
  }
  // ── End auth guard ─────────────────────────────────────────────────

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // 1. Send initial authoritative snapshot
      try {
        const initialSnapshot = await QueueService.getQueueSnapshot(doctorId);
        controller.enqueue(
          encoder.encode(`event: initial\ndata: ${JSON.stringify(initialSnapshot)}\n\n`)
        );
      } catch (err) {
        console.error("Error sending initial queue snapshot:", err);
      }

      // 2. Subscribe to live queue events for this doctor
      const onQueueEvent = (payload: { type?: string; data?: unknown }) => {
        try {
          controller.enqueue(
            encoder.encode(`event: ${payload.type || "queue_diff"}\ndata: ${JSON.stringify(payload.data || payload)}\n\n`)
          );
        } catch {
          // Stream might be closed
        }
      };

      const eventKey = `queue:${doctorId}`;
      queueEventBus.on(eventKey, onQueueEvent);

      // 3. Heartbeat every 15s to keep SSE connection alive
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(
            encoder.encode(`event: ping\ndata: ${JSON.stringify({ time: new Date().toISOString() })}\n\n`)
          );
        } catch {
          clearInterval(heartbeatInterval);
        }
      }, 15000);

      // 4. Handle client disconnection cleanup
      request.signal.addEventListener("abort", () => {
        queueEventBus.off(eventKey, onQueueEvent);
        clearInterval(heartbeatInterval);
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

