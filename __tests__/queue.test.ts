import { describe, it, expect } from "vitest";
import { QueueService } from "@/lib/services/QueueService";

describe("Queue Management & State Transitions", () => {
  it("should advance queue item to IN_PROGRESS when doctor calls next patient", async () => {
    const doctorId = "doc_patel_01";
    const result = await QueueService.callNextPatient(doctorId);

    if (result.success && result.calledToken) {
      expect(result.calledToken.status).toBe("IN_PROGRESS");
      expect(result.calledToken.calledAt).toBeDefined();
    }
  });

  it("should update doctor cabin status and delay minutes", () => {
    const doctorId = "doc_patel_01";
    const update = QueueService.setDoctorStatus(doctorId, "DELAYED", 15);
    expect(update.status).toBe("DELAYED");
    expect(update.delayMinutes).toBe(15);

    const check = QueueService.getDoctorStatus(doctorId);
    expect(check.status).toBe("DELAYED");
    expect(check.delayMinutes).toBe(15);
  });
});
