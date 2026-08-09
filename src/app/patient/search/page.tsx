"use client";

import * as React from "react";
import Link from "next/link";
import { Search, Stethoscope, ArrowLeft, RefreshCw, AlertCircle } from "lucide-react";
import { DoctorCard } from "@/components/patient/DoctorCard";
import { DoctorFilterBar } from "@/components/patient/DoctorFilterBar";
import { Button } from "@/components/ui/button";
import type { DoctorDTO } from "@/lib/services/DoctorService";

export default function DoctorSearchPage() {
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [selectedSpecialty, setSelectedSpecialty] = React.useState<string | undefined>();
  const [selectedBranchId, setSelectedBranchId] = React.useState<string | undefined>();
  const [selectedMaxFee, setSelectedMaxFee] = React.useState<number | undefined>();
  const [selectedLanguage, setSelectedLanguage] = React.useState<string | undefined>();

  const [doctors, setDoctors] = React.useState<DoctorDTO[]>([]);
  const [specialties, setSpecialties] = React.useState<string[]>([]);
  const [branches, setBranches] = React.useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Debounce search text input by 300ms
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch doctors whenever filters change
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    let isMounted = true;
    const run = async () => {
      try {
        const params = new URLSearchParams();
        if (debouncedSearch) params.set("search", debouncedSearch);
        if (selectedSpecialty) params.set("specialty", selectedSpecialty);
        if (selectedBranchId) params.set("branchId", selectedBranchId);
        if (selectedMaxFee) params.set("maxFee", selectedMaxFee.toString());
        if (selectedLanguage) params.set("language", selectedLanguage);

        const res = await fetch(`/api/v1/doctors?${params.toString()}`);
        const json = await res.json();

        if (!isMounted) return;
        if (res.ok && json.data) {
          setDoctors(json.data);
          if (json.meta?.filterOptions) {
            setSpecialties(json.meta.filterOptions.specialties || []);
            setBranches(json.meta.filterOptions.branches || []);
          }
        } else {
          setError(json.error?.message || "Failed to load doctors");
        }
      } catch {
        if (isMounted) setError("Network error loading doctors. Please try again.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    run();
    return () => {
      isMounted = false;
    };
  }, [debouncedSearch, selectedSpecialty, selectedBranchId, selectedMaxFee, selectedLanguage, reloadKey]);

  const handleClearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setSelectedSpecialty(undefined);
    setSelectedBranchId(undefined);
    setSelectedMaxFee(undefined);
    setSelectedLanguage(undefined);
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      {/* ─── Header ───────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-[hsl(var(--border))] bg-[hsl(var(--background)/0.8)] backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link href="/patient/dashboard">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-lg)] bg-[hsl(var(--primary))] text-white shadow-[var(--shadow-sm)]">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-[hsl(var(--foreground))]">
                Find Doctors
              </h1>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Search verified specialists & live slot availability
              </p>
            </div>
          </div>

          <Link href="/patient/appointments">
            <Button variant="outline" size="sm" className="text-xs">
              My Appointments
            </Button>
          </Link>
        </div>
      </header>

      {/* ─── Main Content ─────────────────────────────────── */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Search Bar input */}
        <div className="relative mb-6">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by doctor name or specialty (e.g. Cardiologist, Dr. Patel)..."
            className="w-full h-11 pl-10 pr-4 rounded-[var(--radius-xl)] border border-[hsl(var(--input))] bg-[hsl(var(--card))] text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] shadow-[var(--shadow-sm)] focus:border-[hsl(var(--primary))] focus:outline-none transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filter bar */}
        <DoctorFilterBar
          specialties={specialties}
          branches={branches}
          selectedSpecialty={selectedSpecialty}
          selectedBranchId={selectedBranchId}
          selectedMaxFee={selectedMaxFee}
          selectedLanguage={selectedLanguage}
          onSpecialtyChange={setSelectedSpecialty}
          onBranchChange={setSelectedBranchId}
          onMaxFeeChange={setSelectedMaxFee}
          onLanguageChange={setSelectedLanguage}
          onClearFilters={handleClearFilters}
        />

        {/* Doctor Results Section */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-64 rounded-[var(--radius-xl)] bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-5 animate-pulse"
              />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--danger-light))] bg-[hsl(var(--card))] p-8 text-center max-w-lg mx-auto">
            <AlertCircle className="h-8 w-8 text-[hsl(var(--danger))] mx-auto mb-2" />
            <h3 className="font-bold text-sm text-[hsl(var(--foreground))]">Error Loading Doctors</h3>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">{error}</p>
            <Button size="sm" onClick={() => setReloadKey((k) => k + 1)} className="mt-4 text-xs">
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Try Again
            </Button>
          </div>
        ) : doctors.length === 0 ? (
          <div className="rounded-[var(--radius-2xl)] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-12 text-center max-w-xl mx-auto">
            <Stethoscope className="h-10 w-10 text-[hsl(var(--muted-foreground))] mx-auto mb-3" />
            <h3 className="text-base font-bold text-[hsl(var(--foreground))]">
              No doctors found matching your criteria
            </h3>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
              Try adjusting your specialty or fee filters to see more available specialists.
            </p>
            <Button size="sm" onClick={handleClearFilters} className="mt-5 text-xs">
              Reset All Filters
            </Button>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                Showing {doctors.length} Specialist{doctors.length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {doctors.map((doctor) => (
                <DoctorCard key={doctor.id} doctor={doctor} />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
