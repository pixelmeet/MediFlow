import { describe, it, expect } from "vitest";
import { QueueService, queueEventBus } from "@/lib/services/QueueService";

describe("Queue Management & State Transitions", () => {
  it("should update doctor cabin status and delay minutes", () => {
    const doctorId = "doc_patel_01";
    const update = QueueService.setDoctorStatus(doctorId, "DELAYED", 15);
    expect(update.status).toBe("DELAYED");
    expect(update.delayMinutes).toBe(15);

    const check = QueueService.getDoctorStatus(doctorId);
    expect(check.status).toBe("DELAYED");
    expect(check.delayMinutes).toBe(15);
  });

  it("should broadcast queue events via queueEventBus", () => {
    let receivedPayload: unknown = null;
    const testDoctorId = "doc_test_123";
    const listener = (payload: unknown) => {
      receivedPayload = payload;
    };

    queueEventBus.on(`queue:${testDoctorId}`, listener);
    queueEventBus.broadcast(testDoctorId, "call_next", { tokenNumber: "A-01" });
    queueEventBus.off(`queue:${testDoctorId}`, listener);

    expect(receivedPayload).toBeDefined();
    expect((receivedPayload as { type: string }).type).toBe("call_next");
  });
});
