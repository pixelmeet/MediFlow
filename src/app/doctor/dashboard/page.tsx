"use client";

import * as React from "react";
import Link from "next/link";
import { Activity, Stethoscope, Users, Calendar, Clock, LogOut, User, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/shared";

export default function DoctorDashboard() {
  const { user, logout, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Activity className="h-8 w-8 text-[hsl(var(--primary))] animate-spin mx-auto mb-2" />
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Loading clinical portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      {/* ─── Top Header ─────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-[hsl(var(--border))] bg-[hsl(var(--background)/0.8)] backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-lg)] bg-[hsl(var(--primary))] shadow-[var(--shadow-sm)]">
              <Stethoscope className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold text-[hsl(var(--foreground))]">
                MediFlow
              </span>
              <span className="ml-2 rounded-[var(--radius-full)] bg-[hsl(var(--success-light))] px-2 py-0.5 text-xs font-semibold text-[hsl(var(--success))]">
                Doctor Portal
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

      {/* ─── Doctor Overview ────────────────────────────── */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6 sm:p-8 shadow-[var(--shadow-sm)] mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--success))] animate-pulse-live" />
                <span className="text-xs font-medium text-[hsl(var(--success))] uppercase tracking-wider">Clinical Station Online</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[hsl(var(--foreground))] mt-1">
                {user?.name || "Dr. Practitioner"}
              </h1>
              <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                Welcome to your clinical workspace. Manage availability and consultations.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-3 py-1.5 rounded-[var(--radius-md)] bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))] font-medium">
                Role: {user?.role}
              </span>
            </div>
          </div>
        </div>

        {/* 4 KPI Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Today's Appointments"
            value="12"
            icon={<Calendar className="h-5 w-5" />}
          />
          <StatCard
            label="Patients Waiting"
            value="3"
            icon={<Clock className="h-5 w-5" />}
          />
          <StatCard
            label="Completed Consultations"
            value="8"
            icon={<CheckCircle2 className="h-5 w-5 text-[hsl(var(--success))]" />}
          />
          <StatCard
            label="Total Patients"
            value="142"
            icon={<Users className="h-5 w-5" />}
          />
        </div>

        {/* Phase Status Banner */}
        <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6">
          <h3 className="font-semibold text-base text-[hsl(var(--foreground))] mb-2">
            Clinical Module Roadmap
          </h3>
          <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">
            Doctor schedule management & break editor will be enabled in <strong>Phase 3</strong>, and the active consultation workflow with digital prescription builder will ship in <strong>Phase 5</strong>.
          </p>
        </div>
      </main>
    </div>
  );
}
