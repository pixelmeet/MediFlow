"use client";

import * as React from "react";
import { KeyRound, Lock, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

interface ChangePasswordCardProps {
  className?: string;
  onSuccess?: () => void;
}

export function ChangePasswordCard({ className = "", onSuccess }: ChangePasswordCardProps) {
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");

  const [showCurrent, setShowCurrent] = React.useState(false);
  const [showNew, setShowNew] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const { addToast } = useToast();

  // Password rule checks for live feedback
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;

  const isPasswordValid = hasMinLength && hasUppercase && hasNumber && hasSpecial;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentPassword) {
      setError("Please enter your current password.");
      return;
    }

    if (!isPasswordValid) {
      setError("New password does not meet the security requirements.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation password do not match.");
      return;
    }

    if (currentPassword === newPassword) {
      setError("New password must be different from your current password.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/v1/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const json = await res.json();

      if (res.ok) {
        addToast({
          type: "success",
          title: "Password Changed",
          description: "Your account password has been successfully updated.",
        });

        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        if (onSuccess) onSuccess();
      } else {
        const errorMsg = json.error?.message || "Failed to update password.";
        setError(errorMsg);
        addToast({
          type: "error",
          title: "Password Change Failed",
          description: errorMsg,
        });
      }
    } catch {
      const networkMsg = "Network error. Please check your connection and try again.";
      setError(networkMsg);
      addToast({
        type: "error",
        title: "Network Error",
        description: networkMsg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`rounded-[var(--radius-2xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6 sm:p-8 shadow-[var(--shadow-sm)] ${className}`}
    >
      <div className="flex items-center gap-3 pb-4 border-b border-[hsl(var(--border))]">
        <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-lg)] bg-[hsl(var(--primary-light))] text-[hsl(var(--primary))] shadow-[var(--shadow-sm)]">
          <KeyRound className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-[hsl(var(--foreground))]">
            Security & Password
          </h2>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            Ensure your account is using a secure, strong password
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        {error && (
          <div className="rounded-[var(--radius-lg)] border border-[hsl(var(--danger-light))] bg-[hsl(var(--danger)/0.05)] p-3 text-xs text-[hsl(var(--danger))] flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Current Password */}
        <div>
          <label className="block text-xs font-bold text-[hsl(var(--foreground))] mb-1.5">
            Current Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[hsl(var(--muted-foreground))]">
              <Lock className="h-4 w-4" />
            </div>
            <input
              type={showCurrent ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter your current password"
              disabled={isSubmitting}
              className="w-full pl-9 pr-10 py-2.5 text-xs rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:ring-1 focus:ring-[hsl(var(--primary))] focus:outline-none transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              tabIndex={-1}
            >
              {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* New Password */}
        <div>
          <label className="block text-xs font-bold text-[hsl(var(--foreground))] mb-1.5">
            New Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[hsl(var(--muted-foreground))]">
              <Lock className="h-4 w-4" />
            </div>
            <input
              type={showNew ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password (min. 8 characters)"
              disabled={isSubmitting}
              className="w-full pl-9 pr-10 py-2.5 text-xs rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:ring-1 focus:ring-[hsl(var(--primary))] focus:outline-none transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              tabIndex={-1}
            >
              {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {/* Real-time complexity checklist */}
          {newPassword.length > 0 && (
            <div className="mt-2.5 p-3 rounded-[var(--radius-md)] bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))] grid grid-cols-2 gap-2 text-[11px]">
              <div
                className={`flex items-center gap-1.5 ${
                  hasMinLength ? "text-[hsl(var(--success))]" : "text-[hsl(var(--muted-foreground))]"
                }`}
              >
                <CheckCircle2
                  className={`h-3.5 w-3.5 ${hasMinLength ? "text-[hsl(var(--success))]" : "opacity-40"}`}
                />
                <span>8+ Characters</span>
              </div>
              <div
                className={`flex items-center gap-1.5 ${
                  hasUppercase ? "text-[hsl(var(--success))]" : "text-[hsl(var(--muted-foreground))]"
                }`}
              >
                <CheckCircle2
                  className={`h-3.5 w-3.5 ${hasUppercase ? "text-[hsl(var(--success))]" : "opacity-40"}`}
                />
                <span>Uppercase Letter</span>
              </div>
              <div
                className={`flex items-center gap-1.5 ${
                  hasNumber ? "text-[hsl(var(--success))]" : "text-[hsl(var(--muted-foreground))]"
                }`}
              >
                <CheckCircle2
                  className={`h-3.5 w-3.5 ${hasNumber ? "text-[hsl(var(--success))]" : "opacity-40"}`}
                />
                <span>At least 1 Number</span>
              </div>
              <div
                className={`flex items-center gap-1.5 ${
                  hasSpecial ? "text-[hsl(var(--success))]" : "text-[hsl(var(--muted-foreground))]"
                }`}
              >
                <CheckCircle2
                  className={`h-3.5 w-3.5 ${hasSpecial ? "text-[hsl(var(--success))]" : "opacity-40"}`}
                />
                <span>Special Character</span>
              </div>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block text-xs font-bold text-[hsl(var(--foreground))] mb-1.5">
            Confirm New Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[hsl(var(--muted-foreground))]">
              <Lock className="h-4 w-4" />
            </div>
            <input
              type={showConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              disabled={isSubmitting}
              className="w-full pl-9 pr-10 py-2.5 text-xs rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:ring-1 focus:ring-[hsl(var(--primary))] focus:outline-none transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              tabIndex={-1}
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {confirmPassword.length > 0 && !passwordsMatch && (
            <p className="text-[11px] text-[hsl(var(--danger))] mt-1">
              Passwords do not match.
            </p>
          )}
        </div>

        <div className="pt-2 flex justify-end">
          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting || !currentPassword || !isPasswordValid || !passwordsMatch}
            className="text-xs font-bold shadow-[var(--shadow-sm)]"
          >
            {isSubmitting ? "Updating Password..." : "Update Password"}
          </Button>
        </div>
      </form>
    </div>
  );
}
