"use client";

import * as React from "react";
import { Sun, Sunset, Moon, CheckCircle2, AlertCircle } from "lucide-react";
import type { TimeSlot } from "@/lib/services/SchedulingService";

interface SlotGridProps {
  slots: TimeSlot[];
  selectedSlot?: string;
  onSelectSlot: (slotTime: string) => void;
  isLoading?: boolean;
}

export function SlotGrid({
  slots,
  selectedSlot,
  onSelectSlot,
  isLoading,
}: SlotGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5 py-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="h-10 rounded-[var(--radius-md)] bg-[hsl(var(--muted))] animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-8 text-center my-4">
        <AlertCircle className="h-8 w-8 text-[hsl(var(--warning))] mx-auto mb-2" />
        <h4 className="font-serif text-base font-normal text-[hsl(var(--foreground))]">No Available Slots</h4>
        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
          The doctor is not available on this date. Please select another date.
        </p>
      </div>
    );
  }

  // Categorize slots by time of day
  const morningSlots = slots.filter((s) => Number(s.startTime.split(":")[0]) < 12);
  const afternoonSlots = slots.filter(
    (s) => Number(s.startTime.split(":")[0]) >= 12 && Number(s.startTime.split(":")[0]) < 16
  );
  const eveningSlots = slots.filter((s) => Number(s.startTime.split(":")[0]) >= 16);

  const renderSlotGroup = (title: string, groupSlots: TimeSlot[], icon: React.ReactNode) => {
    if (groupSlots.length === 0) return null;

    return (
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-1.5 text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider font-sans">
          {icon}
          <span>{title} ({groupSlots.filter((s) => s.status === "AVAILABLE").length} available)</span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5 font-mono text-xs">
          {groupSlots.map((slot) => {
            const isSelected = selectedSlot === slot.startTime;
            const isAvailable = slot.status === "AVAILABLE";

            let buttonClass = "border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] hover:border-[hsl(var(--primary))]";

            if (isSelected) {
              buttonClass = "bg-[hsl(var(--primary))] text-white border-[hsl(var(--primary))] font-medium shadow-[var(--shadow-sm)]";
            } else if (slot.status === "BOOKED") {
              buttonClass = "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))/0.5] border-transparent cursor-not-allowed line-through";
            } else if (slot.status === "BLOCKED") {
              buttonClass = "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))/0.4] border-transparent cursor-not-allowed";
            }

            return (
              <button
                key={slot.startTime}
                type="button"
                disabled={!isAvailable}
                onClick={() => onSelectSlot(slot.startTime)}
                className={`flex items-center justify-center gap-1 py-2 px-3 rounded-[var(--radius-md)] text-xs font-medium transition-all ${buttonClass}`}
              >
                {isSelected && <CheckCircle2 className="h-3.5 w-3.5" />}
                <span>{slot.startTime}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-[hsl(var(--muted-foreground))] py-2 border-b border-[hsl(var(--border))] font-sans">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))]" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-[hsl(var(--primary))]" />
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-[hsl(var(--muted))]" />
          <span>Booked / Unavailable</span>
        </div>
      </div>

      {renderSlotGroup("Morning", morningSlots, <Sun className="h-3.5 w-3.5 text-[hsl(var(--warning))]" />)}
      {renderSlotGroup("Afternoon", afternoonSlots, <Sunset className="h-3.5 w-3.5 text-[hsl(var(--primary))]" />)}
      {renderSlotGroup("Evening", eveningSlots, <Moon className="h-3.5 w-3.5 text-[hsl(var(--info))]" />)}
    </div>
  );
}
