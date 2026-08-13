"use client";

import * as React from "react";
import Link from "next/link";
import { Activity, ArrowLeft, CheckCircle2, ShieldAlert, KeyRound, ExternalLink, Copy, Check } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [devResetLink, setDevResetLink] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanIdentifier = identifier.trim();
    if (!cleanIdentifier) {
      setErrorMessage("Please enter your registered email address or phone number.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: cleanIdentifier }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error?.message || "Failed to process request. Please try again.");
        return;
      }

      setIsSuccess(true);
      if (data.data?.devResetLink) {
        setDevResetLink(data.data.devResetLink);
      }
    } catch {
      setErrorMessage("A network error occurred. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!devResetLink) return;
    navigator.clipboard.writeText(devResetLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-md mx-auto py-8 animate-fade-in-up">
      {/* Brand Header */}
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
          {isSuccess ? "Check your inbox" : "Reset your password"}
        </h1>
        <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
          {isSuccess
            ? "We've sent password recovery instructions"
            : "Enter your registered email or phone to receive a reset link"}
        </p>
      </div>

      {/* Main Card */}
      <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6 shadow-[var(--shadow-md)]">
        {isSuccess ? (
          <div className="space-y-5 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--success-light))] text-[hsl(var(--success))]">
              <CheckCircle2 className="h-6 w-6" />
            </div>

            <div className="space-y-2">
              <p className="text-sm text-[hsl(var(--foreground))]">
                If an account exists for{" "}
                <span className="font-semibold text-[hsl(var(--foreground))]">{identifier}</span>,
                we have generated and sent password reset instructions.
              </p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                The link is valid for 30 minutes. Please check your email inbox and spam folder.
              </p>
            </div>

            {/* Dev Mode Reset Link Assistant */}
            {devResetLink && (
              <div className="rounded-[var(--radius-lg)] border border-[hsl(var(--primary)/0.3)] bg-[hsl(var(--primary-light))] p-3.5 text-left text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-[hsl(var(--primary))] mb-1.5">
                  <KeyRound className="h-3.5 w-3.5" />
                  <span>Dev Mode Reset Link</span>
                </div>
                <p className="text-[11px] text-[hsl(var(--muted-foreground))] mb-2.5 break-all font-mono">
                  {devResetLink}
                </p>
                <div className="flex items-center gap-2">
                  <Link
                    href={devResetLink}
                    className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] bg-[hsl(var(--primary))] px-2.5 py-1 text-xs font-semibold text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary-hover))] transition-colors shadow-sm"
                  >
                    Open Reset Page
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2.5 py-1 text-xs font-medium text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))] transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3 w-3 text-[hsl(var(--success))]" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        Copy Link
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2 pt-2">
              <Link
                href="/auth/login"
                className={buttonVariants({ size: "lg", className: "w-full" })}
              >
                Return to Sign In
              </Link>
              <button
                type="button"
                onClick={() => {
                  setIsSuccess(false);
                  setDevResetLink(null);
                }}
                className="w-full text-xs font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors py-1"
              >
                Didn&apos;t receive it? Try another address
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div
                className="flex items-start gap-2 rounded-[var(--radius)] bg-[hsl(var(--danger-light))] p-3 text-xs font-medium text-[hsl(var(--danger))]"
                role="alert"
              >
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                <p>{errorMessage}</p>
              </div>
            )}

            <div>
              <Input
                label="Email address or Phone"
                id="identifier"
                type="text"
                placeholder="e.g. patient@mediflow.com or +919876543210"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                disabled={isLoading}
                autoFocus
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full mt-2"
              size="lg"
              isLoading={isLoading}
            >
              Send Reset Link
            </Button>
          </form>
        )}
      </div>

      {/* Footer Navigation */}
      <p className="mt-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
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
