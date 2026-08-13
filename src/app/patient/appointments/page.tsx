"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Calendar, Plus, RefreshCw, AlertCircle } from "lucide-react";
import { AppointmentCard } from "@/components/patient/AppointmentCard";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import type { AppointmentDTO } from "@/lib/services/AppointmentService";

export default function PatientAppointmentsPage() {
  const [tab, setTab] = React.useState<"upcoming" | "past">("upcoming");
  const [upcoming, setUpcoming] = React.useState<AppointmentDTO[]>([]);
  const [past, setPast] = React.useState<AppointmentDTO[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Cancellation modal state
  const [cancelModalAptId, setCancelModalAptId] = React.useState<string | null>(null);
  const [cancelReason, setCancelReason] = React.useState("");
  const [isCancelling, setIsCancelling] = React.useState(false);

  // Reschedule state
  const [rescheduleApt, setRescheduleApt] = React.useState<AppointmentDTO | null>(null);
  const [newDate, setNewDate] = React.useState("");
  const [newTime, setNewTime] = React.useState("");
  const [isRescheduling, setIsRescheduling] = React.useState(false);

  const [checkingInId, setCheckingInId] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);
  const { addToast } = useToast();

  React.useEffect(() => {
    let isMounted = true;
    const run = async () => {
      try {
        const res = await fetch("/api/v1/appointments");
        const json = await res.json();
        if (!isMounted) return;
        if (res.ok && json.data) {
          setUpcoming(json.data.upcoming || []);
          setPast(json.data.past || []);
        } else {
          setError(json.error?.message || "Failed to load appointments");
        }
      } catch {
        if (isMounted) setError("Network error loading appointments");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    run();
    return () => {
      isMounted = false;
    };
  }, [reloadKey]);

  const handleCheckIn = async (appointmentId: string) => {
    setCheckingInId(appointmentId);
    try {
      const res = await fetch(`/api/v1/appointments/${appointmentId}/checkin`, {
        method: "POST",
      });
      const json = await res.json();
      if (res.ok) {
        addToast({
          type: json.data?.isLate ? "warning" : "success",
          title: json.data?.isLate ? "Checked In (Grace Period)" : "Checked In!",
          description: json.meta?.message || "You have been added to the doctor's active waiting queue.",
        });
        setReloadKey((k) => k + 1);
      } else {
        addToast({
          type: "error",
          title: "Check-in Failed",
          description: json.error?.message || "Could not check in.",
        });
      }
    } catch {
      addToast({
        type: "error",
        title: "Network Error",
        description: "Please try checking in again.",
      });
    } finally {
      setCheckingInId(null);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelModalAptId || !cancelReason.trim()) return;
    setIsCancelling(true);
    try {
      const res = await fetch(`/api/v1/appointments/${cancelModalAptId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", reason: cancelReason }),
      });
      const json = await res.json();
      if (res.ok) {
        addToast({
          type: "success",
          title: "Appointment Cancelled",
          description: "Your slot has been released.",
        });
        setCancelModalAptId(null);
        setCancelReason("");
        setReloadKey((k) => k + 1);
      } else {
        addToast({
          type: "error",
          title: "Cancellation Error",
          description: json.error?.message || "Could not cancel.",
        });
      }
    } finally {
      setIsCancelling(false);
    }
  };

  const handleConfirmReschedule = async () => {
    if (!rescheduleApt || !newDate || !newTime) return;
    setIsRescheduling(true);
    try {
      const res = await fetch(`/api/v1/appointments/${rescheduleApt.id}`, {
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
        setRescheduleApt(null);
        setNewDate("");
        setNewTime("");
        setReloadKey((k) => k + 1);
      } else {
        addToast({
          type: "error",
          title: "Reschedule Failed",
          description: json.error?.message || "Slot not available.",
        });
      }
    } finally {
      setIsRescheduling(false);
    }
  };

  const currentList = tab === "upcoming" ? upcoming : past;

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] pb-12">
      {/* ─── Header ───────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-[hsl(var(--border))] bg-[hsl(var(--background)/0.8)] backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/patient/dashboard">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-lg)] bg-[hsl(var(--primary))] text-white shadow-[var(--shadow-sm)]">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-[hsl(var(--foreground))]">
                My Appointments
              </h1>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Manage upcoming bookings, check-in, and history
              </p>
            </div>
          </div>

          <Link href="/patient/search">
            <Button size="sm" className="text-xs flex items-center gap-1.5">
              <Plus className="h-4 w-4" />
              Book New
            </Button>
          </Link>
        </div>
      </header>

      {/* ─── Main Content ─────────────────────────────────── */}
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Tab switchers */}
        <div className="flex items-center gap-2 border-b border-[hsl(var(--border))] pb-3">
          <button
            onClick={() => setTab("upcoming")}
            className={`px-4 py-2 text-xs font-bold rounded-[var(--radius-lg)] transition-all ${
              tab === "upcoming"
                ? "bg-[hsl(var(--primary))] text-white shadow-[var(--shadow-sm)]"
                : "bg-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
            }`}
          >
            Upcoming Appointments ({upcoming.length})
          </button>
          <button
            onClick={() => setTab("past")}
            className={`px-4 py-2 text-xs font-bold rounded-[var(--radius-lg)] transition-all ${
              tab === "past"
                ? "bg-[hsl(var(--primary))] text-white shadow-[var(--shadow-sm)]"
                : "bg-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
            }`}
          >
            Past & Cancelled ({past.length})
          </button>
        </div>

        {/* Appointments List */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-40 rounded-[var(--radius-xl)] bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-6 animate-pulse"
              />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--danger-light))] bg-[hsl(var(--card))] p-8 text-center max-w-md mx-auto">
            <AlertCircle className="h-8 w-8 text-[hsl(var(--danger))] mx-auto mb-2" />
            <h3 className="font-bold text-sm text-[hsl(var(--foreground))]">{error}</h3>
            <Button size="sm" onClick={() => setReloadKey((k) => k + 1)} className="mt-4 text-xs">
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Try Again
            </Button>
          </div>
        ) : currentList.length === 0 ? (
          <div className="rounded-[var(--radius-2xl)] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-12 text-center max-w-md mx-auto">
            <Calendar className="h-10 w-10 text-[hsl(var(--muted-foreground))] mx-auto mb-3" />
            <h3 className="text-base font-bold text-[hsl(var(--foreground))]">
              No {tab === "upcoming" ? "upcoming" : "past"} appointments
            </h3>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
              {tab === "upcoming"
                ? "You don't have any appointments scheduled right now."
                : "Your past consultation records will show up here."}
            </p>
            {tab === "upcoming" && (
              <Link href="/patient/search">
                <Button size="sm" className="mt-5 text-xs">
                  Find a Doctor & Book Slot
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {currentList.map((apt) => (
              <div key={apt.id} className="relative group">
                <AppointmentCard
                  appointment={apt}
                  onCancel={(id) => setCancelModalAptId(id)}
                  onReschedule={(a) => {
                    setRescheduleApt(a);
                    setNewDate(a.date);
                    setNewTime(a.startTime);
                  }}
                  onCheckIn={handleCheckIn}
                  isCheckingIn={checkingInId === apt.id}
                />
                <Link
                  href={`/patient/appointments/${apt.id}`}
                  className="absolute top-4 right-4 text-[10px] font-semibold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] underline underline-offset-2 transition-colors z-10"
                >
                  View Details →
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Cancellation Modal */}
      <Modal
        open={Boolean(cancelModalAptId)}
        onClose={() => setCancelModalAptId(null)}
        title="Cancel Appointment"
        description="Are you sure you want to cancel this appointment? Your slot will be released."
      >
        <div className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-semibold text-[hsl(var(--foreground))] block mb-1">
              Reason for Cancellation
            </label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g., Personal emergency, feeling better, scheduling conflict..."
              rows={3}
              className="w-full rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] p-2.5 text-xs text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCancelModalAptId(null)}
              className="text-xs"
            >
              Keep Appointment
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmCancel}
              disabled={isCancelling || cancelReason.trim().length < 3}
              className="text-xs"
            >
              {isCancelling ? "Cancelling..." : "Confirm Cancellation"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reschedule Modal */}
      <Modal
        open={Boolean(rescheduleApt)}
        onClose={() => setRescheduleApt(null)}
        title="Reschedule Appointment"
        description={`Reschedule with ${rescheduleApt?.doctorName}`}
      >
        <div className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-semibold text-[hsl(var(--foreground))] block mb-1">
              New Appointment Date
            </label>
            <input
              type="date"
              value={newDate}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] p-2.5 text-xs text-[hsl(var(--foreground))] focus:border-[hsl(var(--primary))] focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[hsl(var(--foreground))] block mb-1">
              New Start Time (HH:mm)
            </label>
            <input
              type="time"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className="w-full rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] p-2.5 text-xs text-[hsl(var(--foreground))] focus:border-[hsl(var(--primary))] focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRescheduleApt(null)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmReschedule}
              disabled={isRescheduling || !newDate || !newTime}
              className="text-xs"
            >
              {isRescheduling ? "Updating..." : "Confirm New Slot"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
