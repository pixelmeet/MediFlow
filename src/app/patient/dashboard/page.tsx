"use client";

import * as React from "react";
import Link from "next/link";
import { Activity, Calendar, Clock, FileText, History, LogOut, User, Search, Stethoscope, ChevronRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/shared";

export default function PatientDashboard() {
  const { user, logout, isLoading } = useAuth();

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
    <div className="min-h-screen bg-[hsl(var(--background))]">
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
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Greeting Card */}
        <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6 sm:p-8 shadow-[var(--shadow-sm)] mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[hsl(var(--foreground))]">
                Welcome, {user?.name || "Patient"} 👋
              </h1>
              <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                Your medical dashboard is active. You can find doctors and schedule appointments below.
              </p>
            </div>
            <Link href="/patient/search">
              <Button size="lg" className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Find Doctors (Phase 2)
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick Action Tiles */}
        <h2 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="rounded-[var(--radius-lg)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-5 shadow-[var(--shadow-sm)] transition-all hover:border-[hsl(var(--primary)/0.4)] hover:shadow-[var(--shadow)]">
            <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[hsl(var(--primary-light))] text-[hsl(var(--primary))] mb-3">
              <Calendar className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-sm text-[hsl(var(--foreground))]">Book Appointment</h3>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
              Select doctor, date, and live available slot.
            </p>
          </div>

          <div className="rounded-[var(--radius-lg)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-5 shadow-[var(--shadow-sm)] transition-all hover:border-[hsl(var(--primary)/0.4)] hover:shadow-[var(--shadow)]">
            <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[hsl(var(--info-light))] text-[hsl(var(--info))] mb-3">
              <Clock className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-sm text-[hsl(var(--foreground))]">Live Queue</h3>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
              Track token position & live estimated wait time.
            </p>
          </div>

          <div className="rounded-[var(--radius-lg)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-5 shadow-[var(--shadow-sm)] transition-all hover:border-[hsl(var(--primary)/0.4)] hover:shadow-[var(--shadow)]">
            <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[hsl(var(--success-light))] text-[hsl(var(--success))] mb-3">
              <FileText className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-sm text-[hsl(var(--foreground))]">Digital Prescriptions</h3>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
              Download doctor prescriptions and PDF notes.
            </p>
          </div>

          <div className="rounded-[var(--radius-lg)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-5 shadow-[var(--shadow-sm)] transition-all hover:border-[hsl(var(--primary)/0.4)] hover:shadow-[var(--shadow)]">
            <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[hsl(var(--warning-light))] text-[hsl(var(--warning))] mb-3">
              <History className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-sm text-[hsl(var(--foreground))]">Medical History</h3>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
              View past consultations & diagnostic records.
            </p>
          </div>
        </div>

        {/* Phase Status Banner */}
        <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--primary)/0.2)] bg-[hsl(var(--primary-light))] p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-white text-sm font-bold">
              ✓
            </div>
            <div>
              <h3 className="font-bold text-sm text-[hsl(var(--foreground))]">
                Phase 1: Authentication & Roles is Active
              </h3>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                Session verified for user ID: <code className="bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded font-mono">{user?.id}</code> ({user?.role})
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
