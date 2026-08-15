"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { cva, type VariantProps } from "class-variance-authority";
import Image from "next/image";

// ─── StatusPill ──────────────────────────────────────────

const statusPillVariants = cva(
  "inline-flex items-center gap-1.5 rounded-[var(--radius-full)] px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      status: {
        confirmed: "bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))]",
        checked_in: "bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))]",
        waiting: "bg-[hsl(var(--warning-light))] text-[hsl(var(--warning))] border border-[hsl(var(--warning)/0.3)]",
        in_consultation: "bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))]",
        completed: "bg-[hsl(var(--success-light))] text-[hsl(var(--success))] border border-[hsl(var(--success)/0.3)]",
        cancelled: "bg-[hsl(var(--danger-light))] text-[hsl(var(--danger))] border border-[hsl(var(--danger)/0.3)]",
        no_show: "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] border border-[hsl(var(--border))]",
        // Payment statuses
        pending: "bg-[hsl(var(--warning-light))] text-[hsl(var(--warning))] border border-[hsl(var(--warning)/0.3)]",
        paid: "bg-[hsl(var(--success-light))] text-[hsl(var(--success))] border border-[hsl(var(--success)/0.3)]",
        failed: "bg-[hsl(var(--danger-light))] text-[hsl(var(--danger))] border border-[hsl(var(--danger)/0.3)]",
        refunded: "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] border border-[hsl(var(--border))]",
      },
    },
    defaultVariants: {
      status: "confirmed",
    },
  }
);

const statusLabels: Record<string, string> = {
  confirmed: "Confirmed",
  checked_in: "Checked In",
  waiting: "Waiting",
  in_consultation: "In Consultation",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
  pending: "Pending",
  paid: "Paid",
  failed: "Failed",
  refund_pending: "Refund Pending",
  refunded: "Refunded",
};

interface StatusPillProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusPillVariants> {
  showDot?: boolean;
  label?: string;
}

function StatusPill({ status, showDot = true, label, className, ...props }: StatusPillProps) {
  const statusKey = status || "confirmed";
  const displayLabel = label || statusLabels[statusKey] || statusKey;

  return (
    <span
      className={cn(statusPillVariants({ status }), className)}
      {...props}
    >
      {showDot && (
        <span
          className="h-1.5 w-1.5 rounded-full bg-current"
          aria-hidden="true"
        />
      )}
      {displayLabel}
    </span>
  );
}

// ─── Skeleton ────────────────────────────────────────────

type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius)] bg-[hsl(var(--muted))] animate-pulse",
        className
      )}
      {...props}
    />
  );
}

// ─── EmptyState ──────────────────────────────────────────

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center animate-fade-in",
        className
      )}
    >
      {icon && (
        <div className="mb-4 text-[hsl(var(--muted-foreground))]">{icon}</div>
      )}
      <h3 className="font-serif text-xl font-normal tracking-tight text-[hsl(var(--foreground))]">
        {title}
      </h3>
      {description && (
        <p className="mt-1.5 text-sm text-[hsl(var(--muted-foreground))] max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ─── StatCard ────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: { value: number; isPositive: boolean };
  className?: string;
}

function StatCard({ label, value, icon, trend, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6 shadow-[var(--shadow-sm)]",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
          {label}
        </p>
        {icon && (
          <div className="text-[hsl(var(--muted-foreground))]">{icon}</div>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <p className="text-3xl font-serif font-normal tabular-nums text-[hsl(var(--foreground))]">
          {value}
        </p>
        {trend && (
          <span
            className={cn(
              "text-xs font-medium",
              trend.isPositive
                ? "text-[hsl(var(--success))]"
                : "text-[hsl(var(--danger))]"
            )}
          >
            {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Avatar ──────────────────────────────────────────────

interface AvatarProps {
  src?: string | null;
  alt?: string;
  fallback: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

function Avatar({ src, alt, fallback, size = "md", className }: AvatarProps) {
  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
    xl: "h-16 w-16 text-lg",
  };

  const sizePixels = {
    sm: 32,
    md: 40,
    lg: 48,
    xl: 64,
  };

  if (src) {
    return (
      <Image
        src={src}
        alt={alt || fallback || "Avatar"}
        width={sizePixels[size]}
        height={sizePixels[size]}
        unoptimized={typeof src === "string" && (src.startsWith("data:") || src.startsWith("http"))}
        className={cn(
          "rounded-full object-cover border border-[hsl(var(--card-border))]",
          sizeClasses[size],
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-full bg-[hsl(var(--card))] border border-[hsl(var(--card-border))] text-[hsl(var(--foreground))] flex items-center justify-center font-medium",
        sizeClasses[size],
        className
      )}
      aria-label={alt || fallback}
    >
      {fallback}
    </div>
  );
}

// ─── Badge ───────────────────────────────────────────────

const badgeVariants = cva(
  "inline-flex items-center rounded-[var(--radius-full)] px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]",
        secondary:
          "border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]",
        outline:
          "border border-[hsl(var(--border))] text-[hsl(var(--foreground))]",
        success:
          "border border-[hsl(var(--success)/0.3)] bg-[hsl(var(--success-light))] text-[hsl(var(--success))]",
        warning:
          "border border-[hsl(var(--warning)/0.3)] bg-[hsl(var(--warning-light))] text-[hsl(var(--warning))]",
        danger:
          "border border-[hsl(var(--danger)/0.3)] bg-[hsl(var(--danger-light))] text-[hsl(var(--danger))]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

// ─── Spinner ─────────────────────────────────────────────

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

function Spinner({ size = "md", className }: SpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  return (
    <div
      className={cn(
        "animate-spin rounded-full border-2 border-[hsl(var(--border))] border-t-[hsl(var(--primary))]",
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export {
  StatusPill,
  statusPillVariants,
  Skeleton,
  EmptyState,
  StatCard,
  Avatar,
  Badge,
  badgeVariants,
  Spinner,
};
