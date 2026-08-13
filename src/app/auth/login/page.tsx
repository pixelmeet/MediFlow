"use client";

import * as React from "react";
import Link from "next/link";
import { Activity, Eye, EyeOff, ShieldAlert, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const { login } = useAuth();
  const [identifier, setIdentifier] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isLockedOut, setIsLockedOut] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLockedOut(false);

    if (!identifier.trim()) {
      setErrorMessage("Please enter your email or phone number.");
      return;
    }
    if (!password) {
      setErrorMessage("Please enter your password.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await login(identifier.trim(), password);
      if (!res.success) {
        setErrorMessage(res.error || "Failed to sign in. Please check your credentials.");
        if (res.lockout) {
          setIsLockedOut(true);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Demo credential autofill helper
  const handleQuickFill = (role: "ADMIN" | "DOCTOR" | "PATIENT") => {
    setErrorMessage(null);
    if (role === "ADMIN") {
      setIdentifier("admin@mediflow.com");
      setPassword("Password@123");
    } else if (role === "DOCTOR") {
      setIdentifier("dr.patel@mediflow.com");
      setPassword("Password@123");
    } else {
      setIdentifier("patient@mediflow.com");
      setPassword("Password@123");
    }
  };

  return (
    <div className="w-full max-w-md mx-auto py-8 animate-fade-in-up">
      <div className="text-center mb-6">
        <Link href="/" className="inline-flex items-center gap-2 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-lg)] bg-[hsl(var(--primary))] shadow-[var(--shadow-sm)]">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">
            MediFlow
          </span>
        </Link>
        <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">
          Welcome back
        </h1>
        <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
          Sign in to access your appointments & medical flow
        </p>
      </div>

      {/* Demo Credentials Helper Pill */}
      <div className="mb-4 rounded-[var(--radius-lg)] border border-[hsl(var(--primary)/0.2)] bg-[hsl(var(--primary-light))] p-3 text-xs text-[hsl(var(--foreground))]">
        <div className="flex items-center gap-1.5 font-semibold text-[hsl(var(--primary))] mb-2">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Quick Demo Logins (Password: Password@123)</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => handleQuickFill("PATIENT")}
            className="rounded-[var(--radius-sm)] bg-white dark:bg-black/30 border px-2.5 py-1 text-xs font-medium hover:border-[hsl(var(--primary))] transition-colors"
          >
            👤 Patient
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill("DOCTOR")}
            className="rounded-[var(--radius-sm)] bg-white dark:bg-black/30 border px-2.5 py-1 text-xs font-medium hover:border-[hsl(var(--primary))] transition-colors"
          >
            🩺 Dr. Patel
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill("ADMIN")}
            className="rounded-[var(--radius-sm)] bg-white dark:bg-black/30 border px-2.5 py-1 text-xs font-medium hover:border-[hsl(var(--primary))] transition-colors"
          >
            ⚡ Hospital Admin
          </button>
        </div>
      </div>

      {/* Main Login Card */}
      <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6 shadow-[var(--shadow-md)]">
        {errorMessage && (
          <div
            className={`mb-4 flex items-start gap-2 rounded-[var(--radius)] p-3 text-xs font-medium ${
              isLockedOut
                ? "bg-[hsl(var(--danger-light))] text-[hsl(var(--danger))] border border-[hsl(var(--danger)/0.3)]"
                : "bg-[hsl(var(--danger-light))] text-[hsl(var(--danger))]"
            }`}
            role="alert"
          >
            <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
            <p>{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              label="Email address or Phone"
              id="identifier"
              type="text"
              placeholder="e.g. meet@example.com or +919876543210"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="text-sm font-medium text-[hsl(var(--foreground))]"
              >
                Password
              </label>
              <Link
                href="/auth/forgot-password"
                className="text-xs font-medium text-[hsl(var(--primary))] hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="flex h-10 w-full rounded-[var(--radius)] border border-[hsl(var(--input))] bg-transparent px-3 py-2 pr-10 text-sm placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--input-focus))] disabled:opacity-50"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full mt-2"
            size="lg"
            isLoading={isLoading}
          >
            Sign In
          </Button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
        New patient?{" "}
        <Link
          href="/auth/register"
          className="font-semibold text-[hsl(var(--primary))] hover:underline"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
