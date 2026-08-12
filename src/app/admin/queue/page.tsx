"use client";

import * as React from "react";
import Link from "next/link";
import {
  Users,
  Clock,
  Stethoscope,
  RefreshCw,
  PhoneCall,
  ArrowUpDown,
  CheckCircle2,
  Coffee,
  AlertTriangle,
} from "lucide-react";
import { AdminNavigation } from "@/components/admin/AdminNavigation";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import type { DoctorQueueSummaryDTO, QueueSnapshotDTO } from "@/lib/services/QueueService";

export default function AdminQueueMonitorPage() {
  const { addToast } = useToast();

  const [doctors, setDoctors] = React.useState<DoctorQueueSummaryDTO[]>([]);
  const [branches, setBranches] = React.useState<{ id: string; name: string }[]>([]);
  const [selectedBranchId, setSelectedBranchId] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(true);
  const [reloadKey, setReloadKey] = React.useState(0);

  // Calling next state per doctor
  const [callingDoctorIds, setCallingDoctorIds] = React.useState<Record<string, boolean>>({});

  // Reorder Modal State
  const [selectedDoctorForReorder, setSelectedDoctorForReorder] = React.useState<DoctorQueueSummaryDTO | null>(null);
  const [doctorQueueDetails, setDoctorQueueDetails] = React.useState<QueueSnapshotDTO | null>(null);
  const [selectedAppointmentId, setSelectedAppointmentId] = React.useState("");
  const [targetPosition, setTargetPosition] = React.useState(1);
  const [reorderReason, setReorderReason] = React.useState("");
  const [isSubmittingReorder, setIsSubmittingReorder] = React.useState(false);

  // Fetch branches
  React.useEffect(() => {
    fetch("/api/v1/admin/branches")
      .then((res) => res.json())
      .then((json) => {
        if (json.data) setBranches(json.data);
      })
      .catch(() => {});
  }, []);

  // Fetch doctors queue overview
  React.useEffect(() => {
    let isMounted = true;
    const fetchOverview = async () => {
      try {
        const queryParams = new URLSearchParams();
        if (selectedBranchId) queryParams.set("branchId", selectedBranchId);

        const res = await fetch(`/api/v1/admin/queue/overview?${queryParams.toString()}`);
        const json = await res.json();
        if (isMounted && res.ok && json.data) {
          setDoctors(json.data);
        }
      } catch (err) {
        console.error("Failed to load queue monitor:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchOverview();

    // Auto-poll every 3 seconds for admin station monitor
    const interval = setInterval(fetchOverview, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedBranchId, reloadKey]);

  // Handle Call Next from Admin Desk
  const handleCallNext = async (doc: DoctorQueueSummaryDTO) => {
    setCallingDoctorIds((prev) => ({ ...prev, [doc.doctorId]: true }));
    try {
      const res = await fetch(`/api/v1/queue/${doc.doctorId}/call-next`, {
        method: "POST",
      });
      const json = await res.json();

      if (res.ok && json.data) {
        addToast({
          type: "success",
          title: "Patient Called",
          description: `Called ${json.data.patientName} (Token ${json.data.tokenNumber}) for ${doc.doctorName}.`,
        });
        setReloadKey((k) => k + 1);
      } else {
        addToast({
          type: "warning",
          title: "Queue Notice",
          description: json.error?.message || "No waiting patients for this doctor.",
        });
      }
    } catch {
      addToast({
        type: "error",
        title: "Call Failed",
        description: "Failed to call next patient.",
      });
    } finally {
      setCallingDoctorIds((prev) => ({ ...prev, [doc.doctorId]: false }));
    }
  };

  // Open Reorder Modal
  const handleOpenReorderModal = async (doc: DoctorQueueSummaryDTO) => {
    setSelectedDoctorForReorder(doc);
    try {
      const res = await fetch(`/api/v1/queue/${doc.doctorId}`);
      const json = await res.json();
      if (res.ok && json.data) {
        setDoctorQueueDetails(json.data);
        const firstWaiting = json.data.queue.find((q: { status: string; appointmentId: string }) => q.status === "WAITING");
        if (firstWaiting) {
          setSelectedAppointmentId(firstWaiting.appointmentId);
          setTargetPosition(1);
        }
      }
    } catch {
      console.error("Failed to load doctor queue details");
    }
  };

  // Submit Reorder
  const handleConfirmReorder = async () => {
    if (!selectedDoctorForReorder || !selectedAppointmentId || !reorderReason.trim()) return;
    setIsSubmittingReorder(true);

    try {
      const res = await fetch(`/api/v1/queue/${selectedDoctorForReorder.doctorId}/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId: selectedAppointmentId,
          targetPosition: Number(targetPosition),
          reason: reorderReason,
        }),
      });
      const json = await res.json();

      if (res.ok) {
        addToast({
          type: "success",
          title: "Queue Reordered",
          description: "Patient priority adjusted and recorded in audit log.",
        });
        setSelectedDoctorForReorder(null);
        setReorderReason("");
        setReloadKey((k) => k + 1);
      } else {
        addToast({
          type: "error",
          title: "Reorder Failed",
          description: json.error?.message || "Could not reorder queue.",
        });
      }
    } finally {
      setIsSubmittingReorder(false);
    }
  };

  // Total KPIs
  const totalDoctorsCount = doctors.length;
  const activeConsultations = doctors.filter((d) => Boolean(d.currentTokenNumber)).length;
  const totalWaitingPatients = doctors.reduce((sum, d) => sum + d.waitingCount, 0);
  const onBreakOrDelayed = doctors.filter(
    (d) => d.doctorStatus.status === "ON_BREAK" || d.doctorStatus.status === "DELAYED"
  ).length;
  const totalCompleted = doctors.reduce((sum, d) => sum + d.completedCount, 0);

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] pb-16">
      <AdminNavigation />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[hsl(var(--foreground))] tracking-tight flex items-center gap-2.5">
              <Clock className="h-7 w-7 text-[hsl(var(--primary))]" />
              Live Hospital Queue Monitor
            </h1>
            <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] mt-0.5">
              Real-time cabin monitoring, patient flow oversight, and priority reordering across all physicians
            </p>
          </div>

          <div className="flex items-center gap-3">
            {branches.length > 0 && (
              <div className="w-52">
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="w-full rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--card))] p-2 text-xs text-[hsl(var(--foreground))] focus:border-[hsl(var(--primary))] focus:outline-none"
                >
                  <option value="">All Hospital Branches</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setReloadKey((k) => k + 1)}
              className="text-xs flex items-center gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Sync
            </Button>
          </div>
        </div>

        {/* Live Hospital KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-3.5 shadow-[var(--shadow-sm)]">
            <div className="flex items-center justify-between text-xs text-[hsl(var(--muted-foreground))]">
              <span className="font-semibold">Physicians Active</span>
              <Stethoscope className="h-4 w-4 text-[hsl(var(--primary))]" />
            </div>
            <p className="text-2xl font-extrabold text-[hsl(var(--foreground))] mt-1 font-mono">{totalDoctorsCount}</p>
            <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">Assigned clinics</p>
          </div>

          <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-3.5 shadow-[var(--shadow-sm)]">
            <div className="flex items-center justify-between text-xs text-[hsl(var(--success))]">
              <span className="font-semibold">In Consultation</span>
              <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" />
            </div>
            <p className="text-2xl font-extrabold text-[hsl(var(--success))] mt-1 font-mono">{activeConsultations}</p>
            <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">Active cabins</p>
          </div>

          <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-3.5 shadow-[var(--shadow-sm)]">
            <div className="flex items-center justify-between text-xs text-[hsl(var(--primary))]">
              <span className="font-semibold">Total Waiting</span>
              <Users className="h-4 w-4 text-[hsl(var(--primary))]" />
            </div>
            <p className="text-2xl font-extrabold text-[hsl(var(--foreground))] mt-1 font-mono">{totalWaitingPatients}</p>
            <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">Across all departments</p>
          </div>

          <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-3.5 shadow-[var(--shadow-sm)]">
            <div className="flex items-center justify-between text-xs text-[hsl(var(--warning))]">
              <span className="font-semibold">Break / Delayed</span>
              <Coffee className="h-4 w-4 text-[hsl(var(--warning))]" />
            </div>
            <p className="text-2xl font-extrabold text-[hsl(var(--warning))] mt-1 font-mono">{onBreakOrDelayed}</p>
            <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">Temporary adjustments</p>
          </div>

          <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-3.5 shadow-[var(--shadow-sm)]">
            <div className="flex items-center justify-between text-xs text-[hsl(var(--muted-foreground))]">
              <span className="font-semibold">Done Today</span>
              <CheckCircle2 className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
            </div>
            <p className="text-2xl font-extrabold text-[hsl(var(--foreground))] mt-1 font-mono">{totalCompleted}</p>
            <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">Completed visits</p>
          </div>
        </div>

        {/* Doctor Live Cabin Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-64 rounded-[var(--radius-2xl)] bg-[hsl(var(--card))] border border-[hsl(var(--card-border))] animate-pulse p-6" />
            ))
          ) : doctors.length === 0 ? (
            <div className="col-span-full py-16 text-center text-xs text-[hsl(var(--muted-foreground))]">
              No active doctor queues found for the selected branch.
            </div>
          ) : (
            doctors.map((doc) => {
              const status = doc.doctorStatus.status;
              const isOnBreak = status === "ON_BREAK";
              const isDelayed = status === "DELAYED";

              return (
                <div
                  key={doc.doctorId}
                  className="rounded-[var(--radius-2xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow)] transition-all flex flex-col justify-between"
                >
                  {/* Doctor Info & Status */}
                  <div>
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-[hsl(var(--border))]">
                      <div>
                        <h3 className="font-bold text-base text-[hsl(var(--foreground))]">{doc.doctorName}</h3>
                        <p className="text-xs font-medium text-[hsl(var(--primary))]">{doc.specialty}</p>
                        <p className="text-[11px] text-[hsl(var(--muted-foreground))]">{doc.branchName}</p>
                      </div>

                      <div>
                        {isOnBreak ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase bg-[hsl(var(--warning-light))] text-[hsl(var(--warning))] px-2.5 py-1 rounded-[var(--radius-full)]">
                            <Coffee className="h-3 w-3" /> On Break ({doc.doctorStatus.delayMinutes}m)
                          </span>
                        ) : isDelayed ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase bg-[hsl(var(--info-light))] text-[hsl(var(--info))] px-2.5 py-1 rounded-[var(--radius-full)]">
                            <AlertTriangle className="h-3 w-3" /> Delayed ({doc.doctorStatus.delayMinutes}m)
                          </span>
                        ) : doc.currentTokenNumber ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase bg-[hsl(var(--success-light))] text-[hsl(var(--success))] px-2.5 py-1 rounded-[var(--radius-full)] animate-pulse">
                            <CheckCircle2 className="h-3 w-3" /> Consulting
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase bg-[hsl(var(--muted)/0.3)] text-[hsl(var(--muted-foreground))] px-2.5 py-1 rounded-[var(--radius-full)]">
                            Idle
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Active Cabin Focus */}
                    <div className="my-4 p-4 rounded-[var(--radius-xl)] bg-[hsl(var(--primary-light))] border border-[hsl(var(--primary)/0.2)] flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-[hsl(var(--primary))] tracking-wider block">
                          Current Cabin Token
                        </span>
                        <span className="text-2xl sm:text-3xl font-extrabold text-[hsl(var(--primary))] font-mono block mt-0.5">
                          {doc.currentTokenNumber || "None"}
                        </span>
                        <span className="text-xs text-[hsl(var(--foreground))] font-medium truncate block max-w-[160px]">
                          {doc.currentPatientName || "Waiting for call"}
                        </span>
                      </div>

                      <div className="text-right font-mono">
                        <span className="text-[10px] uppercase font-semibold text-[hsl(var(--muted-foreground))] block">
                          Estimated Wait
                        </span>
                        <span className="text-xl font-bold text-[hsl(var(--foreground))] block mt-0.5">
                          ~{doc.estimatedWaitMinutes}m
                        </span>
                        <span className="text-[10px] text-[hsl(var(--muted-foreground))] block">
                          {doc.avgDurationMinutes}m / patient
                        </span>
                      </div>
                    </div>

                    {/* Mini Stats Bar */}
                    <div className="grid grid-cols-3 gap-2 text-center text-xs pb-4">
                      <div className="p-2 rounded-[var(--radius-md)] bg-[hsl(var(--muted)/0.2)]">
                        <span className="text-[10px] text-[hsl(var(--muted-foreground))] block">Waiting</span>
                        <span className="font-bold text-sm text-[hsl(var(--foreground))] font-mono">{doc.waitingCount}</span>
                      </div>
                      <div className="p-2 rounded-[var(--radius-md)] bg-[hsl(var(--muted)/0.2)]">
                        <span className="text-[10px] text-[hsl(var(--muted-foreground))] block">Done</span>
                        <span className="font-bold text-sm text-[hsl(var(--success))] font-mono">{doc.completedCount}</span>
                      </div>
                      <div className="p-2 rounded-[var(--radius-md)] bg-[hsl(var(--muted)/0.2)]">
                        <span className="text-[10px] text-[hsl(var(--muted-foreground))] block">Total</span>
                        <span className="font-bold text-sm text-[hsl(var(--foreground))] font-mono">{doc.totalToday}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-4 border-t border-[hsl(var(--border))] flex items-center justify-between gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenReorderModal(doc)}
                      className="text-xs flex items-center gap-1"
                    >
                      <ArrowUpDown className="h-3.5 w-3.5" /> Reorder
                    </Button>

                    <div className="flex items-center gap-2">
                      <Link href={`/patient/queue/${doc.doctorId}`}>
                        <Button variant="ghost" size="sm" className="text-xs">
                          Live View
                        </Button>
                      </Link>

                      <Button
                        size="sm"
                        onClick={() => handleCallNext(doc)}
                        disabled={callingDoctorIds[doc.doctorId] || doc.waitingCount === 0}
                        className="text-xs flex items-center gap-1 font-bold"
                      >
                        <PhoneCall className="h-3.5 w-3.5" />
                        {callingDoctorIds[doc.doctorId] ? "Calling..." : "Call Next"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Priority Reorder Modal */}
      <Modal
        open={Boolean(selectedDoctorForReorder)}
        onClose={() => setSelectedDoctorForReorder(null)}
        title="Administrative Queue Priority & Reordering"
        description={`Adjust waiting queue sequence for ${selectedDoctorForReorder?.doctorName} (${selectedDoctorForReorder?.specialty}).`}
      >
        <div className="space-y-4 pt-2 text-xs">
          <div>
            <label className="font-semibold block mb-1">Select Patient to Reorder</label>
            <select
              value={selectedAppointmentId}
              onChange={(e) => setSelectedAppointmentId(e.target.value)}
              className="w-full rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] p-2.5 text-xs text-[hsl(var(--foreground))] focus:border-[hsl(var(--primary))] focus:outline-none"
            >
              {doctorQueueDetails?.queue
                .filter((q) => q.status === "WAITING")
                .map((q) => (
                  <option key={q.appointmentId} value={q.appointmentId}>
                    Position #{q.position} — Token {q.tokenNumber} ({q.patientName}) — {q.scheduledTime}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="font-semibold block mb-1">New Target Position in Waiting Queue</label>
            <input
              type="number"
              min={1}
              max={doctorQueueDetails?.waitingCount || 10}
              value={targetPosition}
              onChange={(e) => setTargetPosition(parseInt(e.target.value, 10))}
              className="w-full rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] p-2.5 text-xs text-[hsl(var(--foreground))] focus:border-[hsl(var(--primary))] focus:outline-none font-mono"
            />
            <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-1">
              Position 1 will be next in line to be called into the cabin.
            </p>
          </div>

          <div>
            <label className="font-semibold block mb-1">
              Reason for Priority Reorder <span className="text-[hsl(var(--danger))]">*</span>
            </label>
            <textarea
              rows={2}
              value={reorderReason}
              onChange={(e) => setReorderReason(e.target.value)}
              placeholder="e.g., Clinical triage priority, urgent vitals reassessment"
              className="w-full rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] p-2.5 text-xs text-[hsl(var(--foreground))] focus:border-[hsl(var(--primary))] focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[hsl(var(--border))]">
            <Button variant="outline" size="sm" onClick={() => setSelectedDoctorForReorder(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmReorder}
              disabled={isSubmittingReorder || !reorderReason.trim()}
            >
              {isSubmittingReorder ? "Reordering..." : "Save Position"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
