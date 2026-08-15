"use client";

import * as React from "react";
import { Users, Clock, Stethoscope, RefreshCw, CheckCircle2 } from "lucide-react";
import type { QueueSnapshotDTO } from "@/lib/services/QueueService";

interface QueueLiveCardProps {
  snapshot: QueueSnapshotDTO;
  userTokenNumber?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  isConnected?: boolean;
  isReconnecting?: boolean;
}

export function QueueLiveCard({
  snapshot,
  userTokenNumber,
  onRefresh,
  isRefreshing,
  isConnected = true,
  isReconnecting = false,
}: QueueLiveCardProps) {
  // Find where user is in queue
  const userQueueItem = userTokenNumber
    ? snapshot.queue.find((q) => q.tokenNumber === userTokenNumber)
    : null;

  // Calculate patients ahead of this user
  let patientsAhead = snapshot.waitingCount;
  if (userQueueItem && userQueueItem.status === "WAITING") {
    const waitingList = snapshot.queue.filter((q) => q.status === "WAITING");
    const userIndex = waitingList.findIndex((q) => q.tokenNumber === userTokenNumber);
    patientsAhead = userIndex >= 0 ? userIndex : snapshot.waitingCount;
  }

  const extraOffset =
    snapshot.doctorStatus?.status === "ON_BREAK" || snapshot.doctorStatus?.status === "DELAYED"
      ? snapshot.doctorStatus.delayMinutes || 0
      : 0;

  const estimatedWaitMin = Math.max(0, patientsAhead * (snapshot.avgDurationMinutes || 20) + extraOffset);

  return (
    <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6 sm:p-8 shadow-[var(--shadow-sm)] space-y-6">
      {/* Reconnecting banner if offline */}
      {isReconnecting && (
        <div className="rounded-[var(--radius-md)] bg-[hsl(var(--warning-light))] border border-[hsl(var(--warning)/0.3)] p-3 text-xs text-[hsl(var(--warning))] flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[hsl(var(--warning))]" />
            Reconnecting to live queue stream... Displaying last known snapshot.
          </span>
          <span className="font-mono text-[10px]">Auto-Syncing</span>
        </div>
      )}

      {/* Doctor Status Banner (Break / Delay Alert) */}
      {snapshot.doctorStatus?.status === "ON_BREAK" && (
        <div className="rounded-[var(--radius-md)] bg-[hsl(var(--warning-light))] border border-[hsl(var(--warning)/0.3)] p-4 text-xs text-[hsl(var(--warning))] flex items-start gap-3">
          <Clock className="h-5 w-5 shrink-0 text-[hsl(var(--warning))] mt-0.5" />
          <div>
            <p className="font-medium text-sm">Physician is Currently on Break</p>
            <p className="mt-0.5 text-[hsl(var(--warning))/0.9]">
              {snapshot.doctorStatus.note || `Stepped out for ~${snapshot.doctorStatus.delayMinutes || 15} minutes. Queue will resume automatically.`}
            </p>
          </div>
        </div>
      )}

      {snapshot.doctorStatus?.status === "DELAYED" && (
        <div className="rounded-[var(--radius-md)] bg-[hsl(var(--muted))] border border-[hsl(var(--border))] p-4 text-xs text-[hsl(var(--foreground))] flex items-start gap-3">
          <Clock className="h-5 w-5 shrink-0 text-[hsl(var(--muted-foreground))] mt-0.5" />
          <div>
            <p className="font-medium text-sm">Running Behind Schedule (~{snapshot.doctorStatus.delayMinutes}m delay)</p>
            <p className="mt-0.5 text-[hsl(var(--muted-foreground))]">
              {snapshot.doctorStatus.note || "Due to complex prior consultations, wait times have been dynamically adjusted."}
            </p>
          </div>
        </div>
      )}

      {/* Top Header with live status & refresh */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-[hsl(var(--border))]">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-lg)] bg-[hsl(var(--muted))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))]">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-serif text-xl sm:text-2xl font-normal tracking-tight text-[hsl(var(--foreground))]">
              {snapshot.doctorName}
            </h2>
            <p className="text-xs font-medium text-[hsl(var(--muted-foreground))]">
              {snapshot.specialty} • {snapshot.branchName || "Main Clinic"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-[hsl(var(--success-light))] border border-[hsl(var(--success)/0.3)] px-3 py-1 rounded-[var(--radius-full)] text-xs font-medium text-[hsl(var(--success))]">
            <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--success))]" />
            <span>{isConnected ? "Live Stream" : "Polling"}</span>
          </div>

          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-[var(--radius-md)] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
              title="Refresh queue"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>
          )}
        </div>
      </div>

      {/* Main Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-2">
        {/* Currently Serving Token */}
        <div className="rounded-[var(--radius-lg)] bg-[hsl(var(--background))] border border-[hsl(var(--border))] p-5 text-center flex flex-col justify-center shadow-[var(--shadow-sm)]">
          <span className="text-xs font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
            Now in Cabin
          </span>
          <span className="text-3xl sm:text-4xl font-serif font-normal text-[hsl(var(--primary))] mt-2 font-mono">
            {snapshot.currentToken ? snapshot.currentToken.tokenNumber : "Idle"}
          </span>
          <span className="text-xs text-[hsl(var(--muted-foreground))] mt-1 truncate">
            {snapshot.currentToken ? snapshot.currentToken.patientName : "Waiting for next call"}
          </span>
        </div>

        {/* Patients Ahead */}
        <div className="rounded-[var(--radius-lg)] bg-[hsl(var(--background))] border border-[hsl(var(--border))] p-5 text-center shadow-[var(--shadow-sm)] flex flex-col justify-center">
          <div className="flex items-center justify-center gap-1 text-xs font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
            <Users className="h-3.5 w-3.5" />
            <span>Patients Ahead</span>
          </div>
          <span className="text-3xl sm:text-4xl font-serif font-normal text-[hsl(var(--foreground))] mt-2 font-mono">
            {patientsAhead}
          </span>
          <span className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
            in waiting queue
          </span>
        </div>

        {/* Dynamic Estimated Wait Time */}
        <div className="rounded-[var(--radius-lg)] bg-[hsl(var(--warning-light))] border border-[hsl(var(--warning)/0.3)] p-5 text-center flex flex-col justify-center">
          <div className="flex items-center justify-center gap-1 text-xs font-medium uppercase tracking-wider text-[hsl(var(--warning))]">
            <Clock className="h-3.5 w-3.5" />
            <span>Estimated Wait</span>
          </div>
          <span className="text-3xl sm:text-4xl font-serif font-normal text-[hsl(var(--warning))] mt-2 font-mono">
            {estimatedWaitMin > 0 ? `~${estimatedWaitMin}m` : "Next"}
          </span>
          <span className="text-xs text-[hsl(var(--warning))/0.9] mt-1">
            {extraOffset > 0 ? `includes +${extraOffset}m offset` : `~${snapshot.avgDurationMinutes}m / visit`}
          </span>
        </div>
      </div>

      {/* User Token Status Banner if present */}
      {userTokenNumber && (
        <div className="rounded-[var(--radius-md)] bg-[hsl(var(--background))] border border-[hsl(var(--card-border))] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-[hsl(var(--primary))] text-white font-medium text-xs flex items-center justify-center">
              You
            </div>
            <div>
              <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                Your Token: <span className="text-[hsl(var(--primary))] font-mono font-bold">{userTokenNumber}</span>
              </p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Status: {userQueueItem ? userQueueItem.status.replace("_", " ") : "CONFIRMED"}
                {userQueueItem?.isCheckedIn && " (Checked In)"}
              </p>
            </div>
          </div>

          {userQueueItem?.status === "IN_PROGRESS" && (
            <span className="rounded-[var(--radius-full)] bg-[hsl(var(--success))] text-white px-3.5 py-1.5 text-xs font-medium inline-flex items-center gap-1.5 shadow-[var(--shadow-sm)]">
              <CheckCircle2 className="h-4 w-4" /> It&apos;s your turn! Please proceed to the doctor cabin.
            </span>
          )}
        </div>
      )}

      {/* Live Queue Progress Timeline */}
      <h3 className="font-serif text-base font-normal tracking-tight text-[hsl(var(--foreground))] mb-3">
        Today&apos;s Queue Progress ({snapshot.completedCount} of {snapshot.totalToday} completed)
      </h3>

      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
        {snapshot.queue.map((item) => {
          const isCurrent = item.status === "IN_PROGRESS";
          const isUser = item.tokenNumber === userTokenNumber;
          const isDone = item.status === "DONE";

          let rowClass = "border-[hsl(var(--border))] bg-[hsl(var(--background))]";
          if (isCurrent) rowClass = "border-[hsl(var(--primary))] bg-[hsl(var(--primary-light))]";
          if (isUser && !isCurrent) rowClass = "border-[hsl(var(--border))] bg-[hsl(var(--card))]";

          return (
            <div
              key={item.tokenId}
              className={`flex items-center justify-between p-3 rounded-[var(--radius-md)] border text-xs transition-colors ${rowClass}`}
            >
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-sm w-12 text-[hsl(var(--foreground))]">
                  {item.tokenNumber}
                </span>
                <span className="font-medium text-[hsl(var(--foreground))]">
                  {item.patientName} {isUser && "(You)"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[hsl(var(--muted-foreground))] font-mono">
                  {item.scheduledTime}
                </span>
                {isDone ? (
                  <span className="flex items-center gap-1 text-[hsl(var(--muted-foreground))] font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[hsl(var(--success))]" /> Done
                  </span>
                ) : isCurrent ? (
                  <span className="bg-[hsl(var(--primary))] text-white px-2.5 py-0.5 rounded-[var(--radius-full)] text-[11px] font-medium">
                    Inside Cabin
                  </span>
                ) : (
                  <span className="text-[hsl(var(--warning))] font-medium">
                    Waiting
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
