"use client";

import * as React from "react";
import Link from "next/link";
import {
  FileText,
  Search,
  Calendar,
  Stethoscope,
  ArrowRight,
  Activity,
  ArrowLeft,
  Pill,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/shared/NotificationBell";
import type { PrescriptionDTO } from "@/lib/services/PrescriptionService";

export default function PatientPrescriptionsPage() {
  const [prescriptions, setPrescriptions] = React.useState<PrescriptionDTO[]>([]);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    const fetchPrescriptions = async () => {
      try {
        setIsLoading(true);
        const query = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : "";
        const res = await fetch(`/api/v1/patients/prescriptions${query}`);
        const json = await res.json();
        if (!isMounted) return;

        if (res.ok && json.data) {
          setPrescriptions(json.data.prescriptions || []);
        } else {
          setError(json.error?.message || "Failed to load prescriptions");
        }
      } catch {
        if (isMounted) setError("Network error loading prescriptions");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    const debounce = setTimeout(fetchPrescriptions, 300);
    return () => {
      isMounted = false;
      clearTimeout(debounce);
    };
  }, [searchTerm]);

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] pb-16">
      {/* ─── Top Navbar ─────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-[hsl(var(--border))] bg-[hsl(var(--background)/0.8)] backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link href="/patient/dashboard" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-lg)] bg-[hsl(var(--primary))] text-white shadow-[var(--shadow-sm)]">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <span className="font-extrabold text-base tracking-tight text-[hsl(var(--foreground))]">
                  Medi<span className="text-[hsl(var(--primary))]">Flow</span>
                </span>
                <span className="ml-2 rounded-full bg-[hsl(var(--primary-light))] px-2 py-0.5 text-[10px] font-bold text-[hsl(var(--primary))]">
                  Prescriptions
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell />
            <Link href="/patient/dashboard">
              <Button variant="outline" size="sm" className="text-xs flex items-center gap-1.5">
                <ArrowLeft className="h-3.5 w-3.5" />
                Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Main Content ───────────────────────────────── */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Page Title & Search Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[hsl(var(--foreground))] tracking-tight">
              My Digital Prescriptions
            </h1>
            <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] mt-0.5">
              Access official medical prescriptions, dosage schedules, and clinical notes from your doctors.
            </p>
          </div>

          <div className="w-full sm:w-80 relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by doctor, medicine, diagnosis..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:ring-1 focus:ring-[hsl(var(--primary))]"
            />
          </div>
        </div>

        {/* Prescription List */}
        {isLoading ? (
          <div className="py-20 text-center space-y-3">
            <Activity className="h-8 w-8 text-[hsl(var(--primary))] animate-spin mx-auto" />
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Loading your medical records...</p>
          </div>
        ) : error ? (
          <div className="p-6 rounded-[var(--radius-xl)] bg-[hsl(var(--danger-light))] border border-[hsl(var(--danger)/0.3)] text-[hsl(var(--danger))] text-center text-xs">
            {error}
          </div>
        ) : prescriptions.length === 0 ? (
          <div className="py-16 text-center rounded-[var(--radius-2xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-8 shadow-[var(--shadow-sm)]">
            <FileText className="h-12 w-12 text-[hsl(var(--muted-foreground)/0.4)] mx-auto mb-3" />
            <h3 className="text-base font-bold text-[hsl(var(--foreground))]">No Prescriptions Found</h3>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 max-w-md mx-auto">
              {searchTerm
                ? "No prescriptions matched your search query. Try clearing the filter."
                : "When your doctor completes a consultation, your digital prescription and instructions will appear here."}
            </p>
            {searchTerm ? (
              <Button variant="outline" size="sm" onClick={() => setSearchTerm("")} className="mt-4 text-xs">
                Clear Search
              </Button>
            ) : (
              <Link href="/patient/search" className="inline-block mt-4">
                <Button size="sm" className="text-xs font-bold">
                  Book a Consultation
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {prescriptions.map((p) => (
              <div
                key={p.id}
                className="rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-5 shadow-[var(--shadow-sm)] hover:border-[hsl(var(--primary)/0.5)] hover:shadow-[var(--shadow)] transition-all flex flex-col justify-between"
              >
                <div className="space-y-3.5">
                  {/* Card Header: Rx Badge & Date */}
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 bg-[hsl(var(--primary-light))] text-[hsl(var(--primary))] px-2.5 py-0.5 rounded-[var(--radius-full)] font-mono text-xs font-bold">
                      <FileText className="h-3.5 w-3.5" />
                      {p.prescriptionNumber}
                    </span>
                    <span className="text-xs font-medium text-[hsl(var(--muted-foreground))] flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {p.date}
                    </span>
                  </div>

                  {/* Doctor Info */}
                  <div>
                    <h3 className="font-bold text-sm text-[hsl(var(--foreground))] flex items-center gap-1.5">
                      <Stethoscope className="h-4 w-4 text-[hsl(var(--primary))]" />
                      {p.doctor.name}
                    </h3>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] ml-5">
                      {p.doctor.specialty} • {p.doctor.branchName}
                    </p>
                  </div>

                  {/* Clinical Diagnosis Box */}
                  <div className="rounded-[var(--radius-md)] bg-[hsl(var(--muted)/0.4)] p-3 border border-[hsl(var(--border))]">
                    <span className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))] block mb-0.5">
                      Diagnosis:
                    </span>
                    <p className="text-xs font-semibold text-[hsl(var(--foreground))] line-clamp-2">
                      {p.clinicalSummary.diagnosis}
                    </p>
                  </div>

                  {/* Prescribed Medicines Summary */}
                  {p.items && p.items.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))] flex items-center gap-1">
                        <Pill className="h-3 w-3 text-[hsl(var(--primary))]" />
                        Medicines ({p.items.length}):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {p.items.slice(0, 3).map((item, idx) => (
                          <span
                            key={idx}
                            className="text-[11px] px-2 py-0.5 rounded bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] font-medium truncate max-w-[160px]"
                          >
                            {item.medicine} {item.dose ? `(${item.dose})` : ""}
                          </span>
                        ))}
                        {p.items.length > 3 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] font-bold">
                            +{p.items.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="pt-4 mt-4 border-t border-[hsl(var(--border))] flex items-center justify-between gap-2">
                  <Link href={`/patient/prescriptions/${p.id}`} className="w-full">
                    <Button size="sm" className="w-full text-xs font-bold flex items-center justify-center gap-1.5 shadow-[var(--shadow-sm)]">
                      View Full Prescription
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
