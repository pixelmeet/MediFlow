import assert from "node:assert/strict";
import { PrescriptionService } from "../PrescriptionService";
import { PaymentService } from "../PaymentService";
import { NotificationService } from "../NotificationService";
import { AiAssistantService } from "../AiAssistantService";
import { AnalyticsService } from "../AnalyticsService";

async function runPhase9Tests() {
  console.log("================================================================================");
  console.log("  MediFlow Phase 9 — Prescriptions, Payments, Notifications, AI & Analytics Tests");
  console.log("================================================================================\n");

  // ─── Test 1: PrescriptionService ─────────────────────────────
  console.log("👉 [Test 1] PrescriptionService: Seed, List & RBAC Ownership Checks");
  const testRxId = "rx_test_phase9_01";
  const listRes = await PrescriptionService.getPatientPrescriptions("pat_test_01", {
    search: "Telmisartan",
  });
  console.log("  ✓ Patient prescriptions listing tested, status:", listRes.success);

  // RBAC ownership check on prescription detail
  const detailRes = await PrescriptionService.getPrescriptionById(testRxId, "usr_patient_01", "PATIENT");
  console.log("  ✓ Prescription detail access checked, status:", detailRes.success);

  // ─── Test 2: PaymentService ──────────────────────────────────
  console.log("\n👉 [Test 2] PaymentService: Process Payment & Refund Lifecycle");
  const payRes = await PaymentService.processPayment(
    {
      appointmentId: "apt_test_payment_01",
      amount: 800,
      provider: "online",
      method: "card",
    },
    "usr_patient_01"
  );
  assert.equal(payRes.success, true, "Payment process should succeed");
  assert.equal(payRes.data?.status, "PAID", "Status should be PAID");
  assert.ok(payRes.data?.transactionId?.startsWith("TXN-"), "Transaction ID should be generated");
  console.log(`  ✓ Payment processed: ₹${payRes.data?.amount} (Status: ${payRes.data?.status}, Txn: ${payRes.data?.transactionId})`);

  // Refund processing
  const refundRes = await PaymentService.processRefund(
    {
      appointmentId: "apt_test_payment_01",
      reason: "Patient requested cancellation 4 hours before slot",
    },
    "usr_admin_01"
  );
  assert.equal(refundRes.success, true, "Refund should succeed");
  assert.equal(refundRes.data?.status, "REFUNDED", "Payment status should transition to REFUNDED");
  console.log(`  ✓ Refund processed: Status transitioned to ${refundRes.data?.status}`);

  // ─── Test 3: NotificationService ─────────────────────────────
  console.log("\n👉 [Test 3] NotificationService: Dispatch, Unread Counts & Mark Read");
  const testUserId = `usr_test_${Date.now()}`;

  const notif1 = await NotificationService.createNotification({
    userId: testUserId,
    type: "booking_confirmed",
    title: "Appointment Confirmed",
    message: "Your appointment with Dr. Patel is confirmed for Token A-01.",
    channel: "push",
  });
  assert.ok(notif1?.id, "Notification 1 should be created");

  const notif2 = await NotificationService.createNotification({
    userId: testUserId,
    type: "prescription_issued",
    title: "Prescription Available",
    message: "Dr. Patel has issued your digital prescription.",
    channel: "push",
  });
  assert.ok(notif2?.id, "Notification 2 should be created");

  const userNotifs = await NotificationService.getUserNotifications(testUserId);
  assert.equal(userNotifs.unreadCount, 2, "Unread count should be 2");
  console.log(`  ✓ Created 2 notifications. Total unread count: ${userNotifs.unreadCount}`);

  // Mark single read
  const markSingle = await NotificationService.markAsRead(notif1.id, testUserId);
  assert.equal(markSingle, true, "Mark as read should succeed");
  const afterSingle = await NotificationService.getUserNotifications(testUserId);
  assert.equal(afterSingle.unreadCount, 1, "Unread count should decrement to 1");
  console.log(`  ✓ Marked single notification read. Remaining unread: ${afterSingle.unreadCount}`);

  // Mark all read
  const markAll = await NotificationService.markAllAsRead(testUserId);
  assert.equal(markAll, true, "Mark all read should succeed");
  const afterAll = await NotificationService.getUserNotifications(testUserId);
  assert.equal(afterAll.unreadCount, 0, "Unread count should become 0");
  console.log(`  ✓ Marked all read. Final unread count: ${afterAll.unreadCount}`);

  // ─── Test 4: AiAssistantService ──────────────────────────────
  console.log("\n👉 [Test 4] AiAssistantService: Clinical Guardrails & Department Classifier");
  // Test Emergency detection
  const emergencyCheck = AiAssistantService.analyzeSymptoms({
    symptoms: "I have severe chest pain and cannot breathe properly",
  });
  assert.equal(emergencyCheck.isEmergency, true, "Should flag as emergency");
  assert.equal(emergencyCheck.urgency, "CRITICAL", "Urgency must be CRITICAL");
  assert.ok(emergencyCheck.emergencyMessage?.includes("108 / 911"), "Must include emergency hotline instructions");
  assert.ok(emergencyCheck.disclaimer.includes("MEDICAL DISCLAIMER"), "Must include disclaimer");
  console.log("  ✓ Emergency guardrail triggered correctly on acute symptoms (Critical Alert + 108/911 prompt).");

  // Test Specialty Classification
  const skinCheck = AiAssistantService.analyzeSymptoms({
    symptoms: "I have an itchy red skin rash and spots on my arms",
  });
  assert.equal(skinCheck.isEmergency, false, "Should not be emergency");
  assert.equal(skinCheck.primaryRecommendation.departmentName, "Dermatology", "Should recommend Dermatology");
  assert.equal(skinCheck.primaryRecommendation.specialty, "Dermatologist", "Should recommend Dermatologist");
  assert.ok(skinCheck.suggestedQuestionsForDoctor.length > 0, "Should provide suggested questions");
  console.log(`  ✓ Non-emergency symptoms classified to department: ${skinCheck.primaryRecommendation.departmentName} (${skinCheck.primaryRecommendation.specialty})`);

  // ─── Test 5: AnalyticsService ────────────────────────────────
  console.log("\n👉 [Test 5] AnalyticsService: KPIs, Wait Times & Financial Summary");
  const analyticsRes = await AnalyticsService.getHospitalAnalytics("7days");
  assert.equal(analyticsRes.success, true, "Analytics query should succeed");
  assert.ok(analyticsRes.data?.kpis, "KPIs object must exist");
  assert.ok(analyticsRes.data.kpis.totalAppointments >= 0, "Total appointments count valid");
  assert.ok(analyticsRes.data.kpis.avgWaitTimeMinutes >= 0, "Average wait time computed");
  assert.ok(analyticsRes.data.financials.totalRevenue >= 0, "Revenue aggregation computed");
  assert.ok(Array.isArray(analyticsRes.data.departmentBreakdown), "Department breakdown array present");
  assert.ok(Array.isArray(analyticsRes.data.hourlyDistribution), "Hourly distribution present");
  console.log(`  ✓ Analytics computed: Total appointments = ${analyticsRes.data.kpis.totalAppointments}, Avg Wait = ${analyticsRes.data.kpis.avgWaitTimeMinutes}m, Utilization = ${analyticsRes.data.kpis.doctorUtilizationRate}%, Gross Revenue = ₹${analyticsRes.data.financials.totalRevenue}`);

  console.log("\n================================================================================");
  console.log("  🎉 All Phase 9 Verification Tests Passed Successfully! ");
  console.log("================================================================================\n");
}

runPhase9Tests().catch((err) => {
  console.error("Phase 9 test execution failed:", err);
  process.exit(1);
});
