"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, Ticket, AlertCircle } from "lucide-react";
import { QueueLiveCard } from "@/components/patient/QueueLiveCard";
import { Button } from "@/components/ui/button";
import { useQueueSocket } from "@/hooks/useQueueSocket";

export default function LiveQueuePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const doctorId = params.doctorId as string;
  const tokenParam = searchParams.get("token") ?? undefined;

  const {
    snapshot,
    isConnected,
    isReconnecting,
    error,
    refresh,
  } = useQueueSocket(doctorId);

  const isLoading = !snapshot && !error;

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] pb-12">
      {/* ─── Header ───────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-[hsl(var(--border))] bg-[hsl(var(--background))] shadow-[var(--shadow-sm)]">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <Link href="/patient/appointments">
            <Button variant="ghost" size="sm" className="flex items-center gap-1.5 text-xs font-medium">
              <ArrowLeft className="h-4 w-4" />
              My Appointments
            </Button>
          </Link>
          <div className="flex items-center gap-1.5 text-xs font-mono text-[hsl(var(--muted-foreground))] bg-[hsl(var(--card))] border border-[hsl(var(--border))] px-3 py-1 rounded-[var(--radius-full)]">
            <Ticket className="h-3.5 w-3.5 text-[hsl(var(--primary))]" />
            <span>Live Queue Tracker</span>
          </div>
        </div>
      </header>

      {/* ─── Main Content ─────────────────────────────────── */}
      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-normal text-[hsl(var(--foreground))] tracking-tight">
            Live Waiting Room
          </h1>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 font-sans">
            Real-time updates synchronized with the doctor&apos;s cabin. Your token advances automatically.
          </p>
        </div>

        {isLoading ? (
          <div className="h-96 rounded-[var(--radius-xl)] bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-8 animate-pulse" />
        ) : error || !snapshot ? (
          <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--danger-light))] bg-[hsl(var(--card))] p-8 text-center max-w-md mx-auto">
            <AlertCircle className="h-8 w-8 text-[hsl(var(--danger))] mx-auto mb-2" />
            <h3 className="font-serif text-sm font-normal text-[hsl(var(--foreground))]">{error || "Queue not found"}</h3>
            <Button size="sm" onClick={refresh} className="mt-4 text-xs font-medium">
              Retry Sync
            </Button>
          </div>
        ) : (
          <QueueLiveCard
            snapshot={snapshot}
            onRefresh={refresh}
            isConnected={isConnected}
            isReconnecting={isReconnecting}
            userTokenNumber={tokenParam}
          />
        )}
      </main>
    </div>
  );
}
