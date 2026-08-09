"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Ticket, AlertCircle } from "lucide-react";
import { QueueLiveCard } from "@/components/patient/QueueLiveCard";
import { Button } from "@/components/ui/button";
import type { QueueSnapshotDTO } from "@/lib/services/QueueService";

export default function LiveQueuePage() {
  const params = useParams();
  const doctorId = params.doctorId as string;

  const [snapshot, setSnapshot] = React.useState<QueueSnapshotDTO | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [reloadKey, setReloadKey] = React.useState(0);

  // Initial load + 3s live polling interval
  React.useEffect(() => {
    let isMounted = true;

    const pollQueue = async (isSilent: boolean) => {
      if (isSilent) setIsRefreshing(true);
      try {
        const res = await fetch(`/api/v1/queue/${doctorId}`);
        const json = await res.json();
        if (!isMounted) return;
        if (res.ok && json.data) {
          setSnapshot(json.data);
          setError(null);
        } else {
          if (!isSilent) setError(json.error?.message || "Failed to load live queue");
        }
      } catch {
        if (isMounted && !isSilent) setError("Network error loading queue");
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    };

    pollQueue(false);

    const interval = setInterval(() => {
      pollQueue(true);
    }, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [doctorId, reloadKey]);

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] pb-12">
      {/* ─── Header ───────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-[hsl(var(--border))] bg-[hsl(var(--background)/0.8)] backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <Link href="/patient/appointments">
            <Button variant="ghost" size="sm" className="flex items-center gap-1.5 text-xs">
              <ArrowLeft className="h-4 w-4" />
              My Appointments
            </Button>
          </Link>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[hsl(var(--primary))] bg-[hsl(var(--primary-light))] px-3 py-1 rounded-[var(--radius-full)]">
            <Ticket className="h-3.5 w-3.5" />
            <span>Live Queue Tracker</span>
          </div>
        </div>
      </header>

      {/* ─── Main Content ─────────────────────────────────── */}
      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[hsl(var(--foreground))]">
            Live Waiting Room
          </h1>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
            Real-time updates synchronized with the doctor&apos;s cabin. Your token advances automatically.
          </p>
        </div>

        {isLoading ? (
          <div className="h-96 rounded-[var(--radius-2xl)] bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-8 animate-pulse" />
        ) : error || !snapshot ? (
          <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--danger-light))] bg-[hsl(var(--card))] p-8 text-center max-w-md mx-auto">
            <AlertCircle className="h-8 w-8 text-[hsl(var(--danger))] mx-auto mb-2" />
            <h3 className="font-bold text-sm text-[hsl(var(--foreground))]">{error || "Queue not found"}</h3>
            <Button size="sm" onClick={() => setReloadKey((k) => k + 1)} className="mt-4 text-xs">
              Retry Sync
            </Button>
          </div>
        ) : (
          <QueueLiveCard
            snapshot={snapshot}
            onRefresh={() => setReloadKey((k) => k + 1)}
            isRefreshing={isRefreshing}
          />
        )}
      </main>
    </div>
  );
}
