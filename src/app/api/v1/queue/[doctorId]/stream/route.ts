import { QueueService, queueEventBus } from "@/lib/services/QueueService";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  props: { params: Promise<{ doctorId: string }> }
) {
  const params = await props.params;
  const doctorId = params.doctorId;
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
