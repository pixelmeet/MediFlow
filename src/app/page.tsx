import Link from "next/link";
import {
  Calendar,
  Clock,
  Users,
  Activity,
  Shield,
  Stethoscope,
  ArrowRight,
  CheckCircle,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      {/* ─── Navbar ───────────────────────────────────── */}
      <nav className="sticky top-0 z-40 border-b border-[hsl(var(--border))] bg-[hsl(var(--background)/0.8)] backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-lg)] bg-[hsl(var(--primary))]">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-[hsl(var(--foreground))]">
              MediFlow
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-[var(--radius)] px-4 py-2 text-sm font-medium text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))] transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="rounded-[var(--radius)] bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary-hover))] transition-colors shadow-[var(--shadow-sm)] press-scale"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero Section ─────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Gradient background accent */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[hsl(var(--primary)/0.06)] rounded-full blur-3xl" />
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20 pb-24 text-center">
          <div className="animate-fade-in-up">
            <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-full)] bg-[hsl(var(--primary-light))] px-3 py-1 text-xs font-semibold text-[hsl(var(--primary))] mb-6">
              <Activity className="h-3.5 w-3.5" />
              Smart Hospital Management
            </span>
          </div>

          <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[hsl(var(--foreground))] animate-fade-in-up">
            Reduce Wait Times.
            <br />
            <span className="text-[hsl(var(--primary))]">
              Streamline Patient Flow.
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-[hsl(var(--muted-foreground))] max-w-2xl mx-auto animate-fade-in-up">
            MediFlow combines intelligent appointment scheduling with real-time
            queue management to transform your hospital operations.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-[var(--radius-lg)] bg-[hsl(var(--primary))] px-6 py-3 text-base font-semibold text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary-hover))] transition-all shadow-[var(--shadow-md)] press-scale"
            >
              Book an Appointment
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-[var(--radius-lg)] border border-[hsl(var(--border))] px-6 py-3 text-base font-semibold text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))] transition-all press-scale"
            >
              Staff Login
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Features Grid ────────────────────────────── */}
      <section className="border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-[hsl(var(--foreground))]">
              Everything You Need
            </h2>
            <p className="mt-3 text-[hsl(var(--muted-foreground))] max-w-lg mx-auto">
              A complete platform for patients, doctors, and administrators.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className="group rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6 shadow-[var(--shadow-sm)] transition-all hover:shadow-[var(--shadow-md)] hover:border-[hsl(var(--primary)/0.3)]"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-lg)] bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] mb-4 group-hover:bg-[hsl(var(--primary))] group-hover:text-white transition-colors">
                  {feature.icon}
                </div>
                <h3 className="text-base font-semibold text-[hsl(var(--foreground))]">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Stats Section ────────────────────────────── */}
      <section className="border-t border-[hsl(var(--border))]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl font-bold text-[hsl(var(--primary))] tabular-nums">
                  {stat.value}
                </p>
                <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ─────────────────────────────── */}
      <section className="border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-[hsl(var(--foreground))]">
              How It Works
            </h2>
            <p className="mt-3 text-[hsl(var(--muted-foreground))]">
              Three simple steps to a better hospital experience.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <div key={step.title} className="relative text-center">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] text-lg font-bold mb-4">
                  {i + 1}
                </div>
                <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))] max-w-xs mx-auto">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA Section ──────────────────────────────── */}
      <section className="border-t border-[hsl(var(--border))]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h2 className="text-3xl font-bold text-[hsl(var(--foreground))]">
            Ready to Transform Your Hospital?
          </h2>
          <p className="mt-3 text-[hsl(var(--muted-foreground))] max-w-lg mx-auto">
            Join hospitals that have reduced wait times by 50% and improved
            patient satisfaction.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-[var(--radius-lg)] bg-[hsl(var(--primary))] px-8 py-3.5 text-base font-semibold text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary-hover))] transition-all shadow-[var(--shadow-md)] press-scale"
            >
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-6 flex items-center justify-center gap-6 text-sm text-[hsl(var(--muted-foreground))]">
            <span className="flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-[hsl(var(--success))]" />
              No setup fee
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-[hsl(var(--success))]" />
              Free for patients
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-[hsl(var(--success))]" />
              Live in minutes
            </span>
          </div>
        </div>
      </section>

      {/* ─── Footer ───────────────────────────────────── */}
      <footer className="border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-[var(--radius)] bg-[hsl(var(--primary))]">
                <Activity className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-semibold text-[hsl(var(--foreground))]">
                MediFlow
              </span>
            </div>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              © {new Date().getFullYear()} MediFlow. Built for better healthcare.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── Data ────────────────────────────────────────────────

const features = [
  {
    icon: <Calendar className="h-5 w-5" />,
    title: "Smart Scheduling",
    description:
      "Intelligent slot generation that accounts for breaks, holidays, and buffer time. Patients only see truly available slots.",
  },
  {
    icon: <Clock className="h-5 w-5" />,
    title: "Live Queue Tracking",
    description:
      "Real-time queue position, wait time estimates, and doctor status updates via WebSocket — no more guessing.",
  },
  {
    icon: <Stethoscope className="h-5 w-5" />,
    title: "Doctor Dashboard",
    description:
      "Fast, low-friction consultation workflow with patient history, prescription builder, and auto-queue advancement.",
  },
  {
    icon: <Users className="h-5 w-5" />,
    title: "Multi-Role Platform",
    description:
      "Purpose-built interfaces for patients, doctors, and admin staff — all sharing one source of truth.",
  },
  {
    icon: <Activity className="h-5 w-5" />,
    title: "Hospital Analytics",
    description:
      "Real-time KPIs — utilization rates, wait times, no-show tracking, department performance, and trend analysis.",
  },
  {
    icon: <Shield className="h-5 w-5" />,
    title: "Secure & Audited",
    description:
      "Role-based access control, encrypted sessions, full audit trail on every admin action and override.",
  },
];

const stats = [
  { value: "±10 min", label: "Wait Time Accuracy" },
  { value: "50%", label: "Reduced Queue Time" },
  { value: "<2s", label: "Real-time Updates" },
  { value: "99.5%", label: "System Uptime" },
];

const steps = [
  {
    title: "Find Your Doctor",
    description:
      "Search by specialty, location, availability, or fee. View profiles and choose the right fit.",
  },
  {
    title: "Book Instantly",
    description:
      "Pick an available slot, confirm your appointment, and receive a token number — all in seconds.",
  },
  {
    title: "Track Live Queue",
    description:
      "Know your exact position in queue, estimated wait time, and get notified when it's your turn.",
  },
];
