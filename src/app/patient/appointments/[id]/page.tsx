"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Ticket,
  CreditCard,
  AlertCircle,
  ShieldX,
  Radio,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { StatusPill } from "@/components/shared";
import { useToast } from "@/components/ui/toast";
import type { AppointmentDTO } from "@/lib/services/AppointmentService";

// ─── Skeleton ────────────────────────────────────────────

function AppointmentDetailSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-36 rounded-[var(--radius-xl)] bg-[hsl(var(--card))] border border-[hsl(var(--border))]" />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-20 rounded-[var(--radius-xl)] bg-[hsl(var(--card))] border border-[hsl(var(--border))]"
          />
        ))}
      </div>
      <div className="h-20 rounded-[var(--radius-xl)] bg-[hsl(var(--card))] border border-[hsl(var(--border))]" />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────

export default function AppointmentDetailPage() {
  const params = useParams();
  const appointmentId = params.id as string;

  const [appointment, setAppointment] = React.useState<AppointmentDTO | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [errorCode, setErrorCode] = React.useState<"NOT_FOUND" | "FORBIDDEN" | "SERVER_ERROR" | null>(null);

  // Cancel modal state
  const [cancelReason, setCancelReason] = React.useState("");
  const [isCancelOpen, setIsCancelOpen] = React.useState(false);
  const [isCancelling, setIsCancelling] = React.useState(false);

  // Reschedule modal state
  const [isRescheduleOpen, setIsRescheduleOpen] = React.useState(false);
  const [newDate, setNewDate] = React.useState("");
  const [newTime, setNewTime] = React.useState("");
  const [isRescheduling, setIsRescheduling] = React.useState(false);

  const { addToast } = useToast();

  React.useEffect(() => {
    let isMounted = true;
    const run = async () => {
      try {
        const res = await fetch(`/api/v1/appointments/${appointmentId}`);
        const json = await res.json();
        if (!isMounted) return;
        if (res.ok && json.data) {
          setAppointment(json.data);
        } else if (res.status === 404) {
          setErrorCode("NOT_FOUND");
        } else if (res.status === 403) {
          setErrorCode("FORBIDDEN");
        } else {
          setErrorCode("SERVER_ERROR");
        }
      } catch {
        if (isMounted) setErrorCode("SERVER_ERROR");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    run();
    return () => {
      isMounted = false;
    };
  }, [appointmentId]);

  const handleConfirmCancel = async () => {
    if (!cancelReason.trim()) return;
    setIsCancelling(true);
    try {
      const res = await fetch(`/api/v1/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", reason: cancelReason }),
      });
      const json = await res.json();
      if (res.ok) {
        addToast({ type: "success", title: "Appointment Cancelled", description: "Your slot has been released." });
        setIsCancelOpen(false);
        setCancelReason("");
        // Refresh the appointment
        setIsLoading(true);
        const refreshRes = await fetch(`/api/v1/appointments/${appointmentId}`);
        const refreshJson = await refreshRes.json();
        if (refreshRes.ok && refreshJson.data) setAppointment(refreshJson.data);
        setIsLoading(false);
      } else {
        addToast({ type: "error", title: "Cancellation Error", description: json.error?.message || "Could not cancel." });
      }
    } finally {
      setIsCancelling(false);
    }
  };

  const handleConfirmReschedule = async () => {
    if (!newDate || !newTime) return;
    setIsRescheduling(true);
    try {
      const res = await fetch(`/api/v1/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: newDate, startTime: newTime }),
      });
      const json = await res.json();
      if (res.ok) {
        addToast({
          type: "success",
          title: "Rescheduled!",
          description: `Appointment moved to ${newDate} at ${newTime}.`,
        });
        setIsRescheduleOpen(false);
        setNewDate("");
        setNewTime("");
        // Refresh the appointment
        setIsLoading(true);
        const refreshRes = await fetch(`/api/v1/appointments/${appointmentId}`);
        const refreshJson = await refreshRes.json();
        if (refreshRes.ok && refreshJson.data) setAppointment(refreshJson.data);
        setIsLoading(false);
      } else {
        addToast({ type: "error", title: "Reschedule Failed", description: json.error?.message || "Slot not available." });
      }
    } finally {
      setIsRescheduling(false);
    }
  };

  // Compute whether to show Live Queue button
  const showQueueButton = React.useMemo(() => {
    if (!appointment) return false;
    const todayStr = new Date().toISOString().slice(0, 10);
    const activeStatuses: AppointmentDTO["status"][] = ["CONFIRMED", "CHECKED_IN", "WAITING"];
    return appointment.date === todayStr && activeStatuses.includes(appointment.status);
  }, [appointment]);

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] pb-12">
      {/* ─── Header ───────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-[hsl(var(--border))] bg-[hsl(var(--background))] shadow-[var(--shadow-sm)]">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/patient/appointments">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-lg)] bg-[hsl(var(--primary))] text-white shadow-[var(--shadow-sm)]">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-serif text-lg font-normal text-[hsl(var(--foreground))]">
                Appointment Details
              </h1>
              <p className="text-xs text-[hsl(var(--muted-foreground))] font-sans">
                View and manage your clinical consultation
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Main Content ─────────────────────────────────── */}
      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-6 sm:py-8">
        {isLoading ? (
          <AppointmentDetailSkeleton />
        ) : errorCode === "NOT_FOUND" ? (
          <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-12 text-center max-w-md mx-auto mt-8">
            <AlertCircle className="h-10 w-10 text-[hsl(var(--danger))] mx-auto mb-4" />
            <h2 className="font-serif text-lg font-normal text-[hsl(var(--foreground))] mb-1">
              Appointment Not Found
            </h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-6 font-sans">
              This appointment doesn&apos;t exist or may have been removed.
            </p>
            <Link href="/patient/appointments">
              <Button size="sm" className="text-xs font-medium">
                Back to My Appointments
              </Button>
            </Link>
          </div>
        ) : errorCode === "FORBIDDEN" ? (
          <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--danger-light))] bg-[hsl(var(--card))] p-12 text-center max-w-md mx-auto mt-8">
            <ShieldX className="h-10 w-10 text-[hsl(var(--danger))] mx-auto mb-4" />
            <h2 className="font-serif text-lg font-normal text-[hsl(var(--foreground))] mb-1">
              Access Denied
            </h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-6 font-sans">
              This appointment doesn&apos;t belong to your account.
            </p>
            <Link href="/patient/appointments">
              <Button size="sm" className="text-xs font-medium">
                Back to My Appointments
              </Button>
            </Link>
          </div>
        ) : errorCode === "SERVER_ERROR" ? (
          <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-12 text-center max-w-md mx-auto mt-8">
            <AlertCircle className="h-10 w-10 text-[hsl(var(--muted-foreground))] mx-auto mb-4" />
            <h2 className="font-serif text-lg font-normal text-[hsl(var(--foreground))] mb-1">
              Something went wrong
            </h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-6 font-sans">
              Could not load appointment details. Please try again.
            </p>
            <Button size="sm" className="text-xs font-medium" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        ) : appointment ? (
          <div className="space-y-5">
            {/* ── Doctor / Header Card ── */}
            <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6 shadow-[var(--shadow-sm)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-[hsl(var(--muted))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] font-serif font-normal text-lg">
                    {appointment.doctorName.replace("Dr. ", "").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="font-serif text-xl font-normal text-[hsl(var(--foreground))]">
                      {appointment.doctorName}
                    </h2>
                    <p className="text-sm font-medium text-[hsl(var(--muted-foreground))]">
                      {appointment.doctorSpecialty}
                    </p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5 font-sans">
                      {appointment.branchName}
                      {appointment.branchAddress && ` · ${appointment.branchAddress}`}
                    </p>
                  </div>
                </div>
                <StatusPill
                  status={appointment.status.toLowerCase() as "confirmed" | "checked_in" | "waiting" | "in_consultation" | "completed" | "cancelled" | "no_show"}
                  className="self-start sm:self-center"
                />
              </div>
            </div>

            {/* ── Details Grid ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 font-sans">
              {/* Date */}
              <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-4 flex flex-col gap-2 shadow-[var(--shadow-sm)]">
                <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  <Calendar className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
                  Date
                </div>
                <span className="text-sm font-medium text-[hsl(var(--foreground))]">{appointment.date}</span>
              </div>

              {/* Time */}
              <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-4 flex flex-col gap-2 shadow-[var(--shadow-sm)]">
                <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  <Clock className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
                  Time
                </div>
                <span className="text-sm font-mono text-[hsl(var(--foreground))]">{appointment.startTime}</span>
              </div>

              {/* Token */}
              <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-4 flex flex-col gap-2 shadow-[var(--shadow-sm)]">
                <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  <Ticket className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
                  Token
                </div>
                <span className="text-sm font-mono font-medium text-[hsl(var(--primary))]">{appointment.tokenNumber}</span>
              </div>

              {/* Branch */}
              <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-4 flex flex-col gap-2 shadow-[var(--shadow-sm)]">
                <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  <MapPin className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
                  Branch
                </div>
                <span className="text-sm font-medium text-[hsl(var(--foreground))] leading-snug">{appointment.branchName}</span>
              </div>

              {/* Fee */}
              <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-4 flex flex-col gap-2 shadow-[var(--shadow-sm)]">
                <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  <CreditCard className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
                  Consultation Fee
                </div>
                <span className="text-sm font-mono text-[hsl(var(--foreground))]">₹{appointment.fee}</span>
              </div>

              {/* Queue Position */}
              {appointment.queuePosition != null && (
                <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-4 flex flex-col gap-2 shadow-[var(--shadow-sm)]">
                  <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                    <Ticket className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
                    Queue Position
                  </div>
                  <span className="text-sm font-mono font-medium text-[hsl(var(--foreground))]">#{appointment.queuePosition}</span>
                </div>
              )}
            </div>

            {/* Cancellation reason banner */}
            {appointment.cancelReason && (
              <div className="rounded-[var(--radius-md)] border border-[hsl(var(--danger)/0.3)] bg-[hsl(var(--danger-light))] p-4 text-xs text-[hsl(var(--danger))]">
                <span className="font-semibold">Cancellation reason: </span>
                {appointment.cancelReason}
              </div>
            )}

            {/* Checked-in banner */}
            {appointment.checkedInAt && (
              <div className="rounded-[var(--radius-md)] border border-[hsl(var(--success)/0.3)] bg-[hsl(var(--success-light))] p-4 text-xs text-[hsl(var(--success))]">
                Checked in at{" "}
                {new Date(appointment.checkedInAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                — You are in the active queue.
              </div>
            )}

            {/* ── Action Buttons ── */}
            <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-5 shadow-[var(--shadow-sm)] flex flex-col sm:flex-row gap-3">
              {/* Live Queue — only today + active status */}
              {showQueueButton && (
                <Link
                  href={`/patient/queue/${appointment.doctorId}?token=${appointment.tokenNumber}`}
                  className="flex-1"
                >
                  <Button size="sm" className="w-full text-xs flex items-center justify-center gap-1.5 font-medium">
                    <Radio className="h-3.5 w-3.5" />
                    View Live Queue
                  </Button>
                </Link>
              )}

              {/* Reschedule — only CONFIRMED */}
              {appointment.status === "CONFIRMED" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs font-medium"
                  onClick={() => {
                    setNewDate(appointment.date);
                    setNewTime(appointment.startTime);
                    setIsRescheduleOpen(true);
                  }}
                >
                  Reschedule
                </Button>
              )}

              {/* Cancel — only CONFIRMED */}
              {appointment.status === "CONFIRMED" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 text-xs text-[hsl(var(--danger))] hover:bg-[hsl(var(--danger-light))]"
                  onClick={() => setIsCancelOpen(true)}
                >
                  Cancel Appointment
                </Button>
              )}

              {/* If no actions available, show disabled state message */}
              {!showQueueButton && appointment.status !== "CONFIRMED" && (
                <p className="text-xs text-[hsl(var(--muted-foreground))] self-center">
                  No actions available for this appointment.
                </p>
              )}
            </div>

            {/* Prescription link if prescriptionId exists */}
            {(appointment as AppointmentDTO & { prescriptionId?: string }).prescriptionId && (
              <Link
                href={`/patient/prescriptions/${(appointment as AppointmentDTO & { prescriptionId?: string }).prescriptionId}`}
                className="flex items-center gap-2 text-xs font-medium text-[hsl(var(--primary))] hover:underline"
              >
                <FileText className="h-4 w-4" />
                View Prescription
              </Link>
            )}
          </div>
        ) : null}
      </main>

      {/* ─── Cancel Modal ─────────────────────────────────── */}
      <Modal
        open={isCancelOpen}
        onClose={() => setIsCancelOpen(false)}
        title="Cancel Appointment"
        description="Are you sure you want to cancel this appointment? Your slot will be released."
      >
        <div className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-medium text-[hsl(var(--foreground))] block mb-1">
              Reason for Cancellation
            </label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g., Personal emergency, feeling better, scheduling conflict..."
              rows={3}
              className="w-full rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] p-2.5 text-xs text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-[hsl(var(--input-focus)/0.4)] focus-visible:border-[hsl(var(--input-focus))] transition-colors"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsCancelOpen(false)} className="text-xs">
              Keep Appointment
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmCancel}
              disabled={isCancelling || cancelReason.trim().length < 3}
              className="text-xs font-medium"
            >
              {isCancelling ? "Cancelling..." : "Confirm Cancellation"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─── Reschedule Modal ─────────────────────────────── */}
      <Modal
        open={isRescheduleOpen}
        onClose={() => setIsRescheduleOpen(false)}
        title="Reschedule Appointment"
        description={`Reschedule with ${appointment?.doctorName ?? ""}`}
      >
        <div className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-medium text-[hsl(var(--foreground))] block mb-1">
              New Appointment Date
            </label>
            <input
              type="date"
              value={newDate}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] p-2.5 text-xs text-[hsl(var(--foreground))] focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-[hsl(var(--input-focus)/0.4)] focus-visible:border-[hsl(var(--input-focus))] transition-colors"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[hsl(var(--foreground))] block mb-1">
              New Start Time (HH:mm)
            </label>
            <input
              type="time"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className="w-full rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] p-2.5 text-xs text-[hsl(var(--foreground))] focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-[hsl(var(--input-focus)/0.4)] focus-visible:border-[hsl(var(--input-focus))] transition-colors"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsRescheduleOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmReschedule}
              disabled={isRescheduling || !newDate || !newTime}
              className="text-xs font-medium"
            >
              {isRescheduling ? "Updating..." : "Confirm New Slot"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
