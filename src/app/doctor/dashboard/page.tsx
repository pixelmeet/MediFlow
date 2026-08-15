"use client";

import * as React from "react";
import Link from "next/link";
import { Activity, Stethoscope, Users, Calendar, Clock, CheckCircle2, PhoneCall, RefreshCw, AlertCircle, Coffee, AlertTriangle, Play } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { StatCard } from "@/components/shared";
import { useToast } from "@/components/ui/toast";
import { useQueueSocket } from "@/hooks/useQueueSocket";
import type { QueueItemDTO, DoctorClinicalStatus } from "@/lib/services/QueueService";

export default function DoctorDashboard() {
  const { user, logout, isLoading: isAuthLoading } = useAuth();
  const { addToast } = useToast();

  const doctorId = user?.doctorId;
  const { snapshot, isConnected, isReconnecting, error, refresh } = useQueueSocket(doctorId || "");

  const [isCallingNext, setIsCallingNext] = React.useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = React.useState(false);

  // Doctor Status Modal State
  const [statusModalOpen, setStatusModalOpen] = React.useState(false);
  const [targetStatus, setTargetStatus] = React.useState<DoctorClinicalStatus>("ON_BREAK");
  const [delayMinutes, setDelayMinutes] = React.useState(15);
  const [statusNote, setStatusNote] = React.useState("");

  const handleCallNext = async () => {
    if (!doctorId) return;
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
    if (!doctorId) return;
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
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-[hsl(var(--background))]">
        <div className="text-center space-y-2">
          <Activity className="h-8 w-8 text-[hsl(var(--primary))] animate-spin mx-auto mb-2" />
          <p className="text-xs text-[hsl(var(--muted-foreground))]">Loading clinical portal...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== "DOCTOR" || !doctorId) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-[hsl(var(--background))] p-4">
        <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 text-center max-w-md shadow-[var(--shadow-sm)]">
          <AlertCircle className="h-10 w-10 text-[hsl(var(--danger))] mx-auto mb-3" />
          <h2 className="font-serif text-lg font-normal text-[hsl(var(--foreground))] mb-1">
            Unable to load your doctor profile
          </h2>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mb-6 font-sans">
            Please ensure you are signed in with an active Doctor account or contact administration.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/auth/login">
              <Button size="sm" variant="outline" className="text-xs font-medium">
                Switch Account
              </Button>
            </Link>
            <Button size="sm" onClick={logout} className="text-xs font-medium">
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const currentStatus = snapshot?.doctorStatus?.status || "CONSULTING";

  return (
    <div className="bg-[hsl(var(--background))] pb-12">
      {/* ─── Main Content ───────────────────────────────── */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {error && (
          <div className="rounded-[var(--radius-lg)] bg-[hsl(var(--danger-light))] border border-[hsl(var(--danger)/0.3)] p-4 flex items-center gap-3 text-xs text-[hsl(var(--danger))]">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Doctor Station Status Card */}
        <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6 sm:p-8 shadow-[var(--shadow-sm)]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${currentStatus === "CONSULTING" ? "bg-[hsl(var(--success))]" : "bg-[hsl(var(--warning))]"}`} />
                <span className="text-xs font-mono font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  Station Status: {currentStatus.replace("_", " ")}
                </span>
                <span className="text-[10px] bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] px-2 py-0.5 rounded-[var(--radius-full)] font-mono">
                  {isConnected ? "Live Stream" : isReconnecting ? "Reconnecting..." : "Polling"}
                </span>
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl font-normal text-[hsl(var(--foreground))] tracking-tight mt-1">
                {user?.name || snapshot?.doctorName || "Dr. Rajesh Patel"}
              </h1>
              <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] mt-0.5 font-sans">
                {snapshot?.specialty || "Cardiology"} • {snapshot?.branchName || "Central Hospital Main Clinic"} • Cabin 4
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 font-sans">
              {/* Doctor Cabin Status Bar */}
              {currentStatus !== "CONSULTING" ? (
                <Button
                  size="sm"
                  onClick={() => handleUpdateStatus("CONSULTING", 0, "Resumed consultations")}
                  disabled={isUpdatingStatus}
                  className="text-xs flex items-center gap-1.5 bg-[hsl(var(--success))] hover:bg-[hsl(var(--success)/0.9)] text-white font-medium"
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
                    className="text-xs flex items-center gap-1.5 border-[hsl(var(--warning)/0.4)] text-[hsl(var(--warning))] bg-[hsl(var(--warning-light))]"
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
                    className="text-xs flex items-center gap-1.5 border-[hsl(var(--border))] text-[hsl(var(--foreground))] bg-[hsl(var(--background))]"
                  >
                    <AlertTriangle className="h-3.5 w-3.5 text-[hsl(var(--warning))]" />
                    Report Delay
                  </Button>
                </>
              )}

              <Link href="/doctor/schedule">
                <Button variant="outline" size="sm" className="text-xs flex items-center gap-1.5 font-medium">
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
            icon={<Calendar className="h-5 w-5 text-[hsl(var(--muted-foreground))]" />}
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
            icon={<Users className="h-5 w-5 text-[hsl(var(--muted-foreground))]" />}
          />
        </div>

        {/* Live Active Queue Controller Banner */}
        <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6 sm:p-8 shadow-[var(--shadow-sm)]">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <span className="text-xs font-mono font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                Active Consultation Cabin
              </span>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-3xl sm:text-4xl font-serif font-normal text-[hsl(var(--primary))] font-mono">
                  {snapshot?.currentToken ? snapshot.currentToken.tokenNumber : "Idle (No Patient)"}
                </span>
                {snapshot?.currentToken && (
                  <span className="bg-[hsl(var(--success-light))] border border-[hsl(var(--success)/0.3)] text-[hsl(var(--success))] px-3 py-1 rounded-[var(--radius-full)] text-xs font-medium">
                    In Consultation
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-[hsl(var(--foreground))] mt-1 font-sans">
                {snapshot?.currentToken
                  ? `Patient: ${snapshot.currentToken.patientName} (Scheduled: ${snapshot.currentToken.scheduledTime})`
                  : "Ready to consult. Click Call Next Patient to advance queue."}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto font-sans">
              {snapshot?.currentToken && (
                <Link href={`/doctor/consultation/${snapshot.currentToken.tokenId}`}>
                  <Button
                    size="lg"
                    className="w-full font-medium text-sm flex items-center justify-center gap-2 bg-[hsl(var(--success))] hover:bg-[hsl(var(--success)/0.9)] text-white shadow-[var(--shadow-sm)]"
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
                className="w-full font-medium text-sm flex items-center justify-center gap-2 shadow-[var(--shadow-sm)]"
              >
                <PhoneCall className="h-4 w-4" />
                {isCallingNext ? "Calling Patient..." : "Call Next Patient"}
              </Button>
            </div>
          </div>
        </div>

        {/* Today's Queue Timeline Table */}
        <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6 shadow-[var(--shadow-sm)]">
          <div className="flex items-center justify-between pb-4 border-b border-[hsl(var(--border))]">
            <h2 className="font-serif text-base font-normal text-[hsl(var(--foreground))] flex items-center gap-2">
              <Clock className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
              Today&apos;s Patient Queue &amp; Consultations
            </h2>
            <span className="text-xs font-mono text-[hsl(var(--muted-foreground))]">
              {snapshot?.queue.length || 0} Total Entries
            </span>
          </div>

          <div className="divide-y divide-[hsl(var(--border))]">
            {snapshot?.queue.length === 0 ? (
              <div className="text-center py-8 text-xs text-[hsl(var(--muted-foreground))] font-sans">
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
                        ? "bg-[hsl(var(--primary-light))]"
                        : "hover:bg-[hsl(var(--background))]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-sm w-12 text-[hsl(var(--foreground))]">
                        {item.tokenNumber}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm text-[hsl(var(--foreground))] font-sans">
                            {item.patientName}
                          </p>
                          {item.isCheckedIn ? (
                            <span className="text-[10px] font-mono uppercase bg-[hsl(var(--success-light))] text-[hsl(var(--success))] border border-[hsl(var(--success)/0.3)] px-2 py-0.5 rounded-[var(--radius-full)]">
                              Checked In
                            </span>
                          ) : item.status === "NO_SHOW" ? (
                            <span className="text-[10px] font-mono uppercase bg-[hsl(var(--danger-light))] text-[hsl(var(--danger))] border border-[hsl(var(--danger)/0.3)] px-2 py-0.5 rounded-[var(--radius-full)]">
                              No-Show
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono uppercase bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] px-2 py-0.5 rounded-[var(--radius-full)]">
                              Awaiting Arrival
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5 font-sans">
                          Position #{item.position} • Scheduled {item.scheduledTime}
                          {item.checkedInAt && ` • Arrived ${item.checkedInAt.slice(11, 16) || item.checkedInAt}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 font-sans">
                      {isDone ? (
                        <span className="flex items-center gap-1 text-[hsl(var(--muted-foreground))] font-medium bg-[hsl(var(--background))] border border-[hsl(var(--border))] px-2.5 py-1 rounded-[var(--radius-full)]">
                          <CheckCircle2 className="h-3.5 w-3.5 text-[hsl(var(--success))]" /> Consulted
                        </span>
                      ) : isCurrent ? (
                        <div className="flex items-center gap-2">
                          <span className="bg-[hsl(var(--primary))] text-white px-3 py-1 rounded-[var(--radius-full)] text-[11px] font-medium">
                            In Cabin
                          </span>
                          <Link href={`/doctor/consultation/${item.tokenId}`}>
                            <Button size="sm" className="text-xs font-medium flex items-center gap-1">
                              <Stethoscope className="h-3.5 w-3.5" /> Consult
                            </Button>
                          </Link>
                        </div>
                      ) : item.status === "NO_SHOW" ? (
                        <span className="text-[hsl(var(--danger))] font-medium bg-[hsl(var(--danger-light))] border border-[hsl(var(--danger)/0.3)] px-2.5 py-1 rounded-[var(--radius-full)]">
                          No-Show
                        </span>
                      ) : item.isCheckedIn ? (
                        <span className="text-[hsl(var(--success))] font-medium bg-[hsl(var(--success-light))] border border-[hsl(var(--success)/0.3)] px-2.5 py-1 rounded-[var(--radius-full)]">
                          In Waiting Room
                        </span>
                      ) : (
                        <span className="text-[hsl(var(--warning))] font-medium bg-[hsl(var(--warning-light))] border border-[hsl(var(--warning)/0.3)] px-2.5 py-1 rounded-[var(--radius-full)]">
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
        title={targetStatus === "ON_BREAK" ? "Take a Clinical Break" : "Report Consultation Delay"}
        description={
          targetStatus === "ON_BREAK"
            ? "Broadcast a temporary break notice to all waiting patients. Queue ETAs will adjust dynamically."
            : "Notify patients of expected consultation delays and adjust live estimated wait times."
        }
      >
        <div className="space-y-4 pt-2 text-xs font-sans">
          <div>
            <label className="font-medium block mb-1 text-[hsl(var(--foreground))]">Duration (Minutes)</label>
            <div className="flex items-center gap-2">
              {[5, 10, 15, 20, 30].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setDelayMinutes(mins)}
                  className={`px-3 py-2 rounded-[var(--radius-md)] border font-mono font-medium text-xs transition-all ${
                    delayMinutes === mins
                      ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-white shadow-[var(--shadow-sm)]"
                      : "border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] hover:border-[hsl(var(--primary)/0.5)]"
                  }`}
                >
                  {mins}m
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="font-medium block mb-1 text-[hsl(var(--foreground))]">Patient Notice / Reason Note</label>
            <input
              type="text"
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              placeholder={
                targetStatus === "ON_BREAK"
                  ? "e.g., Short clinical break"
                  : "e.g., Emergency inpatient review in progress"
              }
              className="w-full rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] p-2.5 text-xs text-[hsl(var(--foreground))] focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-[hsl(var(--input-focus)/0.4)] focus-visible:border-[hsl(var(--input-focus))] transition-colors"
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
              className="font-medium"
            >
              {isUpdatingStatus ? "Broadcasting..." : "Broadcast Status"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
