"use client";

import * as React from "react";
import Link from "next/link";
import { Activity, Stethoscope, Users, Calendar, Clock, LogOut, User, CheckCircle2, PhoneCall, RefreshCw, AlertCircle, Coffee, AlertTriangle, Play } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { StatCard } from "@/components/shared";
import { useToast } from "@/components/ui/toast";
import { useQueueSocket } from "@/hooks/useQueueSocket";
import { NotificationBell } from "@/components/shared/NotificationBell";
import type { QueueItemDTO, DoctorClinicalStatus } from "@/lib/services/QueueService";

export default function DoctorDashboard() {
  const { user, logout, isLoading: isAuthLoading } = useAuth();
  const { addToast } = useToast();

  const doctorId = "doc_patel_01";
  const { snapshot, isConnected, isReconnecting, error, refresh } = useQueueSocket(doctorId);

  const [isCallingNext, setIsCallingNext] = React.useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = React.useState(false);

  // Doctor Status Modal State
  const [statusModalOpen, setStatusModalOpen] = React.useState(false);
  const [targetStatus, setTargetStatus] = React.useState<DoctorClinicalStatus>("ON_BREAK");
  const [delayMinutes, setDelayMinutes] = React.useState(15);
  const [statusNote, setStatusNote] = React.useState("");

  const handleCallNext = async () => {
    setIsCallingNext(true);
    try {
      const res = await fetch(`/api/v1/queue/${doctorId}/call-next`, {
        method: "POST",
      });
      const json = await res.json();

      if (res.ok && json.data) {
        addToast({
          type: "success",
          title: "Patient Called!",
          description: `Called ${json.data.patientName} (Token ${json.data.tokenNumber}) into consultation cabin.`,
        });
        refresh();
      } else {
        addToast({
          type: "warning",
          title: "Queue Update",
          description: json.error?.message || "No waiting patients in queue.",
        });
      }
    } catch {
      addToast({
        type: "error",
        title: "Network Error",
        description: "Failed to call next patient.",
      });
    } finally {
      setIsCallingNext(false);
    }
  };

  const handleUpdateStatus = async (status: DoctorClinicalStatus, minutes: number = 0, note?: string) => {
    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/v1/queue/${doctorId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          delayMinutes: minutes,
          note: note || undefined,
        }),
      });
      const json = await res.json();

      if (res.ok) {
        addToast({
          type: "success",
          title: "Cabin Status Updated",
          description: json.meta?.message || `Status set to ${status}`,
        });
        setStatusModalOpen(false);
        refresh();
      } else {
        addToast({
          type: "error",
          title: "Status Update Failed",
          description: json.error?.message || "Could not update cabin status.",
        });
      }
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))]">
        <div className="text-center">
          <Activity className="h-8 w-8 text-[hsl(var(--primary))] animate-spin mx-auto mb-2" />
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Loading clinical portal...</p>
        </div>
      </div>
    );
  }

  const currentStatus = snapshot?.doctorStatus?.status || "CONSULTING";

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] pb-12">
      {/* ─── Top Header ─────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-[hsl(var(--border))] bg-[hsl(var(--background)/0.8)] backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-lg)] bg-[hsl(var(--primary))] text-white shadow-[var(--shadow-sm)]">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <span className="text-lg font-bold text-[hsl(var(--foreground))]">
                MediFlow
              </span>
              <span className="ml-2 rounded-[var(--radius-full)] bg-[hsl(var(--success-light))] px-2 py-0.5 text-xs font-semibold text-[hsl(var(--success))]">
                Doctor Station
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <NotificationBell />

            <div className="hidden sm:flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
              <User className="h-4 w-4" />
              <span className="font-medium text-[hsl(var(--foreground))]">{user?.name}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="text-xs flex items-center gap-1.5"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* ─── Main Content ───────────────────────────────── */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {error && (
          <div className="rounded-[var(--radius-lg)] bg-[hsl(var(--danger-light))] border border-[hsl(var(--danger)/0.3)] p-4 flex items-center gap-3 text-xs text-[hsl(var(--danger))]">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Doctor Station Status Card */}
        <div className="rounded-[var(--radius-2xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6 sm:p-8 shadow-[var(--shadow-sm)]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${currentStatus === "CONSULTING" ? "bg-[hsl(var(--success))] animate-ping" : "bg-[hsl(var(--warning))]"}`} />
                <span className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--primary))]">
                  Station Status: {currentStatus.replace("_", " ")}
                </span>
                <span className="text-[10px] bg-[hsl(var(--muted)/0.3)] text-[hsl(var(--muted-foreground))] px-2 py-0.5 rounded-[var(--radius-full)]">
                  {isConnected ? "Live Stream Active" : isReconnecting ? "Reconnecting..." : "Polling Fallback"}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[hsl(var(--foreground))] mt-1">
                {user?.name || snapshot?.doctorName || "Dr. Rajesh Patel"}
              </h1>
              <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] mt-0.5">
                {snapshot?.specialty || "Cardiology"} • {snapshot?.branchName || "Central Hospital Main Clinic"} • Cabin 4
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Doctor Cabin Status Bar */}
              {currentStatus !== "CONSULTING" ? (
                <Button
                  size="sm"
                  onClick={() => handleUpdateStatus("CONSULTING", 0, "Resumed consultations")}
                  disabled={isUpdatingStatus}
                  className="text-xs flex items-center gap-1.5 bg-[hsl(var(--success))] hover:bg-[hsl(var(--success)/0.9)] text-white font-bold"
                >
                  <Play className="h-3.5 w-3.5" />
                  Resume Consulting
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setTargetStatus("ON_BREAK");
                      setDelayMinutes(15);
                      setStatusNote("Brief clinical break");
                      setStatusModalOpen(true);
                    }}
                    className="text-xs flex items-center gap-1.5 border-[hsl(var(--warning))] text-[hsl(var(--warning))] hover:bg-[hsl(var(--warning-light))]"
                  >
                    <Coffee className="h-3.5 w-3.5" />
                    Take a Break
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setTargetStatus("DELAYED");
                      setDelayMinutes(20);
                      setStatusNote("Emergency patient consultation in progress");
                      setStatusModalOpen(true);
                    }}
                    className="text-xs flex items-center gap-1.5 border-[hsl(var(--info))] text-[hsl(var(--info))] hover:bg-[hsl(var(--info-light))]"
                  >
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Report Delay
                  </Button>
                </>
              )}

              <Link href="/doctor/schedule">
                <Button variant="outline" size="sm" className="text-xs flex items-center gap-1.5 font-bold">
                  <Calendar className="h-3.5 w-3.5" />
                  Schedule
                </Button>
              </Link>

              <Button
                variant="outline"
                size="sm"
                onClick={refresh}
                className="text-xs flex items-center gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Sync
              </Button>
            </div>
          </div>
        </div>


        {/* Real-time KPI Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Today's Appointments"
            value={snapshot ? snapshot.totalToday.toString() : "0"}
            icon={<Calendar className="h-5 w-5 text-[hsl(var(--primary))]" />}
          />
          <StatCard
            label="Patients Waiting"
            value={snapshot ? snapshot.waitingCount.toString() : "0"}
            icon={<Clock className="h-5 w-5 text-[hsl(var(--warning))]" />}
          />
          <StatCard
            label="Consulted / Done"
            value={snapshot ? snapshot.completedCount.toString() : "0"}
            icon={<CheckCircle2 className="h-5 w-5 text-[hsl(var(--success))]" />}
          />
          <StatCard
            label="Avg Duration"
            value={snapshot ? `${snapshot.avgDurationMinutes}m` : "20m"}
            icon={<Users className="h-5 w-5 text-[hsl(var(--info))]" />}
          />
        </div>

        {/* Live Active Queue Controller Banner */}
        <div className="rounded-[var(--radius-2xl)] border-2 border-[hsl(var(--primary))] bg-[hsl(var(--primary-light))] p-6 sm:p-8 shadow-[var(--shadow-md)]">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--primary))]">
                Active Consultation Cabin
              </span>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-3xl sm:text-4xl font-extrabold text-[hsl(var(--primary))] font-mono">
                  {snapshot?.currentToken ? snapshot.currentToken.tokenNumber : "Idle (No Patient)"}
                </span>
                {snapshot?.currentToken && (
                  <span className="bg-[hsl(var(--success))] text-white px-3 py-1 rounded-[var(--radius-full)] text-xs font-bold animate-pulse">
                    In Consultation
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold text-[hsl(var(--foreground))] mt-1">
                {snapshot?.currentToken
                  ? `Patient: ${snapshot.currentToken.patientName} (Scheduled: ${snapshot.currentToken.scheduledTime})`
                  : "Ready to consult. Click Call Next Patient to advance queue."}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
              {snapshot?.currentToken && (
                <Link href={`/doctor/consultation/${snapshot.currentToken.tokenId}`}>
                  <Button
                    size="lg"
                    className="w-full font-bold text-sm flex items-center justify-center gap-2 bg-[hsl(var(--success))] hover:bg-[hsl(var(--success)/0.9)] text-white shadow-[var(--shadow-sm)]"
                  >
                    <Stethoscope className="h-4 w-4" />
                    Open Consultation Room
                  </Button>
                </Link>
              )}
              <Button
                size="lg"
                onClick={handleCallNext}
                disabled={isCallingNext || !snapshot || snapshot.waitingCount === 0}
                className="w-full font-bold text-sm flex items-center justify-center gap-2 shadow-[var(--shadow-sm)]"
              >
                <PhoneCall className="h-4 w-4" />
                {isCallingNext ? "Calling Patient..." : "Call Next Patient"}
              </Button>
            </div>
          </div>
        </div>

        {/* Today's Queue Timeline Table */}
        <div className="rounded-[var(--radius-2xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6 shadow-[var(--shadow-sm)]">
          <div className="flex items-center justify-between pb-4 border-b border-[hsl(var(--border))]">
            <h2 className="text-base font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
              <Clock className="h-4 w-4 text-[hsl(var(--primary))]" />
              Today&apos;s Patient Queue &amp; Consultations
            </h2>
            <span className="text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase">
              {snapshot?.queue.length || 0} Total Entries
            </span>
          </div>

          <div className="divide-y divide-[hsl(var(--border))]">
            {snapshot?.queue.length === 0 ? (
              <div className="text-center py-8 text-xs text-[hsl(var(--muted-foreground))]">
                No patients scheduled for today yet.
              </div>
            ) : (
              snapshot?.queue.map((item: QueueItemDTO) => {
                const isCurrent = item.status === "IN_PROGRESS";
                const isDone = item.status === "DONE";

                return (
                  <div
                    key={item.tokenId}
                    className={`py-3.5 px-3 flex items-center justify-between text-xs transition-colors rounded-[var(--radius-md)] ${
                      isCurrent
                        ? "bg-[hsl(var(--primary-light))] font-semibold"
                        : "hover:bg-[hsl(var(--muted)/0.2)]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-sm w-12 text-[hsl(var(--foreground))]">
                        {item.tokenNumber}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm text-[hsl(var(--foreground))]">
                            {item.patientName}
                          </p>
                          {item.isCheckedIn ? (
                            <span className="text-[10px] font-bold uppercase bg-[hsl(var(--success-light))] text-[hsl(var(--success))] px-2 py-0.5 rounded-[var(--radius-full)]">
                              Checked In
                            </span>
                          ) : item.status === "NO_SHOW" ? (
                            <span className="text-[10px] font-bold uppercase bg-[hsl(var(--danger-light))] text-[hsl(var(--danger))] px-2 py-0.5 rounded-[var(--radius-full)]">
                              No-Show
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold uppercase bg-[hsl(var(--muted)/0.4)] text-[hsl(var(--muted-foreground))] px-2 py-0.5 rounded-[var(--radius-full)]">
                              Awaiting Arrival
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                          Position #{item.position} • Scheduled {item.scheduledTime}
                          {item.checkedInAt && ` • Arrived ${item.checkedInAt.slice(11, 16) || item.checkedInAt}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {isDone ? (
                        <span className="flex items-center gap-1 text-[hsl(var(--muted-foreground))] font-semibold bg-[hsl(var(--muted)/0.3)] px-2.5 py-1 rounded-[var(--radius-full)]">
                          <CheckCircle2 className="h-3.5 w-3.5 text-[hsl(var(--success))]" /> Consulted
                        </span>
                      ) : isCurrent ? (
                        <div className="flex items-center gap-2">
                          <span className="bg-[hsl(var(--primary))] text-white px-3 py-1 rounded-[var(--radius-full)] font-bold animate-pulse">
                            In Cabin
                          </span>
                          <Link href={`/doctor/consultation/${item.tokenId}`}>
                            <Button size="sm" className="text-xs font-bold flex items-center gap-1">
                              <Stethoscope className="h-3.5 w-3.5" /> Consult
                            </Button>
                          </Link>
                        </div>
                      ) : item.status === "NO_SHOW" ? (
                        <span className="text-[hsl(var(--danger))] font-semibold bg-[hsl(var(--danger-light))] px-2.5 py-1 rounded-[var(--radius-full)]">
                          No-Show
                        </span>
                      ) : item.isCheckedIn ? (
                        <span className="text-[hsl(var(--success))] font-semibold bg-[hsl(var(--success-light))] px-2.5 py-1 rounded-[var(--radius-full)]">
                          Ready in Waiting Room
                        </span>
                      ) : (
                        <span className="text-[hsl(var(--warning))] font-semibold bg-[hsl(var(--warning-light))] px-2.5 py-1 rounded-[var(--radius-full)]">
                          Awaiting Check-in
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>

      {/* Doctor Status Update Modal */}
      <Modal
        open={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title={targetStatus === "ON_BREAK" ? "Take a Clinical Break" : "Report Emergency / Consultation Delay"}
        description={
          targetStatus === "ON_BREAK"
            ? "Broadcast a temporary break notice to all waiting patients. Queue ETAs will adjust dynamically."
            : "Notify patients of expected consultation delays and adjust live estimated wait times."
        }
      >
        <div className="space-y-4 pt-2 text-xs">
          <div>
            <label className="font-semibold block mb-1">Duration (Minutes)</label>
            <div className="flex items-center gap-2">
              {[5, 10, 15, 20, 30].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setDelayMinutes(mins)}
                  className={`px-3 py-2 rounded-[var(--radius-md)] border font-mono font-bold text-xs transition-all ${
                    delayMinutes === mins
                      ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-white shadow-[var(--shadow-sm)]"
                      : "border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] hover:border-[hsl(var(--primary)/0.5)]"
                  }`}
                >
                  {mins}m
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="font-semibold block mb-1">Patient Notice / Reason Note</label>
            <input
              type="text"
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              placeholder={
                targetStatus === "ON_BREAK"
                  ? "e.g., Short lunch / tea break"
                  : "e.g., Emergency inpatient review in progress"
              }
              className="w-full rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] p-2.5 text-xs text-[hsl(var(--foreground))] focus:border-[hsl(var(--primary))] focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[hsl(var(--border))]">
            <Button variant="outline" size="sm" onClick={() => setStatusModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => handleUpdateStatus(targetStatus, delayMinutes, statusNote)}
              disabled={isUpdatingStatus}
            >
              {isUpdatingStatus ? "Broadcasting..." : "Broadcast Status"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

