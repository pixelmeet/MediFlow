"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Clock, Calendar, Save, Plus, Trash2, ShieldAlert, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { SlotGrid } from "@/components/patient/SlotGrid";
import type { TimeSlot } from "@/lib/services/SchedulingService";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

interface DayScheduleState {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  breakStart?: string | null;
  breakEnd?: string | null;
  isWorkingDay: boolean;
}

interface BlockedSlotState {
  id: string;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  reason?: string | null;
  isFullDay: boolean;
}

export default function DoctorSchedulePage() {
  const { user, logout, isLoading: isAuthLoading } = useAuth();
  const doctorId = user?.doctorId;
  const { addToast } = useToast();

  const [appointmentDuration, setAppointmentDuration] = React.useState(20);
  const [schedules, setSchedules] = React.useState<DayScheduleState[]>([]);
  const [blockedSlots, setBlockedSlots] = React.useState<BlockedSlotState[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [reloadKey, setReloadKey] = React.useState(0);

  // Blocked slot modal state
  const [isAddBlockedOpen, setIsAddBlockedOpen] = React.useState(false);
  const [blockDate, setBlockDate] = React.useState("");
  const [blockReason, setBlockReason] = React.useState("");
  const [isFullDay, setIsFullDay] = React.useState(true);
  const [blockStartTime, setBlockStartTime] = React.useState("13:00");
  const [blockEndTime, setBlockEndTime] = React.useState("15:00");
  const [isAddingBlocked, setIsAddingBlocked] = React.useState(false);

  // Live preview state
  const [previewDate, setPreviewDate] = React.useState(
    new Date().toISOString().slice(0, 10)
  );
  const [previewSlots, setPreviewSlots] = React.useState<TimeSlot[]>([]);
  const [isLoadingPreview, setIsLoadingPreview] = React.useState(false);

  // Fetch schedule
  React.useEffect(() => {
    if (!doctorId) return;
    let isMounted = true;
    const fetchSchedule = async () => {
      try {
        const res = await fetch(`/api/v1/doctors/${doctorId}/schedule`);
        const json = await res.json();
        if (!isMounted) return;

        if (res.ok && json.data) {
          setAppointmentDuration(json.data.appointmentDurationMin || 20);
          setSchedules(json.data.schedules || []);
          setBlockedSlots(json.data.blockedSlots || []);
        }
      } catch {
        console.error("Failed to load schedule");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchSchedule();
    return () => {
      isMounted = false;
    };
  }, [doctorId, reloadKey]);

  // Fetch live preview slots
  React.useEffect(() => {
    if (!doctorId) return;
    let isMounted = true;
    const fetchPreview = async () => {
      setIsLoadingPreview(true);
      try {
        const res = await fetch(`/api/v1/doctors/${doctorId}/availability?date=${previewDate}`);
        const json = await res.json();
        if (!isMounted) return;
        if (res.ok && json.data) {
          setPreviewSlots(json.data.slots || []);
        }
      } catch {
        if (isMounted) setPreviewSlots([]);
      } finally {
        if (isMounted) setIsLoadingPreview(false);
      }
    };

    fetchPreview();
    return () => {
      isMounted = false;
    };
  }, [doctorId, previewDate, reloadKey]);

  const handleDayToggle = (dayIndex: number) => {
    setSchedules((prev) =>
      prev.map((day) =>
        day.dayOfWeek === dayIndex ? { ...day, isWorkingDay: !day.isWorkingDay } : day
      )
    );
  };

  const handleTimeChange = (
    dayIndex: number,
    field: "startTime" | "endTime" | "breakStart" | "breakEnd",
    value: string
  ) => {
    setSchedules((prev) =>
      prev.map((day) =>
        day.dayOfWeek === dayIndex ? { ...day, [field]: value } : day
      )
    );
  };

  const handleSaveSchedule = async () => {
    if (!doctorId) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/v1/doctors/${doctorId}/schedule`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentDurationMin: appointmentDuration,
          schedules,
        }),
      });

      const json = await res.json();

      if (res.ok) {
        addToast({
          type: "success",
          title: "Schedule Saved",
          description: "Your weekly availability & consultation duration have been updated.",
        });
        setReloadKey((k) => k + 1);
      } else {
        addToast({
          type: "error",
          title: "Save Failed",
          description: json.error?.message || "Could not save schedule.",
        });
      }
    } catch {
      addToast({
        type: "error",
        title: "Network Error",
        description: "Failed to connect to server.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddBlockedSlot = async () => {
    if (!blockDate || !doctorId) return;
    setIsAddingBlocked(true);

    try {
      const res = await fetch(`/api/v1/doctors/${doctorId}/blocked-slots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: blockDate,
          reason: blockReason || "Doctor on leave",
          isFullDay,
          startTime: isFullDay ? null : blockStartTime,
          endTime: isFullDay ? null : blockEndTime,
        }),
      });

      const json = await res.json();

      if (res.ok) {
        addToast({
          type: "success",
          title: "Slot Blocked",
          description: json.meta?.message || "Blocked slot successfully added.",
        });
        setIsAddBlockedOpen(false);
        setBlockDate("");
        setBlockReason("");
        setReloadKey((k) => k + 1);
      } else {
        addToast({
          type: "error",
          title: "Error",
          description: json.error?.message || "Failed to block slot.",
        });
      }
    } catch {
      addToast({
        type: "error",
        title: "Network Error",
        description: "Failed to add blocked slot.",
      });
    } finally {
      setIsAddingBlocked(false);
    }
  };

  const handleDeleteBlockedSlot = async (slotId: string) => {
    if (!doctorId) return;
    try {
      const res = await fetch(`/api/v1/doctors/${doctorId}/blocked-slots/${slotId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        addToast({
          type: "success",
          title: "Unblocked",
          description: "Blocked slot has been removed.",
        });
        setReloadKey((k) => k + 1);
      } else {
        addToast({
          type: "error",
          title: "Error",
          description: "Failed to remove blocked slot.",
        });
      }
    } catch {
      addToast({
        type: "error",
        title: "Network Error",
        description: "Could not connect to server.",
      });
    }
  };

  if (isAuthLoading || (doctorId && isLoading)) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-[hsl(var(--background))] p-8">
        <div className="max-w-5xl mx-auto space-y-6 animate-pulse">
          <div className="h-20 rounded-[var(--radius-xl)] bg-[hsl(var(--card))] border border-[hsl(var(--border))]" />
          <div className="h-96 rounded-[var(--radius-xl)] bg-[hsl(var(--card))] border border-[hsl(var(--border))]" />
        </div>
      </div>
    );
  }

  if (!user || user.role !== "DOCTOR" || !doctorId) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-[hsl(var(--background))] p-4">
        <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 text-center max-w-md shadow-[var(--shadow-sm)]">
          <ShieldAlert className="h-10 w-10 text-[hsl(var(--danger))] mx-auto mb-3" />
          <h2 className="text-lg font-bold text-[hsl(var(--foreground))] mb-1">
            Unable to load your doctor profile
          </h2>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mb-6">
            Please ensure you are signed in with an active Doctor account or contact administration.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/doctor/dashboard">
              <Button size="sm" variant="outline" className="text-xs">
                Back to Dashboard
              </Button>
            </Link>
            <Button size="sm" onClick={logout} className="text-xs">
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Ensure 7 days are ordered Mon-Sun for natural clinical workflow
  const orderedSchedules = [1, 2, 3, 4, 5, 6, 0].map((dayIdx) => {
    const found = schedules.find((s) => s.dayOfWeek === dayIdx);
    return (
      found || {
        dayOfWeek: dayIdx,
        startTime: "09:00",
        endTime: "17:00",
        breakStart: "13:00",
        breakEnd: "14:00",
        isWorkingDay: dayIdx !== 0,
      }
    );
  });

  return (
    <div className="bg-[hsl(var(--background))] pb-16">
      {/* ─── Header / Action Bar ──────────────────────────── */}
      <div className="border-b border-[hsl(var(--border))] bg-[hsl(var(--card)/0.6)] backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/doctor/dashboard">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-[hsl(var(--foreground))]">
                Schedule & Availability Management
              </h1>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Configure working hours, break windows, slot durations & holidays
              </p>
            </div>
          </div>

          <Button
            size="sm"
            onClick={handleSaveSchedule}
            disabled={isSaving}
            className="text-xs flex items-center gap-1.5 font-bold shadow-[var(--shadow-sm)]"
          >
            <Save className="h-3.5 w-3.5" />
            {isSaving ? "Saving Changes..." : "Save Schedule"}
          </Button>
        </div>
      </div>

      {/* ─── Main Content ─────────────────────────────────── */}
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        {/* Top Setting: Consultation Duration */}
        <div className="rounded-[var(--radius-2xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6 shadow-[var(--shadow-sm)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
                <Clock className="h-4 w-4 text-[hsl(var(--primary))]" />
                Appointment Consultation Duration
              </h2>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                The scheduling engine divides your working day into discrete slots based on this duration.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {[15, 20, 30, 45].map((dur) => (
                <button
                  key={dur}
                  type="button"
                  onClick={() => setAppointmentDuration(dur)}
                  className={`px-3.5 py-1.5 rounded-[var(--radius-lg)] text-xs font-bold transition-all ${
                    appointmentDuration === dur
                      ? "bg-[hsl(var(--primary))] text-white shadow-[var(--shadow-sm)] scale-105"
                      : "bg-[hsl(var(--muted)/0.3)] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/0.5)]"
                  }`}
                >
                  {dur} Minutes
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Weekly Working Hours Matrix */}
        <div className="rounded-[var(--radius-2xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6 shadow-[var(--shadow-sm)] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[hsl(var(--border))]">
            <div>
              <h2 className="text-base font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[hsl(var(--primary))]" />
                Weekly Working Hours & Breaks
              </h2>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                Configure your shift hours and daily lunch/break intervals for each day of the week.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {orderedSchedules.map((day) => {
              const dayName = DAY_NAMES[day.dayOfWeek];
              return (
                <div
                  key={day.dayOfWeek}
                  className={`p-4 rounded-[var(--radius-xl)] border transition-all ${
                    day.isWorkingDay
                      ? "bg-[hsl(var(--card))] border-[hsl(var(--card-border))]"
                      : "bg-[hsl(var(--muted)/0.15)] border-dashed border-[hsl(var(--border))] opacity-70"
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Day Toggle & Name */}
                    <div className="flex items-center gap-3 w-40 shrink-0">
                      <input
                        type="checkbox"
                        checked={day.isWorkingDay}
                        onChange={() => handleDayToggle(day.dayOfWeek)}
                        className="h-4 w-4 rounded text-[hsl(var(--primary))] focus:ring-[hsl(var(--primary))] cursor-pointer"
                        id={`toggle-${day.dayOfWeek}`}
                      />
                      <label
                        htmlFor={`toggle-${day.dayOfWeek}`}
                        className={`text-sm font-bold cursor-pointer ${
                          day.isWorkingDay
                            ? "text-[hsl(var(--foreground))]"
                            : "text-[hsl(var(--muted-foreground))]"
                        }`}
                      >
                        {dayName}
                      </label>
                    </div>

                    {day.isWorkingDay ? (
                      <div className="flex flex-wrap items-center gap-4 text-xs">
                        {/* Working Hours */}
                        <div className="flex items-center gap-2 bg-[hsl(var(--muted)/0.2)] p-2 rounded-[var(--radius-md)]">
                          <span className="font-semibold text-[hsl(var(--muted-foreground))]">
                            Shift:
                          </span>
                          <input
                            type="time"
                            value={day.startTime}
                            onChange={(e) =>
                              handleTimeChange(day.dayOfWeek, "startTime", e.target.value)
                            }
                            className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded px-2 py-1 font-mono text-xs text-[hsl(var(--foreground))]"
                          />
                          <span>to</span>
                          <input
                            type="time"
                            value={day.endTime}
                            onChange={(e) =>
                              handleTimeChange(day.dayOfWeek, "endTime", e.target.value)
                            }
                            className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded px-2 py-1 font-mono text-xs text-[hsl(var(--foreground))]"
                          />
                        </div>

                        {/* Break Window */}
                        <div className="flex items-center gap-2 bg-[hsl(var(--warning-light)/0.5)] p-2 rounded-[var(--radius-md)] border border-[hsl(var(--warning)/0.2)]">
                          <span className="font-semibold text-[hsl(var(--warning))]">
                            Break:
                          </span>
                          <input
                            type="time"
                            value={day.breakStart || "13:00"}
                            onChange={(e) =>
                              handleTimeChange(day.dayOfWeek, "breakStart", e.target.value)
                            }
                            className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded px-2 py-1 font-mono text-xs text-[hsl(var(--foreground))]"
                          />
                          <span>to</span>
                          <input
                            type="time"
                            value={day.breakEnd || "14:00"}
                            onChange={(e) =>
                              handleTimeChange(day.dayOfWeek, "breakEnd", e.target.value)
                            }
                            className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded px-2 py-1 font-mono text-xs text-[hsl(var(--foreground))]"
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted)/0.3)] px-3 py-1.5 rounded-[var(--radius-full)]">
                        Clinic Closed / Day Off
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Blocked Slots & Holidays Section */}
        <div className="rounded-[var(--radius-2xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6 shadow-[var(--shadow-sm)] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[hsl(var(--border))]">
            <div>
              <h2 className="text-base font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-[hsl(var(--danger))]" />
                Blocked Slots & Scheduled Holidays
              </h2>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                Block whole dates or custom hour intervals for vacations, conferences, or leave.
              </p>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsAddBlockedOpen(true)}
              className="text-xs flex items-center gap-1 border-[hsl(var(--primary))] text-[hsl(var(--primary))]"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Blocked Slot / Leave
            </Button>
          </div>

          {blockedSlots.length === 0 ? (
            <div className="text-center py-6 text-xs text-[hsl(var(--muted-foreground))]">
              No upcoming blocked dates or leaves scheduled.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {blockedSlots.map((slot) => (
                <div
                  key={slot.id}
                  className="rounded-[var(--radius-xl)] border border-[hsl(var(--danger)/0.2)] bg-[hsl(var(--danger-light)/0.3)] p-4 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-[hsl(var(--foreground))]">
                      {slot.date}
                    </div>
                    <div className="text-[hsl(var(--muted-foreground))] mt-0.5">
                      {slot.isFullDay
                        ? "Full Day Off"
                        : `${slot.startTime} - ${slot.endTime}`}
                    </div>
                    <div className="text-[11px] text-[hsl(var(--danger))] font-medium mt-1">
                      {slot.reason || "Doctor unavailable"}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteBlockedSlot(slot.id)}
                    className="p-1.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--danger))] rounded hover:bg-[hsl(var(--danger-light))]"
                    title="Remove blocked slot"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Patient Slot Grid Simulation */}
        <div className="rounded-[var(--radius-2xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6 shadow-[var(--shadow-sm)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[hsl(var(--border))]">
            <div>
              <h2 className="text-base font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[hsl(var(--primary))]" />
                Live Patient Booking Slot Simulation
              </h2>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                Simulate exactly how patients see your computed slot matrix for any given date.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-[hsl(var(--muted-foreground))] font-semibold">
                Preview Date:
              </span>
              <input
                type="date"
                value={previewDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setPreviewDate(e.target.value)}
                className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[var(--radius-md)] px-2.5 py-1 text-xs font-mono text-[hsl(var(--foreground))] focus:border-[hsl(var(--primary))] focus:outline-none"
              />
            </div>
          </div>

          <SlotGrid
            slots={previewSlots}
            onSelectSlot={() => {}}
            isLoading={isLoadingPreview}
          />
        </div>
      </main>

      {/* Add Blocked Slot Modal */}
      <Modal
        open={isAddBlockedOpen}
        onClose={() => setIsAddBlockedOpen(false)}
        title="Block Slots / Leave"
        description="Block full dates or custom hour intervals from patient booking."
      >
        <div className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-semibold text-[hsl(var(--foreground))] block mb-1">
              Date to Block
            </label>
            <input
              type="date"
              value={blockDate}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setBlockDate(e.target.value)}
              className="w-full rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] p-2.5 text-xs text-[hsl(var(--foreground))] focus:border-[hsl(var(--primary))] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="fullDayCheckbox"
              checked={isFullDay}
              onChange={(e) => setIsFullDay(e.target.checked)}
              className="h-4 w-4 rounded text-[hsl(var(--primary))] focus:ring-[hsl(var(--primary))] cursor-pointer"
            />
            <label
              htmlFor="fullDayCheckbox"
              className="text-xs font-semibold text-[hsl(var(--foreground))] cursor-pointer"
            >
              Block Entire Day (Full Day Off / Holiday)
            </label>
          </div>

          {!isFullDay && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[hsl(var(--foreground))] block mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  value={blockStartTime}
                  onChange={(e) => setBlockStartTime(e.target.value)}
                  className="w-full rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] p-2 text-xs text-[hsl(var(--foreground))] focus:border-[hsl(var(--primary))] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[hsl(var(--foreground))] block mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  value={blockEndTime}
                  onChange={(e) => setBlockEndTime(e.target.value)}
                  className="w-full rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] p-2 text-xs text-[hsl(var(--foreground))] focus:border-[hsl(var(--primary))] focus:outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-[hsl(var(--foreground))] block mb-1">
              Reason for Leave / Block
            </label>
            <input
              type="text"
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              placeholder="e.g., Medical Conference, Vacation, Personal Leave"
              className="w-full rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] p-2.5 text-xs text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddBlockedOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAddBlockedSlot}
              disabled={isAddingBlocked || !blockDate}
              className="text-xs"
            >
              {isAddingBlocked ? "Saving..." : "Add Blocked Slot"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
