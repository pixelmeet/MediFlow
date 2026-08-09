"use client";

import * as React from "react";
import { MapPin, ShieldCheck } from "lucide-react";
import { AdminNavigation } from "@/components/admin/AdminNavigation";

interface BranchDTO {
  id: string;
  name: string;
  address?: string | null;
  timezone: string;
  gracePeriodMin: number;
  rescheduleCutoffHrs: number;
  departmentCount: number;
}

export default function AdminBranchesPage() {
  const [branches, setBranches] = React.useState<BranchDTO[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let isMounted = true;

    const fetchBranches = async () => {
      try {
        const res = await fetch("/api/v1/admin/branches");
        const json = await res.json();
        if (isMounted && res.ok && json.data) {
          setBranches(json.data);
        }
      } catch {
        console.error("Failed to load branches");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchBranches();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] pb-16">
      <AdminNavigation />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[hsl(var(--foreground))] tracking-tight flex items-center gap-2.5">
            <MapPin className="h-7 w-7 text-[hsl(var(--primary))]" />
            Hospital Clinics &amp; Branches
          </h1>
          <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] mt-0.5">
            Manage hospital physical campuses, clinical policies, check-in grace windows, and timezones
          </p>
        </div>

        {/* Branches Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {isLoading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-48 rounded-[var(--radius-2xl)] bg-[hsl(var(--card))] border border-[hsl(var(--border))] animate-pulse" />
            ))
          ) : branches.length === 0 ? (
            <div className="col-span-full py-12 text-center text-xs text-[hsl(var(--muted-foreground))]">
              No hospital branches found.
            </div>
          ) : (
            branches.map((b) => (
              <div
                key={b.id}
                className="rounded-[var(--radius-2xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6 shadow-[var(--shadow-sm)] space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-lg)] bg-[hsl(var(--primary-light))] text-[hsl(var(--primary))] font-bold">
                    <MapPin className="h-6 w-6" />
                  </div>
                  <span className="text-[10px] font-bold uppercase bg-[hsl(var(--success-light))] text-[hsl(var(--success))] px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" /> Operational
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-lg text-[hsl(var(--foreground))]">{b.name}</h3>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                    {b.address || "Medical District Campus"}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-4 border-t border-[hsl(var(--border))] text-xs">
                  <div className="bg-[hsl(var(--muted)/0.15)] p-2.5 rounded-[var(--radius-md)] text-center">
                    <span className="text-[10px] text-[hsl(var(--muted-foreground))] font-semibold block">Timezone</span>
                    <strong className="text-xs text-[hsl(var(--foreground))]">{b.timezone}</strong>
                  </div>
                  <div className="bg-[hsl(var(--muted)/0.15)] p-2.5 rounded-[var(--radius-md)] text-center">
                    <span className="text-[10px] text-[hsl(var(--muted-foreground))] font-semibold block">Grace Period</span>
                    <strong className="text-xs text-[hsl(var(--primary))] font-mono">{b.gracePeriodMin} mins</strong>
                  </div>
                  <div className="bg-[hsl(var(--muted)/0.15)] p-2.5 rounded-[var(--radius-md)] text-center">
                    <span className="text-[10px] text-[hsl(var(--muted-foreground))] font-semibold block">Reschedule Limit</span>
                    <strong className="text-xs text-[hsl(var(--foreground))] font-mono">{b.rescheduleCutoffHrs} hrs prior</strong>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
