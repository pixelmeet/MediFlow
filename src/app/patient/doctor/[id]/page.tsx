"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Star, MapPin, Award, Languages, ChevronRight, AlertCircle } from "lucide-react";
import { SlotGrid } from "@/components/patient/SlotGrid";
import { Button } from "@/components/ui/button";
import type { DoctorDTO } from "@/lib/services/DoctorService";
import type { TimeSlot } from "@/lib/services/SchedulingService";

export default function DoctorProfilePage() {
  const params = useParams();
  const router = useRouter();
  const doctorId = params.id as string;

  const [doctor, setDoctor] = React.useState<DoctorDTO | null>(null);
  const [selectedDate, setSelectedDate] = React.useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [slots, setSlots] = React.useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = React.useState<string | undefined>();
  const [isLoadingDoc, setIsLoadingDoc] = React.useState(true);
  const [isLoadingSlots, setIsLoadingSlots] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Generate next 7 days for easy date selection tabs
  const availableDates = React.useMemo(() => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      const dayName = i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.toLocaleDateString("en-US", { weekday: "short" });
      const monthDay = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      dates.push({ iso, dayName, monthDay });
    }
    return dates;
  }, []);

  // Fetch doctor profile
  React.useEffect(() => {
    async function fetchDoctor() {
      setIsLoadingDoc(true);
      try {
        const res = await fetch(`/api/v1/doctors/${doctorId}`);
        const json = await res.json();
        if (res.ok && json.data) {
          setDoctor(json.data);
        } else {
          setError(json.error?.message || "Doctor profile not found");
        }
      } catch {
        setError("Failed to load doctor profile.");
      } finally {
        setIsLoadingDoc(false);
      }
    }
    if (doctorId) fetchDoctor();
  }, [doctorId]);

  // Fetch slot availability for selected date
  React.useEffect(() => {
    async function fetchSlots() {
      setIsLoadingSlots(true);
      setSelectedSlot(undefined);
      try {
        const res = await fetch(`/api/v1/doctors/${doctorId}/availability?date=${selectedDate}`);
        const json = await res.json();
        if (res.ok && json.data) {
          setSlots(json.data.slots || []);
        } else {
          setSlots([]);
        }
      } catch {
        setSlots([]);
      } finally {
        setIsLoadingSlots(false);
      }
    }
    if (doctorId && selectedDate) fetchSlots();
  }, [doctorId, selectedDate]);

  const handleProceedToBook = () => {
    if (!selectedSlot) return;
    router.push(
      `/patient/book/${doctorId}?date=${selectedDate}&startTime=${selectedSlot}&branchId=${doctor?.branch.id || ""}`
    );
  };

  if (isLoadingDoc) {
    return (
      <div className="min-h-screen bg-[hsl(var(--background))] p-8">
        <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
          <div className="h-40 rounded-[var(--radius-2xl)] bg-[hsl(var(--card))] border border-[hsl(var(--border))]" />
          <div className="h-64 rounded-[var(--radius-xl)] bg-[hsl(var(--card))] border border-[hsl(var(--border))]" />
        </div>
      </div>
    );
  }

  if (error || !doctor) {
    return (
      <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center p-4">
        <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 text-center max-w-md">
          <AlertCircle className="h-8 w-8 text-[hsl(var(--danger))] mx-auto mb-2" />
          <h2 className="text-base font-bold text-[hsl(var(--foreground))]">{error || "Doctor not found"}</h2>
          <Link href="/patient/search">
            <Button size="sm" className="mt-4 text-xs">
              Back to Doctor Search
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] pb-12">
      {/* ─── Header ───────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-[hsl(var(--border))] bg-[hsl(var(--background)/0.8)] backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/patient/search">
            <Button variant="ghost" size="sm" className="flex items-center gap-1.5 text-xs">
              <ArrowLeft className="h-4 w-4" />
              All Doctors
            </Button>
          </Link>
          <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))]">
            Step 1 of 2: Select Date & Time
          </span>
        </div>
      </header>

      {/* ─── Main Content ─────────────────────────────────── */}
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Doctor Profile Banner Card */}
        <div className="rounded-[var(--radius-2xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6 sm:p-8 shadow-[var(--shadow-sm)]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[var(--radius-2xl)] bg-[hsl(var(--primary-light))] text-[hsl(var(--primary))] font-bold text-2xl border border-[hsl(var(--primary)/0.2)]">
              {doctor.name.replace("Dr. ", "").slice(0, 2).toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-[hsl(var(--foreground))]">
                  {doctor.name}
                </h1>
                <div className="flex items-center gap-1 bg-[hsl(var(--warning-light))] px-3 py-1 rounded-[var(--radius-full)] text-xs font-bold text-[hsl(var(--warning))]">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  <span>{doctor.averageRating} ({doctor.totalReviews} reviews)</span>
                </div>
              </div>

              <p className="text-sm font-semibold text-[hsl(var(--primary))] mt-1">
                {doctor.specialty} • {doctor.qualifications}
              </p>

              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-2 line-clamp-2">
                {doctor.bio || "Experienced clinical specialist providing patient-centered healthcare."}
              </p>

              {/* Badges strip */}
              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-[hsl(var(--muted-foreground))] pt-4 border-t border-[hsl(var(--border))]">
                <div className="flex items-center gap-1.5">
                  <Award className="h-4 w-4 text-[hsl(var(--primary))]" />
                  <span>{doctor.experience || 10} Years Experience</span>
                </div>
                <div className="flex items-center gap-1.5 font-bold text-[hsl(var(--foreground))]">
                  <span>₹{doctor.fee}</span>
                  <span className="font-normal text-[hsl(var(--muted-foreground))]">Consultation Fee</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-[hsl(var(--primary))]" />
                  <span>{doctor.branch.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Languages className="h-4 w-4 text-[hsl(var(--primary))]" />
                  <span>{doctor.language.join(", ")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Slot Booking Panel */}
        <div className="rounded-[var(--radius-2xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6 sm:p-8 shadow-[var(--shadow-sm)]">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[hsl(var(--foreground))]">
                Choose Appointment Date & Slot
              </h2>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Slots are updated in real-time. Pick an available time below.
              </p>
            </div>
          </div>

          {/* Date Selector Pills */}
          <div className="flex items-center gap-2.5 overflow-x-auto pb-3 scrollbar-none mb-6">
            {availableDates.map((d) => {
              const isSelected = selectedDate === d.iso;
              return (
                <button
                  key={d.iso}
                  onClick={() => setSelectedDate(d.iso)}
                  className={`flex flex-col items-center justify-center min-w-[90px] py-2.5 px-3 rounded-[var(--radius-xl)] border transition-all ${
                    isSelected
                      ? "bg-[hsl(var(--primary))] text-white border-[hsl(var(--primary))] shadow-[var(--shadow-sm)] scale-[1.02]"
                      : "bg-[hsl(var(--card))] border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:border-[hsl(var(--primary)/0.4)]"
                  }`}
                >
                  <span className="text-[11px] font-semibold uppercase opacity-90">{d.dayName}</span>
                  <span className="text-xs font-bold mt-0.5">{d.monthDay}</span>
                </button>
              );
            })}
          </div>

          {/* Slots Grid */}
          <SlotGrid
            slots={slots}
            selectedSlot={selectedSlot}
            onSelectSlot={setSelectedSlot}
            isLoading={isLoadingSlots}
          />

          {/* Footer Action Bar */}
          <div className="mt-8 pt-6 border-t border-[hsl(var(--border))] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-[hsl(var(--muted-foreground))]">
              {selectedSlot ? (
                <span>
                  Selected Slot: <strong className="text-[hsl(var(--foreground))]">{selectedDate}</strong> at{" "}
                  <strong className="text-[hsl(var(--primary))] font-mono text-sm">{selectedSlot}</strong>
                </span>
              ) : (
                <span>Please pick a time slot above to proceed.</span>
              )}
            </div>

            <Button
              size="lg"
              disabled={!selectedSlot}
              onClick={handleProceedToBook}
              className="w-full sm:w-auto flex items-center justify-center gap-2"
            >
              Continue to Confirmation
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
