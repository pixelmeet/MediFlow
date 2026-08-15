"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Star, MapPin, Award, Languages, ChevronRight, AlertCircle } from "lucide-react";
import { SlotGrid } from "@/components/patient/SlotGrid";
import { Button } from "@/components/ui/button";
import type { DoctorDTO } from "@/lib/services/DoctorService";
import type { TimeSlot } from "@/lib/services/SchedulingService";

interface DoctorReview {
  id: string;
  patientName: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
}

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

  // Reviews state
  const [reviews, setReviews] = React.useState<DoctorReview[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = React.useState(true);
  const [showReviewForm, setShowReviewForm] = React.useState(false);
  const [newRating, setNewRating] = React.useState(5);
  const [newComment, setNewComment] = React.useState("");
  const [isSubmittingReview, setIsSubmittingReview] = React.useState(false);
  const [reviewMessage, setReviewMessage] = React.useState<string | null>(null);

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

  // Fetch reviews
  React.useEffect(() => {
    async function fetchReviews() {
      setIsLoadingReviews(true);
      try {
        const res = await fetch(`/api/v1/doctors/${doctorId}/reviews`);
        const json = await res.json();
        if (res.ok && json.data) {
          setReviews(json.data);
        }
      } catch {
        console.error("Failed to load reviews");
      } finally {
        setIsLoadingReviews(false);
      }
    }
    if (doctorId) fetchReviews();
  }, [doctorId]);

  const handleProceedToBook = () => {
    if (!selectedSlot) return;
    router.push(
      `/patient/book/${doctorId}?date=${selectedDate}&startTime=${selectedSlot}&branchId=${doctor?.branch.id || ""}`
    );
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingReview(true);
    setReviewMessage(null);
    try {
      const res = await fetch(`/api/v1/doctors/${doctorId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: newRating,
          comment: newComment.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (res.ok && json.data) {
        setReviews((prev) => [json.data, ...prev.filter((r) => r.id !== json.data.id)]);
        setShowReviewForm(false);
        setNewComment("");
        setReviewMessage("Thank you! Your review has been recorded.");
      } else {
        setReviewMessage(json.error?.message || "Failed to submit review. Please sign in as a patient.");
      }
    } catch {
      setReviewMessage("Network error while submitting review.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (isLoadingDoc) {
    return (
      <div className="min-h-screen bg-[hsl(var(--background))] p-8">
        <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
          <div className="h-40 rounded-[var(--radius-xl)] bg-[hsl(var(--card))] border border-[hsl(var(--border))]" />
          <div className="h-64 rounded-[var(--radius-xl)] bg-[hsl(var(--card))] border border-[hsl(var(--border))]" />
        </div>
      </div>
    );
  }

  if (error || !doctor) {
    return (
      <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-[var(--radius-xl)] border border-[hsl(var(--danger)/0.2)] bg-[hsl(var(--danger-light))] p-6 text-center space-y-4">
          <AlertCircle className="h-10 w-10 text-[hsl(var(--danger))] mx-auto" />
          <h2 className="font-serif text-xl font-normal text-[hsl(var(--danger))]">Profile Unavailable</h2>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">{error || "Doctor record was not found."}</p>
          <Button variant="outline" onClick={() => router.push("/patient/dashboard")}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] pb-16">
      {/* Top Navbar Backstrip */}
      <div className="border-b border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 sm:px-8 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link
            href="/patient/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <span className="text-xs font-mono text-[hsl(var(--muted-foreground))]">
            Physician Profile &amp; Scheduling
          </span>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-8 mt-6 space-y-6">
        {/* Doctor Header Card */}
        <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6 sm:p-8 shadow-[var(--shadow-sm)]">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <div className="flex h-20 w-20 sm:h-24 sm:w-24 shrink-0 items-center justify-center rounded-[var(--radius-xl)] bg-[hsl(var(--muted))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] text-2xl sm:text-3xl font-serif font-normal shadow-sm">
              {doctor.name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h1 className="font-serif text-2xl sm:text-3xl font-normal text-[hsl(var(--foreground))] tracking-tight">
                  {doctor.name}
                </h1>
                <div className="flex items-center gap-1.5 rounded-full bg-[hsl(var(--warning-light))] border border-[hsl(var(--warning)/0.3)] px-3 py-1 text-xs font-mono font-medium text-[hsl(var(--warning))]">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  <span>{doctor.averageRating} ({doctor.totalReviews} reviews)</span>
                </div>
              </div>

              <p className="text-xs sm:text-sm font-medium text-[hsl(var(--primary))] mt-1 font-sans">
                {doctor.specialty} • {doctor.qualifications}
              </p>

              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-2 line-clamp-2 font-sans">
                {doctor.bio || "Experienced clinical specialist providing patient-centered healthcare."}
              </p>

              {/* Badges strip */}
              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-[hsl(var(--muted-foreground))] pt-4 border-t border-[hsl(var(--border))] font-sans">
                <div className="flex items-center gap-1.5">
                  <Award className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                  <span>{doctor.experience || 10} Years Experience</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium text-[hsl(var(--foreground))]">
                  <span>₹{doctor.fee}</span>
                  <span className="font-normal text-[hsl(var(--muted-foreground))]">Consultation Fee</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                  <span>{doctor.branch.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Languages className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                  <span>{doctor.language.join(", ")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Slot Booking Panel */}
        <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6 sm:p-8 shadow-[var(--shadow-sm)]">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="font-serif text-lg sm:text-xl font-normal text-[hsl(var(--foreground))]">
                Choose Appointment Date &amp; Slot
              </h2>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5 font-sans">
                Slots are synchronized in real-time. Select an available session below.
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
                  className={`flex flex-col items-center justify-center min-w-[90px] py-2.5 px-3 rounded-[var(--radius-lg)] border transition-all ${
                    isSelected
                      ? "bg-[hsl(var(--primary))] text-white border-[hsl(var(--primary))] shadow-[var(--shadow-sm)]"
                      : "bg-[hsl(var(--background))] border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:border-[hsl(var(--primary)/0.4)]"
                  }`}
                >
                  <span className="text-[10px] font-medium uppercase opacity-90">{d.dayName}</span>
                  <span className="text-xs font-mono font-medium mt-0.5">{d.monthDay}</span>
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
            <div className="text-xs text-[hsl(var(--muted-foreground))] font-sans">
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
              className="w-full sm:w-auto flex items-center justify-center gap-2 font-medium"
            >
              Continue to Confirmation
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Patient Reviews Section */}
        <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6 sm:p-8 shadow-[var(--shadow-sm)] space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-serif text-lg sm:text-xl font-normal text-[hsl(var(--foreground))]">
                Patient Feedback &amp; Reviews
              </h2>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5 font-sans">
                Verified reviews from patients who attended consultations with {doctor.name}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowReviewForm(!showReviewForm)}
              className="text-xs font-medium"
            >
              {showReviewForm ? "Cancel" : "Write a Review"}
            </Button>
          </div>

          {reviewMessage && (
            <div className="rounded-[var(--radius-md)] bg-[hsl(var(--background))] border border-[hsl(var(--card-border))] p-3 text-xs text-[hsl(var(--foreground))] font-medium">
              {reviewMessage}
            </div>
          )}

          {/* Review Submission Form */}
          {showReviewForm && (
            <form onSubmit={handleReviewSubmit} className="rounded-[var(--radius-lg)] bg-[hsl(var(--background))] border border-[hsl(var(--border))] p-5 space-y-4">
              <h3 className="font-serif text-sm font-normal text-[hsl(var(--foreground))]">
                Rate your consultation experience
              </h3>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setNewRating(star)}
                    className="p-1 text-[hsl(var(--warning))] hover:scale-110 transition-transform"
                    aria-label={`Rate ${star} star`}
                  >
                    <Star className={`h-5 w-5 ${star <= newRating ? "fill-current" : "stroke-current fill-none"}`} />
                  </button>
                ))}
                <span className="text-xs font-mono text-[hsl(var(--muted-foreground))] ml-2">
                  {newRating} / 5 Stars
                </span>
              </div>

              <div>
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Share details of your consultation (e.g. communication, punctuality, diagnosis clarity)..."
                  rows={3}
                  className="w-full rounded-[var(--radius)] border border-[hsl(var(--input))] bg-[hsl(var(--card))] p-3 text-xs text-[hsl(var(--foreground))] focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-[hsl(var(--input-focus)/0.4)] focus-visible:border-[hsl(var(--input-focus))] transition-colors"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowReviewForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isSubmittingReview}>
                  Submit Review
                </Button>
              </div>
            </form>
          )}

          {/* Reviews List */}
          {isLoadingReviews ? (
            <div className="py-6 text-center text-xs text-[hsl(var(--muted-foreground))] animate-pulse font-sans">
              Loading verified reviews...
            </div>
          ) : reviews.length === 0 ? (
            <div className="py-8 text-center rounded-[var(--radius-lg)] bg-[hsl(var(--background))] border border-dashed border-[hsl(var(--border))]">
              <Star className="h-8 w-8 text-[hsl(var(--muted-foreground))] mx-auto mb-2 opacity-50" />
              <p className="font-serif text-sm font-normal text-[hsl(var(--foreground))]">No reviews yet</p>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-1 font-sans">Be the first patient to share feedback for {doctor.name}.</p>
            </div>
          ) : (
            <div className="space-y-4 divide-y divide-[hsl(var(--border))]">
              {reviews.map((r) => (
                <div key={r.id} className="pt-4 first:pt-0 space-y-1.5 font-sans">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-[hsl(var(--foreground))]">
                      {r.patientName}
                    </span>
                    <span className="text-[11px] font-mono text-[hsl(var(--muted-foreground))]">
                      {new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-3.5 w-3.5 ${s <= r.rating ? "text-[hsl(var(--warning))] fill-current" : "text-[hsl(var(--muted))] stroke-current"}`}
                      />
                    ))}
                  </div>
                  {r.comment && (
                    <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
                      {r.comment}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
