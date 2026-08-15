"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Activity,
  CheckCircle2,
  Eye,
  EyeOff,
  ShieldAlert,
  Lock,
  ArrowLeft,
  Check,
  X,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

export default function ResetPasswordPage() {
  return (
    <React.Suspense
      fallback={
        <div className="w-full max-w-md mx-auto py-12 text-center text-sm text-[hsl(var(--muted-foreground))]">
          Loading password reset...
        </div>
      }
    >
      <ResetPasswordContent />
    </React.Suspense>
  );
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [redirectCountdown, setRedirectCountdown] = React.useState(3);

  // Validation rules
  const rules = [
    { label: "At least 8 characters", valid: password.length >= 8 },
    { label: "One uppercase letter", valid: /[A-Z]/.test(password) },
    { label: "One number", valid: /[0-9]/.test(password) },
    { label: "One special character", valid: /[^A-Za-z0-9]/.test(password) },
  ];

  const allRulesPassed = rules.every((r) => r.valid);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  // Countdown timer on success
  React.useEffect(() => {
    if (!isSuccess) return;

    if (redirectCountdown <= 0) {
      router.push("/auth/login");
      return;
    }

    const timer = setTimeout(() => {
      setRedirectCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [isSuccess, redirectCountdown, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!token) {
      setErrorMessage("Missing or invalid reset token. Please request a new password reset link.");
      return;
    }

    if (!allRulesPassed) {
      setErrorMessage("Please ensure your new password satisfies all complexity requirements.");
      return;
    }

    if (!passwordsMatch) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(
          data.error?.message || "Failed to reset password. The link may have expired."
        );
        return;
      }

      setIsSuccess(true);
    } catch {
      setErrorMessage("A network error occurred. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto py-8 animate-fade-in-up">
      {/* Brand Header */}
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
          {isSuccess ? "Password updated!" : "Create new password"}
        </h1>
        <p className="mt-1.5 text-xs sm:text-sm text-[hsl(var(--muted-foreground))]">
          {isSuccess
            ? "Your password has been changed successfully"
            : "Choose a strong password for your MediFlow account"}
        </p>
      </div>

      {/* Main Card */}
      <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6 sm:p-8 shadow-[var(--shadow-sm)]">
        {!token && !isSuccess ? (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--danger-light))] text-[hsl(var(--danger))] border border-[hsl(var(--danger)/0.3)]">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h2 className="font-serif text-xl font-normal text-[hsl(var(--foreground))]">
                Invalid Reset Link
              </h2>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                This password reset link is missing a security token or has expired.
              </p>
            </div>
            <Link
              href="/auth/forgot-password"
              className={buttonVariants({ size: "lg", className: "w-full mt-2" })}
            >
              Request New Reset Link
            </Link>
          </div>
        ) : isSuccess ? (
          <div className="space-y-5 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--success-light))] text-[hsl(var(--success))] border border-[hsl(var(--success)/0.3)]">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-[hsl(var(--foreground))]">
                Your password has been successfully reset. All previous active sessions have been signed out for security.
              </p>
              <p className="text-xs text-[hsl(var(--muted-foreground))] pt-2">
                Redirecting to sign in page in <strong className="text-[hsl(var(--primary))] font-mono">{redirectCountdown}s</strong>...
              </p>
            </div>
            <Link
              href="/auth/login"
              className={buttonVariants({ size: "lg", className: "w-full mt-2" })}
            >
              Sign In Now
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div
                className="flex items-start gap-2 rounded-[var(--radius)] bg-[hsl(var(--danger-light))] p-3 text-xs font-medium text-[hsl(var(--danger))] border border-[hsl(var(--danger)/0.3)]"
                role="alert"
              >
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p>{errorMessage}</p>
                  {errorMessage.includes("expired") && (
                    <Link
                      href="/auth/forgot-password"
                      className="mt-1 inline-block underline font-semibold"
                    >
                      Request a new reset link
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* New Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="text-sm font-medium text-[hsl(var(--foreground))]"
              >
                New Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password"
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

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="confirmPassword"
                className="text-sm font-medium text-[hsl(var(--foreground))]"
              >
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  className="flex h-10 w-full rounded-[var(--radius)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 pr-10 text-sm placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-[hsl(var(--input-focus)/0.4)] focus-visible:border-[hsl(var(--input-focus))] disabled:opacity-50 transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="text-xs text-[hsl(var(--danger))] animate-fade-in">
                  Passwords do not match
                </p>
              )}
            </div>

            {/* Password Requirement Checklist */}
            <div className="rounded-[var(--radius)] border border-[hsl(var(--card-border))] bg-[hsl(var(--background))] p-3.5 space-y-1.5">
              <p className="text-xs font-medium text-[hsl(var(--foreground))] mb-1">
                Password requirements:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px]">
                {rules.map((rule) => (
                  <div
                    key={rule.label}
                    className={`flex items-center gap-1.5 ${
                      rule.valid
                        ? "text-[hsl(var(--success))]"
                        : "text-[hsl(var(--muted-foreground))]"
                    }`}
                  >
                    {rule.valid ? (
                      <Check className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <X className="h-3.5 w-3.5 shrink-0 opacity-50" />
                    )}
                    <span>{rule.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <Button
              type="submit"
              className="w-full mt-2"
              size="lg"
              isLoading={isLoading}
              disabled={!allRulesPassed || !passwordsMatch}
            >
              <Lock className="h-4 w-4" />
              Reset Password
            </Button>
          </form>
        )}
      </div>

      {/* Footer Navigation */}
      <p className="mt-6 text-center text-xs sm:text-sm text-[hsl(var(--muted-foreground))]">
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-1.5 font-medium text-[hsl(var(--foreground))] hover:text-[hsl(var(--primary))] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Sign In
        </Link>
      </p>
    </div>
  );
}
