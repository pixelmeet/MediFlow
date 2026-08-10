import { CheckInService } from "../CheckInService";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

async function runPhase7Tests() {
  console.log("\n=========================================");
  console.log("  MediFlow Phase 7 — Check-In & No-Show Tests");
  console.log("=========================================\n");

  const todayStr = "2026-08-10";
  const branchSettings = { earlyCheckinMin: 60, gracePeriodMin: 15 };

  // ─── Test 1: Window Eligibility Evaluations ─────────────
  console.log("--- 1. Testing Check-In Window Eligibility ---");

  // Reference now: 10:00 AM
  const simulatedNow = new Date(`${todayStr}T10:00:00.000Z`);

  // Case A: Slot at 12:00 (120 min in future, early window is 60 min -> TOO_EARLY)
  const tooEarly = CheckInService.evaluateEligibility(
    {
      date: new Date(todayStr),
      startTime: "12:00",
      status: "CONFIRMED",
      branch: branchSettings,
    },
    simulatedNow
  );
  assert(tooEarly.status === "TOO_EARLY", "Slot 2 hours ahead is TOO_EARLY");
  assert(tooEarly.eligible === false, "TOO_EARLY is not eligible for self-check-in");
  assert(tooEarly.minutesUntilOpen === 60, "Calculates 60 minutes until check-in window opens");

  // Case B: Slot at 10:30 (30 min in future, within 60 min early window -> ELIGIBLE)
  const eligible = CheckInService.evaluateEligibility(
    {
      date: new Date(todayStr),
      startTime: "10:30",
      status: "CONFIRMED",
      branch: branchSettings,
    },
    simulatedNow
  );
  assert(eligible.status === "ELIGIBLE", "Slot 30 min ahead is ELIGIBLE");
  assert(eligible.eligible === true, "ELIGIBLE status allows immediate check-in");

  // Case C: Slot at 09:50 (10 min past slot, within 15 min grace period -> GRACE_PERIOD)
  const inGrace = CheckInService.evaluateEligibility(
    {
      date: new Date(todayStr),
      startTime: "09:50",
      status: "CONFIRMED",
      branch: branchSettings,
    },
    simulatedNow
  );
  assert(inGrace.status === "GRACE_PERIOD", "Slot 10 min ago is in GRACE_PERIOD");
  assert(inGrace.eligible === true, "GRACE_PERIOD status still permits check-in");
  assert(inGrace.minutesLate === 10, "Calculates 10 minutes late accurately");

  // Case D: Slot at 09:30 (30 min past slot, grace period is 15 min -> EXPIRED)
  const expired = CheckInService.evaluateEligibility(
    {
      date: new Date(todayStr),
      startTime: "09:30",
      status: "CONFIRMED",
      branch: branchSettings,
    },
    simulatedNow
  );
  assert(expired.status === "EXPIRED", "Slot 30 min ago is EXPIRED");
  assert(expired.eligible === false, "EXPIRED slot is marked for No-Show sweep");
  assert(expired.minutesLate === 30, "Calculates 30 minutes late accurately");

  // Case E: Already checked in
  const alreadyCheckedIn = CheckInService.evaluateEligibility(
    {
      date: new Date(todayStr),
      startTime: "10:00",
      status: "CHECKED_IN",
      checkedInAt: new Date(`${todayStr}T09:45:00.000Z`),
      branch: branchSettings,
    },
    simulatedNow
  );
  assert(alreadyCheckedIn.status === "ALREADY_CHECKED_IN", "Recognizes ALREADY_CHECKED_IN status");

  // ─── Test 2: CheckInService Desk Listing ────────────────
  console.log("\n--- 2. Testing Check-In Desk Listing ---");
  const deskItems = await CheckInService.listCheckInDeskItems({ date: todayStr });
  assert(Array.isArray(deskItems), "listCheckInDeskItems returns array of desk items");
  assert(deskItems.length > 0, "Desk items populated");
  console.log(`Found ${deskItems.length} desk item(s). First item: ${deskItems[0].tokenNumber} - ${deskItems[0].patientName} (${deskItems[0].status})`);

  // ─── Test 3: Check-In Execution ─────────────────────────
  console.log("\n--- 3. Testing Check-In Execution & Fallback ---");
  const checkInRes = await CheckInService.checkInPatient("apt_test_01", "usr_patient_01", { forceByStaff: true });
  assert(checkInRes.success === true, "checkInPatient executes successfully with staff override");
  assert(Boolean(checkInRes.checkedInAt), "checkInPatient returns timestamp");

  // ─── Test 4: Reinstatement Execution ────────────────────
  console.log("\n--- 4. Testing No-Show Reinstatement ---");
  const reinstateRes = await CheckInService.reinstateNoShow("apt_test_noshow", "usr_admin_01", "Verified emergency transit delay at desk");
  assert(reinstateRes.success === true, "reinstateNoShow restores appointment successfully");

  // ─── Test 5: Automated No-Show Sweep ────────────────────
  console.log("\n--- 5. Testing Automated No-Show Sweep ---");
  const sweepRes = await CheckInService.sweepNoShows({ dateStr: todayStr });
  assert(typeof sweepRes.sweptCount === "number", "sweepNoShows executes cleanly and returns count");
  assert(Array.isArray(sweepRes.sweptIds), "sweepNoShows returns swept appointment ID array");

  console.log("\n=========================================");
  console.log("  🎉 All Phase 7 Verification Tests Passed! ");
  console.log("=========================================\n");
}

runPhase7Tests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
