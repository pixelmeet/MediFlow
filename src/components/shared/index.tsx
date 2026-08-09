"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { cva, type VariantProps } from "class-variance-authority";

// ─── StatusPill ──────────────────────────────────────────

const statusPillVariants = cva(
  "inline-flex items-center gap-1.5 rounded-[var(--radius-full)] px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      status: {
        confirmed: "bg-[hsl(var(--status-confirmed)/0.12)] text-[hsl(var(--status-confirmed))]",
        checked_in: "bg-[hsl(var(--status-checked-in)/0.12)] text-[hsl(var(--status-checked-in))]",
        waiting: "bg-[hsl(var(--status-waiting)/0.12)] text-[hsl(var(--status-waiting))]",
        in_consultation: "bg-[hsl(var(--status-in-consultation)/0.12)] text-[hsl(var(--status-in-consultation))]",
        completed: "bg-[hsl(var(--status-completed)/0.12)] text-[hsl(var(--status-completed))]",
        cancelled: "bg-[hsl(var(--status-cancelled)/0.12)] text-[hsl(var(--status-cancelled))]",
        no_show: "bg-[hsl(var(--status-no-show)/0.12)] text-[hsl(var(--status-no-show))]",
        // Payment statuses
        pending: "bg-[hsl(var(--status-waiting)/0.12)] text-[hsl(var(--status-waiting))]",
        paid: "bg-[hsl(var(--status-completed)/0.12)] text-[hsl(var(--status-completed))]",
        failed: "bg-[hsl(var(--status-cancelled)/0.12)] text-[hsl(var(--status-cancelled))]",
        refunded: "bg-[hsl(var(--status-no-show)/0.12)] text-[hsl(var(--status-no-show))]",
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
        "rounded-[var(--radius)] animate-shimmer",
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
      <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">
        {title}
      </h3>
      {description && (
        <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))] max-w-sm">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
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
        "rounded-[var(--radius-lg)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-5 shadow-[var(--shadow-sm)] transition-all hover:shadow-[var(--shadow)]",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-[hsl(var(--muted-foreground))]">
          {label}
        </p>
        {icon && (
          <div className="text-[hsl(var(--muted-foreground))]">{icon}</div>
        )}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="text-2xl font-bold tabular-nums text-[hsl(var(--foreground))]">
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

  if (src) {
    return (
      <img
        src={src}
        alt={alt || fallback}
        className={cn(
          "rounded-full object-cover",
          sizeClasses[size],
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-full bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] flex items-center justify-center font-semibold",
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
  "inline-flex items-center rounded-[var(--radius-full)] px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]",
        secondary:
          "bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]",
        outline:
          "border border-[hsl(var(--border))] text-[hsl(var(--foreground))]",
        success:
          "bg-[hsl(var(--success-light))] text-[hsl(var(--success))]",
        warning:
          "bg-[hsl(var(--warning-light))] text-[hsl(var(--warning))]",
        danger:
          "bg-[hsl(var(--danger-light))] text-[hsl(var(--danger))]",
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
        "animate-spin rounded-full border-2 border-[hsl(var(--muted))] border-t-[hsl(var(--primary))]",
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
