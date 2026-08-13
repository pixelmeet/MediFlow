"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ClipboardList,
  Stethoscope,
  Calendar,
  FileText,
  Pill,
  AlertCircle,
  RefreshCw,
  Activity,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import type { PatientHistoryVisitDTO } from "@/lib/services/ConsultationService";

// ─── Skeleton ─────────────────────────────────────────────

function HistorySkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="h-36 rounded-[var(--radius-2xl)] bg-[hsl(var(--card))] border border-[hsl(var(--border))]"
        />
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────

export default function MedicalHistoryPage() {
  const { user } = useAuth();
  const [visits, setVisits] = React.useState<PatientHistoryVisitDTO[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    if (!user?.patientId) return;

    let isMounted = true;
    const run = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/v1/patients/${user.patientId}/history`);
        const json = await res.json();
        if (!isMounted) return;
        if (res.ok && Array.isArray(json.data)) {
          setVisits(json.data);
        } else {
          setError(json.error?.message || "Failed to load medical history");
        }
      } catch {
        if (isMounted) setError("Network error loading medical history");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    run();
    return () => {
      isMounted = false;
    };
  }, [user?.patientId, reloadKey]);

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] pb-12">
      {/* ─── Header ───────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-[hsl(var(--border))] bg-[hsl(var(--background)/0.8)] backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/patient/dashboard">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-lg)] bg-[hsl(var(--primary))] text-white shadow-[var(--shadow-sm)]">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-[hsl(var(--foreground))]">
                Medical History
              </h1>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Past consultations, diagnoses, and prescriptions
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Main Content ─────────────────────────────────── */}
      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Auth guard — show only if patientId is not available yet */}
        {!user?.patientId && !isLoading && (
          <div className="rounded-[var(--radius-2xl)] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-12 text-center max-w-md mx-auto">
            <Activity className="h-10 w-10 text-[hsl(var(--muted-foreground))] mx-auto mb-3" />
            <h3 className="text-base font-bold text-[hsl(var(--foreground))]">
              Loading your profile…
            </h3>
          </div>
        )}

        {user?.patientId && (
          <>
            {isLoading ? (
              <HistorySkeleton />
            ) : error ? (
              <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--danger-light))] bg-[hsl(var(--card))] p-8 text-center max-w-md mx-auto">
                <AlertCircle className="h-8 w-8 text-[hsl(var(--danger))] mx-auto mb-2" />
                <h3 className="font-bold text-sm text-[hsl(var(--foreground))]">{error}</h3>
                <Button
                  size="sm"
                  onClick={() => setReloadKey((k) => k + 1)}
                  className="mt-4 text-xs"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1" />
                  Try Again
                </Button>
              </div>
            ) : visits.length === 0 ? (
              <div className="rounded-[var(--radius-2xl)] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-12 text-center max-w-md mx-auto">
                <ClipboardList className="h-10 w-10 text-[hsl(var(--muted-foreground))] mx-auto mb-3" />
                <h3 className="text-base font-bold text-[hsl(var(--foreground))]">
                  No Medical History Yet
                </h3>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 max-w-xs mx-auto">
                  Once you complete a consultation with a doctor, it will appear here as part of your health record.
                </p>
                <Link href="/patient/search">
                  <Button size="sm" className="mt-5 text-xs">
                    Find a Doctor &amp; Book Slot
                  </Button>
                </Link>
              </div>
            ) : (
              // ── Timeline ────────────────────────────────────────
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-5 top-6 bottom-6 w-px bg-[hsl(var(--border))] hidden sm:block" />

                <div className="space-y-5">
                  {visits.map((visit, idx) => (
                    <div key={visit.consultationId} className="relative sm:pl-16">
                      {/* Timeline dot */}
                      <div className="absolute left-3 top-6 hidden sm:flex h-5 w-5 items-center justify-center rounded-full border-2 border-[hsl(var(--primary))] bg-[hsl(var(--background))] z-10">
                        <span className="text-[8px] font-extrabold text-[hsl(var(--primary))]">
                          {idx + 1}
                        </span>
                      </div>

                      <div className="rounded-[var(--radius-2xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-5 sm:p-6 shadow-[var(--shadow-sm)] transition-all hover:border-[hsl(var(--primary)/0.3)] hover:shadow-[var(--shadow)]">
                        {/* Header row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[hsl(var(--border))]">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-[hsl(var(--primary-light))] text-[hsl(var(--primary))] font-bold text-sm">
                              {visit.doctorName.replace("Dr. ", "").slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <h3 className="font-bold text-sm text-[hsl(var(--foreground))] flex items-center gap-1.5">
                                <Stethoscope className="h-4 w-4 text-[hsl(var(--primary))]" />
                                {visit.doctorName}
                              </h3>
                              <p className="text-xs text-[hsl(var(--primary))] font-medium">
                                {visit.doctorSpecialty}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))] font-medium self-start sm:self-center">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>{visit.date}</span>
                          </div>
                        </div>

                        {/* Diagnosis */}
                        <div className="mt-4 rounded-[var(--radius-md)] bg-[hsl(var(--muted)/0.4)] border border-[hsl(var(--border))] p-3">
                          <span className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))] block mb-0.5">
                            Diagnosis
                          </span>
                          <p className="text-xs font-semibold text-[hsl(var(--foreground))]">
                            {visit.diagnosis}
                          </p>
                        </div>

                        {/* Notes */}
                        {visit.notes && (
                          <div className="mt-3 text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
                            <span className="font-semibold text-[hsl(var(--foreground))]">Notes: </span>
                            {visit.notes}
                          </div>
                        )}

                        {/* Medicines */}
                        {visit.medicines.length > 0 && (
                          <div className="mt-4 space-y-1.5">
                            <span className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))] flex items-center gap-1">
                              <Pill className="h-3 w-3 text-[hsl(var(--primary))]" />
                              Medicines ({visit.medicines.length})
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {visit.medicines.map((med, mIdx) => (
                                <span
                                  key={mIdx}
                                  className="text-[11px] px-2.5 py-1 rounded-[var(--radius-md)] bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] font-medium"
                                >
                                  {med.name}
                                  {med.dosage ? ` (${med.dosage})` : ""}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Prescription link */}
                        {visit.prescriptionId && (
                          <div className="mt-4 pt-4 border-t border-[hsl(var(--border))]">
                            <Link
                              href={`/patient/prescriptions/${visit.prescriptionId}`}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[hsl(var(--primary))] hover:underline underline-offset-2"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              View Full Prescription
                              <ChevronRight className="h-3 w-3" />
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
