import Link from "next/link";
import { Activity } from "lucide-react";

export default function RegisterPage() {
  return (
    <div className="animate-fade-in-up">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-lg)] bg-[hsl(var(--primary))]">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <span className="text-2xl font-bold text-[hsl(var(--foreground))]">
            MediFlow
          </span>
        </div>
        <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">
          Create your account
        </h1>
        <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
          Register to book appointments and track your health
        </p>
      </div>

      <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6 shadow-[var(--shadow-lg)]">
        <p className="text-center text-sm text-[hsl(var(--muted-foreground))]">
          Registration form will be implemented in Phase 1
        </p>
      </div>

      <p className="mt-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
        Already have an account?{" "}
        <Link
          href="/auth/login"
          className="font-semibold text-[hsl(var(--primary))] hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
