"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Activity, ShieldCheck, RefreshCw, ShieldAlert } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

export default function VerifyOtpPage() {
  return (
    <React.Suspense fallback={<div className="text-center p-8">Loading verification...</div>}>
      <VerifyOtpContent />
    </React.Suspense>
  );
}

function VerifyOtpContent() {
  const searchParams = useSearchParams();
  const { verifyOtp, resendOtp } = useAuth();

  const userId = searchParams.get("userId") || "";
  const email = searchParams.get("email") || "your registered email/phone";

  const [digits, setDigits] = React.useState<string[]>(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isResending, setIsResending] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [timeLeft, setTimeLeft] = React.useState(300); // 5 minutes countdown

  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer
  React.useEffect(() => {
    if (timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const handleDigitChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const pastedDigits = value.replace(/\D/g, "").slice(0, 6).split("");
      const newDigits = [...digits];
      pastedDigits.forEach((d, i) => {
        if (i < 6) newDigits[i] = d;
      });
      setDigits(newDigits);
      const nextIndex = Math.min(pastedDigits.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    const cleanVal = value.replace(/\D/g, "");
    const newDigits = [...digits];
    newDigits[index] = cleanVal;
    setDigits(newDigits);

    // Auto-focus next input
    if (cleanVal && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = digits.join("");
    if (code.length !== 6) {
      setErrorMessage("Please enter all 6 digits of the OTP code.");
      return;
    }

    if (!userId) {
      setErrorMessage("Missing verification session. Please register again.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await verifyOtp(userId, code);
      if (!res.success) {
        setErrorMessage(res.error || "Invalid OTP code. Please check and try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!userId || isResending) return;
    setIsResending(true);
    setErrorMessage(null);

    try {
      const res = await resendOtp(userId);
      if (res.success) {
        setTimeLeft(300);
        setDigits(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      } else {
        setErrorMessage(res.error || "Failed to resend OTP.");
      }
    } finally {
      setIsResending(false);
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
          Verify Your Account
        </h1>
        <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
          We sent a 6-digit OTP to{" "}
          <span className="font-semibold text-[hsl(var(--foreground))]">{email}</span>
        </p>
      </div>

      <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6 shadow-[var(--shadow-md)]">
        {errorMessage && (
          <div
            className="mb-4 flex items-start gap-2 rounded-[var(--radius)] bg-[hsl(var(--danger-light))] p-3 text-xs font-medium text-[hsl(var(--danger))]"
            role="alert"
          >
            <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
            <p>{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-6">
          {/* 6 Digit Input Boxes */}
          <div className="flex justify-between gap-2 sm:gap-3">
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                disabled={isLoading}
                className="h-12 w-12 text-center text-xl font-bold tabular-nums rounded-[var(--radius)] border border-[hsl(var(--input))] bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--input-focus))] transition-all"
                aria-label={`Digit ${index + 1}`}
              />
            ))}
          </div>

          {/* Countdown & Resend */}
          <div className="flex items-center justify-between text-xs text-[hsl(var(--muted-foreground))]">
            <span>
              Code expires in:{" "}
              <strong className="text-[hsl(var(--foreground))] tabular-nums">
                {formatTimer(timeLeft)}
              </strong>
            </span>
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending || timeLeft > 240}
              className="flex items-center gap-1 font-medium text-[hsl(var(--primary))] hover:underline disabled:opacity-50 disabled:no-underline"
            >
              <RefreshCw className={`h-3 w-3 ${isResending ? "animate-spin" : ""}`} />
              Resend OTP
            </button>
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            isLoading={isLoading}
            disabled={digits.join("").length !== 6}
          >
            <ShieldCheck className="h-4 w-4" />
            Verify & Continue
          </Button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
        Entered wrong details?{" "}
        <Link
          href="/auth/register"
          className="font-semibold text-[hsl(var(--primary))] hover:underline"
        >
          Register again
        </Link>
      </p>
    </div>
  );
}
