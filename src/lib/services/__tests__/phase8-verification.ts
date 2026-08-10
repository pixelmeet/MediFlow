import { QueueService, queueEventBus } from "../QueueService";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

async function runPhase8Tests() {
  console.log("\n=========================================");
  console.log("  MediFlow Phase 8 — Live Queue & Real-Time Tests");
  console.log("=========================================\n");

  const doctorId = "doc_patel_01";
  const todayStr = new Date().toISOString().slice(0, 10);

  // ─── Test 1: Real-Time Event Bus Subscription ──────────
  console.log("--- 1. Testing Queue Event Bus ---");
  let receivedEvent: any = null;
  const unsubscribeTest = (data: any) => {
    receivedEvent = data;
  };
  queueEventBus.on(`queue:${doctorId}`, unsubscribeTest);

  // ─── Test 2: Doctor Status & ETA Dynamic Adjustment ────
  console.log("\n--- 2. Testing Doctor Cabin Status & Dynamic ETA ---");

  // Initial snapshot
  const initialSnap = await QueueService.getQueueSnapshot(doctorId, todayStr);
  assert(Boolean(initialSnap.doctorName), "getQueueSnapshot returns doctorName");
  assert(typeof initialSnap.estimatedWaitMinutes === "number", "Calculates initial baseline ETA");
  const baselineETA = initialSnap.estimatedWaitMinutes;
  console.log(`Baseline waiting count: ${initialSnap.waitingCount}, Baseline ETA: ${baselineETA}m`);

  // Set doctor status to ON_BREAK with 15m delay
  const breakStatus = QueueService.setDoctorStatus(doctorId, "ON_BREAK", 15, "Lunch break");
  assert(breakStatus.status === "ON_BREAK", "Doctor status updated to ON_BREAK");
  assert(breakStatus.delayMinutes === 15, "Break duration set to 15m");
  assert(receivedEvent !== null && receivedEvent.type === "doctor_status", "Event bus broadcasted doctor_status event");

  const breakSnap = await QueueService.getQueueSnapshot(doctorId, todayStr);
  assert(breakSnap.doctorStatus.status === "ON_BREAK", "Snapshot reflects ON_BREAK status");
  assert(
    breakSnap.estimatedWaitMinutes === baselineETA + 15,
    `Dynamic ETA includes +15m break offset (${breakSnap.estimatedWaitMinutes}m vs ${baselineETA + 15}m)`
  );

  // Set doctor status to DELAYED with 20m delay
  QueueService.setDoctorStatus(doctorId, "DELAYED", 20, "Emergency consultation");
  const delayedSnap = await QueueService.getQueueSnapshot(doctorId, todayStr);
  assert(delayedSnap.doctorStatus.status === "DELAYED", "Doctor status updated to DELAYED");
  assert(
    delayedSnap.estimatedWaitMinutes === baselineETA + 20,
    `Dynamic ETA includes +20m delay offset (${delayedSnap.estimatedWaitMinutes}m vs ${baselineETA + 20}m)`
  );

  // Resume consulting
  QueueService.setDoctorStatus(doctorId, "CONSULTING", 0, "Resumed consultation");
  const resumedSnap = await QueueService.getQueueSnapshot(doctorId, todayStr);
  assert(resumedSnap.doctorStatus.status === "CONSULTING", "Doctor status returned to CONSULTING");
  assert(resumedSnap.estimatedWaitMinutes === baselineETA, "ETA returned to baseline");

  // ─── Test 3: Call Next Patient Advancement ─────────────
  console.log("\n--- 3. Testing Call Next Patient Queue Advancement ---");
  receivedEvent = null;
  const callNextRes = await QueueService.callNextPatient(doctorId);
  assert(callNextRes.success === true, "callNextPatient executes successfully");
  assert(Boolean(callNextRes.calledToken), "callNextPatient returns advanced token");
  assert(receivedEvent !== null, "Queue event bus broadcasted live token update");
  console.log(`Called token: ${callNextRes.calledToken?.tokenNumber} (${callNextRes.calledToken?.patientName})`);

  // ─── Test 4: Queue Reordering & Audit Record ───────────
  console.log("\n--- 4. Testing Queue Priority Reordering ---");
  const reorderRes = await QueueService.reorderQueue(
    doctorId,
    "apt_04",
    1,
    "usr_admin_01",
    "Urgent clinical triage priority adjustment"
  );
  assert(reorderRes.success === true, "reorderQueue executes cleanly");

  // ─── Test 5: Hospital-Wide Multi-Doctor Overview ───────
  console.log("\n--- 5. Testing Hospital Multi-Doctor Overview ---");
  const hospitalOverview = await QueueService.getHospitalQueueOverview();
  assert(Array.isArray(hospitalOverview), "getHospitalQueueOverview returns array of doctors");
  assert(hospitalOverview.length > 0, "Hospital overview contains active doctor cabins");
  console.log(
    `Found ${hospitalOverview.length} doctor cabin(s). Doctor: ${hospitalOverview[0].doctorName} - Token ${hospitalOverview[0].currentTokenNumber} (Waiting: ${hospitalOverview[0].waitingCount})`
  );

  // Cleanup event listener
  queueEventBus.off(`queue:${doctorId}`, unsubscribeTest);

  console.log("\n=========================================");
  console.log("  🎉 All Phase 8 Live Queue Tests Passed! ");
  console.log("=========================================\n");
}

runPhase8Tests().catch((err) => {
  console.error("Phase 8 test execution failed:", err);
  process.exit(1);
});
