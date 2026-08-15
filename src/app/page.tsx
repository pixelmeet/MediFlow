"use client";

import * as React from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Users,
  Activity,
  Shield,
  Stethoscope,
  ArrowRight,
  Menu,
  X,
  Sparkles,
  ChevronRight,
  Check,
} from "lucide-react";

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      {/* ─── Band 1: Navbar (Cream Canvas) ───────────────────── */}
      <nav className="sticky top-0 z-40 border-b border-[hsl(var(--border))] bg-[hsl(var(--background))] backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-lg)] bg-[hsl(var(--primary))] text-white shadow-[var(--shadow-sm)]">
              <Activity className="h-5 w-5" />
            </div>
            <span className="font-serif text-2xl font-normal tracking-tight text-[hsl(var(--foreground))]">
              MediFlow
            </span>
          </Link>

          {/* Desktop Nav Actions */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/auth/login"
              className="rounded-[var(--radius)] px-4 py-2 text-sm font-medium text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/auth/register"
              className="rounded-[var(--radius)] bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-white hover:bg-[hsl(var(--primary-hover))] active:bg-[hsl(var(--primary-hover))] transition-colors shadow-[var(--shadow-sm)] press-scale"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-[var(--radius-md)] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Navigation Drawer Sheet (Cream) */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-x-0 top-16 bottom-0 z-50 bg-[hsl(var(--background))] border-t border-[hsl(var(--border))] p-6 flex flex-col justify-between animate-fade-in">
            <div className="space-y-4">
              <Link
                href="/auth/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-lg font-serif font-normal py-2 border-b border-[hsl(var(--border))]"
              >
                Sign In
              </Link>
              <Link
                href="/auth/register"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-lg font-serif font-normal py-2 border-b border-[hsl(var(--border))]"
              >
                Create Account
              </Link>
              <Link
                href="/auth/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-sm text-[hsl(var(--muted-foreground))] py-1"
              >
                Doctor & Hospital Staff Portal
              </Link>
            </div>

            <div className="pt-6">
              <Link
                href="/auth/register"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-[hsl(var(--primary))] py-3.5 text-base font-medium text-white shadow-[var(--shadow-sm)]"
              >
                Get Started Free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* ─── Band 2: Hero Section (Cream Canvas, 96px Spacing) ── */}
      <section className="py-24 relative overflow-hidden">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-[var(--radius-full)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] px-3.5 py-1.5 text-xs font-medium text-[hsl(var(--foreground))] mb-8 shadow-[var(--shadow-sm)]">
            <Sparkles className="h-3.5 w-3.5 text-[hsl(var(--primary))]" />
            <span>Intelligent Hospital Flow & Real-Time Queue Management</span>
          </div>

          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-normal tracking-[-0.03em] leading-[1.08] text-[hsl(var(--foreground))] max-w-4xl mx-auto">
            Reduce wait times.
            <br />
            <span className="italic text-[hsl(var(--primary))]">
              Streamline patient flow.
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-[hsl(var(--muted-foreground))] max-w-2xl mx-auto font-sans leading-relaxed">
            MediFlow unifies patient booking, live telemetry queues, and clinical consultation workflows into one calm, predictable platform.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-[hsl(var(--primary))] px-7 py-3.5 text-sm font-medium text-white hover:bg-[hsl(var(--primary-hover))] active:bg-[hsl(var(--primary-hover))] transition-colors shadow-[var(--shadow-sm)] press-scale"
            >
              Book an Appointment
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/auth/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-[var(--radius-lg)] border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] px-7 py-3.5 text-sm font-medium text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary-hover))] transition-colors press-scale"
            >
              Staff Portal
            </Link>
          </div>

          {/* Key Metric Indicators */}
          <div className="mt-16 pt-10 border-t border-[hsl(var(--border))] grid grid-cols-2 md:grid-cols-4 gap-6 text-left">
            {stats.map((stat) => (
              <div key={stat.label} className="p-2">
                <p className="font-serif text-2xl sm:text-3xl font-normal text-[hsl(var(--foreground))] tabular-nums">
                  {stat.value}
                </p>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 font-sans">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Band 3: Feature Grid (Surface Card #efe9de, 96px Spacing) ── */}
      <section className="py-24 bg-[hsl(var(--card))] border-y border-[hsl(var(--card-border))]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center mb-16">
            <h2 className="font-serif text-3xl sm:text-4xl font-normal tracking-tight text-[hsl(var(--card-foreground))]">
              Everything built for precision care
            </h2>
            <p className="mt-3 text-sm sm:text-base text-[hsl(var(--muted-foreground))] leading-relaxed">
              Designed to eliminate crowded waiting lobbies and deliver clear, dependable schedules.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-[var(--radius-lg)] border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-8 shadow-[var(--shadow-sm)] transition-colors hover:border-[hsl(var(--primary)/0.4)] flex flex-col justify-between"
              >
                <div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[hsl(var(--card))] border border-[hsl(var(--card-border))] text-[hsl(var(--foreground))] mb-5">
                    {feature.icon}
                  </div>
                  <h3 className="font-serif text-xl font-normal tracking-tight text-[hsl(var(--foreground))]">
                    {feature.title}
                  </h3>
                  <p className="mt-2.5 text-xs sm:text-sm text-[hsl(var(--muted-foreground))] leading-relaxed font-sans">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Band 4: Product Preview (Dark Navy #181715, 96px Spacing) ── */}
      <section className="py-24 bg-[#181715] text-[#faf9f5]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-mono uppercase tracking-widest text-[#a09d96]">
              Real-Time Telemetry
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-normal tracking-tight text-[#faf9f5] mt-2">
              Live Queue Intelligence
            </h2>
            <p className="mt-3 text-sm text-[#a09d96] leading-relaxed">
              Patients track estimated arrival windows from their phone; clinics operate in synchronized tranquility.
            </p>
          </div>

          {/* Dark Product Mockup Card */}
          <div className="rounded-[var(--radius-xl)] border border-[#2d2b27] bg-[#252320] p-6 sm:p-10 shadow-2xl">
            {/* Mockup Header Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[#33302b] gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-[var(--radius-md)] bg-[#181715] border border-[#33302b] flex items-center justify-center text-[hsl(var(--primary))]">
                  <Stethoscope className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-serif text-lg font-normal text-[#faf9f5]">
                    Dr. Ananya Patel, MD
                  </h4>
                  <p className="text-xs text-[#a09d96]">
                    Cardiology Suite 4B • Active Consultation Stream
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#181715] border border-[#33302b] text-xs font-mono text-[#5db872]">
                  <span className="h-2 w-2 rounded-full bg-[#5db872] animate-pulse" />
                  Live Sync Active
                </span>
              </div>
            </div>

            {/* Mockup Data Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
              <div className="rounded-[var(--radius-md)] bg-[#181715] p-4 border border-[#33302b]">
                <p className="text-[11px] font-mono uppercase text-[#a09d96]">Current Token</p>
                <p className="font-serif text-3xl font-normal text-[hsl(var(--primary))] mt-1">A-104</p>
                <p className="text-xs text-[#a09d96] mt-0.5">In Consultation Cabin</p>
              </div>

              <div className="rounded-[var(--radius-md)] bg-[#181715] p-4 border border-[#33302b]">
                <p className="text-[11px] font-mono uppercase text-[#a09d96]">Patients Ahead</p>
                <p className="font-serif text-3xl font-normal text-[#faf9f5] mt-1">2</p>
                <p className="text-xs text-[#a09d96] mt-0.5">Average visit: ~12 mins</p>
              </div>

              <div className="rounded-[var(--radius-md)] bg-[#181715] p-4 border border-[#33302b]">
                <p className="text-[11px] font-mono uppercase text-[#a09d96]">Estimated Wait</p>
                <p className="font-serif text-3xl font-normal text-[#e8a55a] mt-1">~18 mins</p>
                <p className="text-xs text-[#a09d96] mt-0.5">Automated SMS 10m prior</p>
              </div>
            </div>

            {/* Mockup Flow Timeline */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between p-3 rounded-[var(--radius-sm)] bg-[#181715] border border-[#33302b] text-xs font-mono">
                <span className="text-[hsl(var(--primary))] font-medium">Token A-104 • Rahul Sharma</span>
                <span className="text-[#5db872]">Inside Cabin (08m elapsed)</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-[var(--radius-sm)] bg-[#181715]/60 border border-[#33302b]/60 text-xs font-mono text-[#a09d96]">
                <span>Token A-105 • Meera Iyer</span>
                <span>Next in line • Checked In</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-[var(--radius-sm)] bg-[#181715]/40 border border-[#33302b]/40 text-xs font-mono text-[#a09d96]">
                <span>Token A-106 • Siddharth Roy</span>
                <span>Waiting • ETA 11:45 AM</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Band 5: How It Works (Cream Canvas, 96px Spacing) ── */}
      <section className="py-24 bg-[hsl(var(--background))]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="font-serif text-3xl sm:text-4xl font-normal tracking-tight text-[hsl(var(--foreground))]">
              How MediFlow Works
            </h2>
            <p className="mt-3 text-sm sm:text-base text-[hsl(var(--muted-foreground))]">
              Three deliberate steps to a frictionless clinical visit.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <div
                key={step.title}
                className="relative rounded-[var(--radius-lg)] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 shadow-[var(--shadow-sm)]"
              >
                <div className="font-serif text-3xl font-normal text-[hsl(var(--primary))] mb-4">
                  0{i + 1}
                </div>
                <h3 className="font-serif text-xl font-normal tracking-tight text-[hsl(var(--foreground))]">
                  {step.title}
                </h3>
                <p className="mt-2.5 text-xs sm:text-sm text-[hsl(var(--muted-foreground))] leading-relaxed font-sans">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Band 6: Major Callout (Full-Bleed Coral #cc785c, 96px Spacing) ── */}
      <section className="py-24 bg-[hsl(var(--primary))] text-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal tracking-tight text-white">
            Ready to transform your patient flow?
          </h2>
          <p className="mt-4 text-base sm:text-lg text-white/90 max-w-xl mx-auto leading-relaxed font-sans">
            Join modern medical practices reducing wait times by half and restoring dignity to healthcare scheduling.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-[hsl(var(--secondary))] px-8 py-3.5 text-sm font-medium text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] active:bg-[hsl(var(--muted))] transition-colors shadow-md press-scale"
            >
              Get Started Free
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-white/80 font-sans">
            <span className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5" /> No credit card required
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5" /> Free for patient bookings
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5" /> Ready in minutes
            </span>
          </div>
        </div>
      </section>

      {/* ─── Band 7: Footer (Dark Navy #181715, Never Inverts) ── */}
      <footer className="py-16 bg-[#181715] text-[#a09d96] border-t border-[#252320]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] bg-[hsl(var(--primary))] text-white">
                <Activity className="h-4 w-4" />
              </div>
              <span className="font-serif text-xl font-normal text-[#faf9f5]">
                MediFlow
              </span>
            </div>

            <div className="flex items-center gap-6 text-xs">
              <Link href="/auth/login" className="hover:text-[#faf9f5] transition-colors">
                Doctor Login
              </Link>
              <Link href="/auth/login" className="hover:text-[#faf9f5] transition-colors">
                Admin Station
              </Link>
              <Link href="/auth/register" className="hover:text-[#faf9f5] transition-colors">
                Patient Registration
              </Link>
            </div>

            <p className="text-xs text-[#a09d96]">
              © {new Date().getFullYear()} MediFlow. Warm-canvas editorial healthcare system.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── Content Data ────────────────────────────────────────

const features = [
  {
    icon: <Calendar className="h-5 w-5" />,
    title: "Smart Scheduling",
    description:
      "Dynamic slot generation that accounts for consultation complexity, physician breaks, and buffer intervals.",
  },
  {
    icon: <Clock className="h-5 w-5" />,
    title: "Live Queue Telemetry",
    description:
      "Real-time token advancement, live cabin indicators, and dynamic wait times broadcasted via WebSockets.",
  },
  {
    icon: <Stethoscope className="h-5 w-5" />,
    title: "Physician Station",
    description:
      "Low-friction clinical workflow with instant patient history, digital Rx generation, and single-click token progression.",
  },
  {
    icon: <Users className="h-5 w-5" />,
    title: "Multi-Role Architecture",
    description:
      "Purpose-crafted portals for patients, physicians, and clinic administrators backed by unified audit logging.",
  },
  {
    icon: <Activity className="h-5 w-5" />,
    title: "Operational Analytics",
    description:
      "Real-time visibility into department utilization, no-show rates, throughput velocity, and doctor availability.",
  },
  {
    icon: <Shield className="h-5 w-5" />,
    title: "Clinical Data Integrity",
    description:
      "Encrypted sessions, role-based authorization, and strict compliance boundaries for health telemetry.",
  },
];

const stats = [
  { value: "±10 min", label: "Wait Time Accuracy" },
  { value: "50%", label: "Lobby Congestion Reduction" },
  { value: "<2s", label: "Live Queue Sync Velocity" },
  { value: "99.9%", label: "Platform Availability" },
];

const steps = [
  {
    title: "Find Your Doctor",
    description:
      "Filter by specialty, branch, fee, and real-time open slots. Review physician credentials with clarity.",
  },
  {
    title: "Confirm & Receive Token",
    description:
      "Lock your appointment slot instantly and receive a secure token number with estimated consultation window.",
  },
  {
    title: "Arrive On Schedule",
    description:
      "Track live cabin progress from your mobile device. Walk in right when your token is called.",
  },
];
