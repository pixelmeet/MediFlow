"use client";

import * as React from "react";
import Link from "next/link";
import {
  Activity,
  Calendar,
  Clock,
  LogOut,
  User,
  Search,
  ChevronRight,
  Ticket,
  ArrowRight,
  FileText,
  Bot,
  Sparkles,
  ClipboardList,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { SymptomAssistantModal } from "@/components/patient/SymptomAssistantModal";
import type { AppointmentDTO } from "@/lib/services/AppointmentService";

export default function PatientDashboard() {
  const { user, logout, isLoading } = useAuth();
  const [upcomingApts, setUpcomingApts] = React.useState<AppointmentDTO[]>([]);
  const [isAiModalOpen, setIsAiModalOpen] = React.useState(false);

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
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))]">
        <div className="text-center space-y-2">
          <Activity className="h-8 w-8 text-[hsl(var(--primary))] animate-spin mx-auto mb-2" />
          <p className="text-xs text-[hsl(var(--muted-foreground))]">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] pb-16">
      {/* ─── Top Navigation ─────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-[hsl(var(--border))] bg-[hsl(var(--background))] shadow-[var(--shadow-sm)]">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-lg)] bg-[hsl(var(--primary))] text-white shadow-[var(--shadow-sm)]">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <span className="font-serif text-xl font-normal tracking-tight text-[hsl(var(--foreground))]">
                MediFlow
              </span>
              <span className="ml-2 font-mono text-[10px] font-medium uppercase bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] px-2 py-0.5 rounded-[var(--radius-sm)]">
                Patient Portal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell />

            <Link
              href="/patient/profile"
              className="hidden sm:flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
            >
              <User className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
              <span className="font-medium text-[hsl(var(--foreground))]">{user?.name}</span>
            </Link>

            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="text-xs flex items-center gap-1.5 text-[hsl(var(--danger))] border-[hsl(var(--danger)/0.3)] hover:bg-[hsl(var(--danger-light))]"
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
          <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6 sm:p-8 shadow-[var(--shadow-sm)] relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[hsl(var(--success))]" />
                  <span className="text-xs font-mono font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                    Upcoming Consultation
                  </span>
                </div>

                <h1 className="font-serif text-2xl sm:text-3xl font-normal text-[hsl(var(--foreground))] tracking-tight">
                  {nextAppointment.doctorName}
                </h1>
                <p className="text-xs sm:text-sm font-medium text-[hsl(var(--muted-foreground))]">
                  {nextAppointment.doctorSpecialty} • {nextAppointment.branchName}
                </p>

                <div className="flex flex-wrap items-center gap-4 text-xs text-[hsl(var(--muted-foreground))] pt-2 font-sans">
                  <div className="flex items-center gap-1.5 font-medium text-[hsl(var(--foreground))]">
                    <Calendar className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                    <span>{nextAppointment.date}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-medium text-[hsl(var(--foreground))]">
                    <Clock className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                    <span>{nextAppointment.startTime}</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] px-2.5 py-0.5 rounded-[var(--radius-full)] font-mono text-xs font-medium">
                    <Ticket className="h-3 w-3 text-[hsl(var(--muted-foreground))]" />
                    <span>Token: {nextAppointment.tokenNumber}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto shrink-0">
                <Link href={`/patient/queue/${nextAppointment.doctorId}`} className="w-full sm:w-auto">
                  <Button size="lg" className="w-full flex items-center justify-center gap-2 font-medium shadow-[var(--shadow-sm)]">
                    <span className="h-2 w-2 rounded-full bg-white" />
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
          <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6 sm:p-8 shadow-[var(--shadow-sm)]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="font-serif text-2xl sm:text-3xl font-normal text-[hsl(var(--foreground))] tracking-tight">
                  Welcome, {user?.name || "Patient"}
                </h1>
                <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))] font-sans">
                  Find certified specialists, verify live availability, and book appointments with real-time queue tracking.
                </p>
              </div>
              <Link href="/patient/search">
                <Button size="lg" className="flex items-center gap-2 font-medium">
                  <Search className="h-4 w-4" />
                  Find Doctors &amp; Book
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* ─── AI Symptom Triage Banner ─────────────────────── */}
        <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6 sm:p-8 shadow-[var(--shadow-sm)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-[hsl(var(--muted))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] shadow-sm">
              <Bot className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-medium uppercase bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] px-2 py-0.5 rounded-[var(--radius-full)] flex items-center gap-1">
                  <Sparkles className="h-2.5 w-2.5 text-[hsl(var(--primary))]" /> AI Triage Guide
                </span>
                <span className="text-xs text-[hsl(var(--muted-foreground))]">Clinical Specialty Recommender</span>
              </div>
              <h3 className="font-serif text-lg sm:text-xl font-normal text-[hsl(var(--foreground))]">
                Unsure which specialist you need to consult?
              </h3>
              <p className="text-xs text-[hsl(var(--muted-foreground))] max-w-2xl leading-relaxed font-sans">
                Describe your symptoms in plain English to receive instant hospital department recommendations and emergency screening.
              </p>
            </div>
          </div>

          <Button
            onClick={() => setIsAiModalOpen(true)}
            size="lg"
            className="w-full sm:w-auto font-medium text-xs flex items-center justify-center gap-2 shadow-[var(--shadow-sm)] shrink-0"
          >
            <Sparkles className="h-4 w-4" />
            Ask AI Assistant
          </Button>
        </div>

        {/* Quick Action Tiles */}
        <div>
          <h2 className="font-serif text-xl font-normal text-[hsl(var(--foreground))] mb-4">
            Patient Services
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Link href="/patient/search" className="block group">
              <div className="h-full rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-5 shadow-[var(--shadow-sm)] transition-colors group-hover:border-[hsl(var(--primary)/0.4)]">
                <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[hsl(var(--muted))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] mb-3">
                  <Calendar className="h-5 w-5" />
                </div>
                <h3 className="font-serif text-base font-normal text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--primary))] transition-colors flex items-center justify-between">
                  Book Appointment
                  <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </h3>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 font-sans">
                  Select doctor, date, and live available slot.
                </p>
              </div>
            </Link>

            <Link href="/patient/appointments" className="block group">
              <div className="h-full rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-5 shadow-[var(--shadow-sm)] transition-colors group-hover:border-[hsl(var(--primary)/0.4)]">
                <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[hsl(var(--muted))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] mb-3">
                  <Clock className="h-5 w-5" />
                </div>
                <h3 className="font-serif text-base font-normal text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--primary))] transition-colors flex items-center justify-between">
                  My Appointments
                  <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </h3>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 font-sans">
                  Check-in, reschedule, cancel, or track queue.
                </p>
              </div>
            </Link>

            <Link href="/patient/prescriptions" className="block group">
              <div className="h-full rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-5 shadow-[var(--shadow-sm)] transition-colors group-hover:border-[hsl(var(--primary)/0.4)]">
                <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[hsl(var(--muted))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] mb-3">
                  <FileText className="h-5 w-5" />
                </div>
                <h3 className="font-serif text-base font-normal text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--primary))] transition-colors flex items-center justify-between">
                  Prescriptions
                  <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </h3>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 font-sans">
                  View, print, and save doctor digital prescriptions.
                </p>
              </div>
            </Link>

            {nextAppointment ? (
              <Link href={`/patient/queue/${nextAppointment.doctorId}`} className="block group">
                <div className="h-full rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-5 shadow-[var(--shadow-sm)] transition-colors group-hover:border-[hsl(var(--primary)/0.4)]">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[hsl(var(--muted))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] mb-3">
                    <Ticket className="h-5 w-5" />
                  </div>
                  <h3 className="font-serif text-base font-normal text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--primary))] transition-colors flex items-center justify-between">
                    Live Queue Tracker
                    <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 font-sans">
                    Track token position &amp; live estimated wait time.
                  </p>
                </div>
              </Link>
            ) : (
              <div className="block opacity-50 cursor-not-allowed">
                <div className="h-full rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-5 shadow-[var(--shadow-sm)]">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[hsl(var(--muted))] border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] mb-3">
                    <Ticket className="h-5 w-5" />
                  </div>
                  <h3 className="font-serif text-base font-normal text-[hsl(var(--foreground))] flex items-center justify-between">
                    Live Queue Tracker
                  </h3>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 font-sans">
                    No active appointment to track.
                  </p>
                </div>
              </div>
            )}

            <Link href="/patient/medical-history" className="block group">
              <div className="h-full rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-5 shadow-[var(--shadow-sm)] transition-colors group-hover:border-[hsl(var(--primary)/0.4)]">
                <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[hsl(var(--muted))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] mb-3">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <h3 className="font-serif text-base font-normal text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--primary))] transition-colors flex items-center justify-between">
                  Medical History
                  <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </h3>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 font-sans">
                  Past diagnoses, records, and clinical summaries.
                </p>
              </div>
            </Link>
          </div>
        </div>

        {/* AI Symptom Assistant Modal */}
        <SymptomAssistantModal
          isOpen={isAiModalOpen}
          onClose={() => setIsAiModalOpen(false)}
        />
      </main>
    </div>
  );
}
