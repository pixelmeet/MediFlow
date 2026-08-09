"use client";

import * as React from "react";
import Link from "next/link";
import { Activity, Calendar, Clock, LogOut, User, Search, Stethoscope, ChevronRight, Ticket, ArrowRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import type { AppointmentDTO } from "@/lib/services/AppointmentService";

export default function PatientDashboard() {
  const { user, logout, isLoading } = useAuth();
  const [upcomingApts, setUpcomingApts] = React.useState<AppointmentDTO[]>([]);

  React.useEffect(() => {
    async function fetchApts() {
      try {
        const res = await fetch("/api/v1/appointments");
        const json = await res.json();
        if (res.ok && json.data) {
          setUpcomingApts(json.data.upcoming || []);
        }
      } catch {
        console.error("Failed to load appointments");
      }
    }
    fetchApts();
  }, []);

  const nextAppointment = upcomingApts[0] || null;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Activity className="h-8 w-8 text-[hsl(var(--primary))] animate-spin mx-auto mb-2" />
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] pb-12">
      {/* ─── Top Navigation ─────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-[hsl(var(--border))] bg-[hsl(var(--background)/0.8)] backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-lg)] bg-[hsl(var(--primary))] shadow-[var(--shadow-sm)]">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold text-[hsl(var(--foreground))]">
                MediFlow
              </span>
              <span className="ml-2 rounded-[var(--radius-full)] bg-[hsl(var(--primary-light))] px-2 py-0.5 text-xs font-semibold text-[hsl(var(--primary))]">
                Patient Portal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
              <User className="h-4 w-4" />
              <span className="font-medium text-[hsl(var(--foreground))]">{user?.name}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="text-xs flex items-center gap-1.5"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* ─── Main Content ───────────────────────────────── */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Next Upcoming Appointment Hero Card (or Greeting) */}
        {nextAppointment ? (
          <div className="rounded-[var(--radius-2xl)] border border-[hsl(var(--primary)/0.3)] bg-[hsl(var(--card))] p-6 sm:p-8 shadow-[var(--shadow-md)] relative overflow-hidden">
            <div className="absolute top-0 right-0 h-40 w-40 bg-[hsl(var(--primary)/0.05)] rounded-full -mr-12 -mt-12 pointer-events-none" />

            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-[hsl(var(--success))] animate-ping" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--primary))]">
                    Next Upcoming Appointment
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-[hsl(var(--foreground))]">
                  {nextAppointment.doctorName}
                </h1>
                <p className="text-xs sm:text-sm font-medium text-[hsl(var(--primary))]">
                  {nextAppointment.doctorSpecialty} • {nextAppointment.branchName}
                </p>

                <div className="flex flex-wrap items-center gap-4 text-xs text-[hsl(var(--muted-foreground))] pt-2">
                  <div className="flex items-center gap-1.5 font-semibold text-[hsl(var(--foreground))]">
                    <Calendar className="h-4 w-4 text-[hsl(var(--primary))]" />
                    <span>{nextAppointment.date}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-semibold text-[hsl(var(--foreground))]">
                    <Clock className="h-4 w-4 text-[hsl(var(--primary))]" />
                    <span>{nextAppointment.startTime}</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-[hsl(var(--primary-light))] text-[hsl(var(--primary))] px-2.5 py-0.5 rounded-[var(--radius-full)] font-bold font-mono">
                    <Ticket className="h-3 w-3" />
                    <span>Token: {nextAppointment.tokenNumber}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto shrink-0">
                <Link href={`/patient/queue/${nextAppointment.doctorId}`} className="w-full sm:w-auto">
                  <Button size="lg" className="w-full flex items-center justify-center gap-2 font-bold shadow-[var(--shadow-sm)]">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                    </span>
                    Live Queue Tracker
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/patient/appointments" className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="w-full text-xs">
                    View Details
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-[var(--radius-2xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6 sm:p-8 shadow-[var(--shadow-sm)]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-[hsl(var(--foreground))]">
                  Welcome, {user?.name || "Patient"} 👋
                </h1>
                <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                  Find certified specialists, check live availability, and book appointments with real-time queue tracking.
                </p>
              </div>
              <Link href="/patient/search">
                <Button size="lg" className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Find Doctors & Book
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Quick Action Tiles */}
        <div>
          <h2 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-4">
            Patient Services
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/patient/search" className="block group">
              <div className="h-full rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-5 shadow-[var(--shadow-sm)] transition-all group-hover:border-[hsl(var(--primary))] group-hover:shadow-[var(--shadow)]">
                <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[hsl(var(--primary-light))] text-[hsl(var(--primary))] mb-3">
                  <Calendar className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-sm text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--primary))] transition-colors flex items-center justify-between">
                  Book Appointment
                  <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </h3>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                  Select doctor, date, and live available slot.
                </p>
              </div>
            </Link>

            <Link href="/patient/appointments" className="block group">
              <div className="h-full rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-5 shadow-[var(--shadow-sm)] transition-all group-hover:border-[hsl(var(--primary))] group-hover:shadow-[var(--shadow)]">
                <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[hsl(var(--info-light))] text-[hsl(var(--info))] mb-3">
                  <Clock className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-sm text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--primary))] transition-colors flex items-center justify-between">
                  My Appointments
                  <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </h3>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                  Check-in, reschedule, cancel, or track queue.
                </p>
              </div>
            </Link>

            <Link href={nextAppointment ? `/patient/queue/${nextAppointment.doctorId}` : "/patient/queue/doc_patel_01"} className="block group">
              <div className="h-full rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-5 shadow-[var(--shadow-sm)] transition-all group-hover:border-[hsl(var(--primary))] group-hover:shadow-[var(--shadow)]">
                <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[hsl(var(--success-light))] text-[hsl(var(--success))] mb-3">
                  <Ticket className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-sm text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--primary))] transition-colors flex items-center justify-between">
                  Live Queue Tracker
                  <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </h3>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                  Track token position & live estimated wait time.
                </p>
              </div>
            </Link>

            <Link href="/patient/search" className="block group">
              <div className="h-full rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-5 shadow-[var(--shadow-sm)] transition-all group-hover:border-[hsl(var(--primary))] group-hover:shadow-[var(--shadow)]">
                <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[hsl(var(--warning-light))] text-[hsl(var(--warning))] mb-3">
                  <Stethoscope className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-sm text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--primary))] transition-colors flex items-center justify-between">
                  Specialist Directory
                  <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </h3>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                  Filter by cardiology, pediatrics, fee, and branch.
                </p>
              </div>
            </Link>
          </div>
        </div>

        {/* Phase 2 Feature Banner */}
        <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--primary)/0.2)] bg-[hsl(var(--primary-light))] p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-white text-sm font-bold">
              ✓
            </div>
            <div>
              <h3 className="font-bold text-sm text-[hsl(var(--foreground))]">
                Phase 2: Doctor Discovery, Smart Scheduling & Live Queue is Active
              </h3>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                Full deterministic slot engine, booking tokens, and live queue tracking are operational.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

