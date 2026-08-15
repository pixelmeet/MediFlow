"use client";

import * as React from "react";
import Link from "next/link";
import { Calendar, Stethoscope, Building2, TrendingUp, CheckCircle2, Clock, IndianRupee, ArrowRight } from "lucide-react";
import { AdminNavigation } from "@/components/admin/AdminNavigation";
import { StatCard } from "@/components/shared";
import { Button } from "@/components/ui/button";
import type { AdminOverviewDTO } from "@/lib/services/AdminService";

export default function AdminOverviewPage() {
  const [data, setData] = React.useState<AdminOverviewDTO | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let isMounted = true;
    const fetchOverview = async () => {
      try {
        const res = await fetch("/api/v1/admin/overview");
        const json = await res.json();
        if (isMounted && res.ok && json.data) {
          setData(json.data);
        }
      } catch {
        console.error("Failed to load admin overview");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchOverview();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] pb-16">
      <AdminNavigation />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        {/* Welcome & Quick Action Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-normal text-[hsl(var(--foreground))] tracking-tight">
              Hospital Operations Overview
            </h1>
            <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] mt-1 font-sans">
              Live hospital clinical flow, department distribution &amp; doctor capacity utilization
            </p>
          </div>

          <div className="flex items-center gap-2.5 font-sans">
            <Link href="/admin/doctors">
              <Button size="sm" className="text-xs font-medium flex items-center gap-1.5 shadow-[var(--shadow-sm)]">
                <Stethoscope className="h-3.5 w-3.5" /> Manage Doctors
              </Button>
            </Link>
            <Link href="/admin/appointments">
              <Button variant="outline" size="sm" className="text-xs font-medium flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> All Appointments
              </Button>
            </Link>
          </div>
        </div>

        {/* ─── 4 Primary KPI Stat Cards ─────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <StatCard
            label="Today's Appointments"
            value={data ? data.stats.totalAppointmentsToday.toString() : "0"}
            icon={<Calendar className="h-5 w-5 text-[hsl(var(--muted-foreground))]" />}
          />
          <StatCard
            label="In Consultation"
            value={data ? data.stats.activeConsultations.toString() : "0"}
            icon={<Clock className="h-5 w-5 text-[hsl(var(--warning))]" />}
          />
          <StatCard
            label="Completed Visits"
            value={data ? data.stats.completedToday.toString() : "0"}
            icon={<CheckCircle2 className="h-5 w-5 text-[hsl(var(--success))]" />}
          />
          <StatCard
            label="Revenue Volume"
            value={data ? `₹${data.stats.totalRevenueToday.toLocaleString()}` : "₹0"}
            icon={<IndianRupee className="h-5 w-5 text-[hsl(var(--muted-foreground))]" />}
          />
        </div>

        {/* ─── Two-Column Middle Section ───────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Department Breakdown */}
          <div className="lg:col-span-1 rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6 shadow-[var(--shadow-sm)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[hsl(var(--border))]">
              <h2 className="font-serif text-base font-normal text-[hsl(var(--foreground))] flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                Department Clinical Load
              </h2>
              <Link href="/admin/departments" className="text-xs font-medium text-[hsl(var(--primary))] hover:underline flex items-center gap-0.5 font-sans">
                View All <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {isLoading ? (
              <div className="space-y-3 py-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-14 rounded-[var(--radius-lg)] bg-[hsl(var(--muted))] animate-pulse" />
                ))}
              </div>
            ) : !data || data.departmentBreakdown.length === 0 ? (
              <div className="text-center py-6 text-xs text-[hsl(var(--muted-foreground))] font-sans">
                No active departments found.
              </div>
            ) : (
              <div className="space-y-3 font-sans">
                {data.departmentBreakdown.map((dept) => (
                  <div
                    key={dept.id}
                    className="p-3.5 rounded-[var(--radius-lg)] border border-[hsl(var(--border))] bg-[hsl(var(--background))] flex items-center justify-between text-xs"
                  >
                    <div>
                      <h3 className="font-medium text-sm text-[hsl(var(--foreground))]">{dept.name}</h3>
                      <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">
                        {dept.doctorCount} Doctors Assigned
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="font-mono font-medium text-sm text-[hsl(var(--foreground))]">
                        {dept.appointmentCount}
                      </span>
                      <span className="text-[10px] text-[hsl(var(--muted-foreground))] block">Appointments</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Doctor Utilization Bars */}
          <div className="lg:col-span-2 rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6 shadow-[var(--shadow-sm)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[hsl(var(--border))]">
              <h2 className="font-serif text-base font-normal text-[hsl(var(--foreground))] flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                Doctor Shift Capacity &amp; Utilization
              </h2>
              <Link href="/admin/doctors" className="text-xs font-medium text-[hsl(var(--primary))] hover:underline flex items-center gap-0.5 font-sans">
                Manage Directory <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {isLoading ? (
              <div className="space-y-4 py-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 rounded-[var(--radius-lg)] bg-[hsl(var(--muted))] animate-pulse" />
                ))}
              </div>
            ) : !data || data.doctorUtilization.length === 0 ? (
              <div className="text-center py-6 text-xs text-[hsl(var(--muted-foreground))] font-sans">
                No doctor shift data available.
              </div>
            ) : (
              <div className="space-y-4 font-sans">
                {data.doctorUtilization.map((doc) => (
                  <div key={doc.id} className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between font-medium">
                      <span className="text-[hsl(var(--foreground))]">
                        {doc.name} <span className="font-normal text-[hsl(var(--muted-foreground))]">• {doc.specialty}</span>
                      </span>
                      <span className="font-mono text-[hsl(var(--foreground))]">
                        {doc.bookedSlots} / {doc.totalCapacity} Slots ({doc.utilizationPercent}%)
                      </span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-[hsl(var(--background))] border border-[hsl(var(--border))] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          doc.utilizationPercent >= 80
                            ? "bg-[hsl(var(--danger))]"
                            : doc.utilizationPercent >= 50
                            ? "bg-[hsl(var(--primary))]"
                            : "bg-[hsl(var(--success))]"
                        }`}
                        style={{ width: `${doc.utilizationPercent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ─── Recent Activity Feed ────────────────────────── */}
        <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6 shadow-[var(--shadow-sm)] space-y-4">
          <h2 className="font-serif text-base font-normal text-[hsl(var(--foreground))] flex items-center gap-2 pb-3 border-b border-[hsl(var(--border))]">
            <Clock className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
            Recent System &amp; Clinical Operations Audit
          </h2>

          <div className="divide-y divide-[hsl(var(--border))] font-sans">
            {data?.recentActivity.map((act) => (
              <div key={act.id} className="py-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono font-medium uppercase tracking-wider px-2 py-0.5 rounded bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))]">
                    {act.type}
                  </span>
                  <span className="font-medium text-[hsl(var(--foreground))]">{act.description}</span>
                </div>
                <span className="text-[11px] font-mono text-[hsl(var(--muted-foreground))]">{act.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
