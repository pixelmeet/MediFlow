"use client";

import * as React from "react";
import Link from "next/link";
import { Activity, Eye, EyeOff, ShieldAlert } from "lucide-react";
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

  return (
    <div className="w-full max-w-md mx-auto py-8 animate-fade-in-up">
      <div className="text-center mb-8">
        <Link href="/" className="inline-flex items-center gap-2 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-lg)] bg-[hsl(var(--primary))] text-white shadow-[var(--shadow-sm)]">
            <Activity className="h-5 w-5" />
          </div>
          <span className="font-serif text-2xl font-normal tracking-tight text-[hsl(var(--foreground))]">
            MediFlow
          </span>
        </Link>
        <h1 className="font-serif text-3xl font-normal tracking-tight text-[hsl(var(--foreground))]">
          Welcome back
        </h1>
        <p className="mt-1.5 text-xs sm:text-sm text-[hsl(var(--muted-foreground))]">
          Sign in to access your appointments &amp; clinical telemetry
        </p>
      </div>

      {/* Main Login Card */}
      <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6 sm:p-8 shadow-[var(--shadow-sm)]">
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
                className="text-xs font-medium text-[hsl(var(--primary))] hover:underline active:underline"
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
                className="flex h-10 w-full rounded-[var(--radius)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 pr-10 text-sm placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-[hsl(var(--input-focus)/0.4)] focus-visible:border-[hsl(var(--input-focus))] disabled:opacity-50 transition-colors"
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

      <p className="mt-6 text-center text-xs sm:text-sm text-[hsl(var(--muted-foreground))]">
        New patient?{" "}
        <Link
          href="/auth/register"
          className="font-medium text-[hsl(var(--primary))] hover:underline active:underline"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
