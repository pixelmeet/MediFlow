"use client";

import * as React from "react";
import Link from "next/link";
import { Calendar, Clock, MapPin, Ticket, CheckCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/shared";
import type { AppointmentDTO } from "@/lib/services/AppointmentService";

interface AppointmentCardProps {
  appointment: AppointmentDTO;
  onCancel?: (appointmentId: string) => void;
  onReschedule?: (appointment: AppointmentDTO) => void;
  onCheckIn?: (appointmentId: string) => Promise<void>;
  isCheckingIn?: boolean;
}

export function AppointmentCard({
  appointment,
  onCancel,
  onReschedule,
  onCheckIn,
  isCheckingIn,
}: AppointmentCardProps) {
  const isUpcoming = appointment.status === "CONFIRMED" || appointment.status === "CHECKED_IN" || appointment.status === "WAITING";
  const canCheckIn = appointment.status === "CONFIRMED";

  return (
    <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-5 sm:p-6 shadow-[var(--shadow-sm)] transition-all hover:border-[hsl(var(--primary)/0.4)] hover:shadow-[var(--shadow)]">
      {/* Top row: Doctor info and status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[hsl(var(--border))]">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-[hsl(var(--primary-light))] text-[hsl(var(--primary))] font-bold text-sm">
            {appointment.doctorName.replace("Dr. ", "").slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h3 className="font-bold text-base text-[hsl(var(--foreground))]">
              {appointment.doctorName}
            </h3>
            <p className="text-xs font-medium text-[hsl(var(--primary))]">
              {appointment.doctorSpecialty}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-[hsl(var(--primary-light))] px-3 py-1 rounded-[var(--radius-full)] text-xs font-bold text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.2)]">
            <Ticket className="h-3.5 w-3.5" />
            <span>Token: {appointment.tokenNumber}</span>
          </div>
          <StatusPill status={appointment.status.toLowerCase() as "confirmed" | "checked_in" | "waiting" | "in_consultation" | "completed" | "cancelled" | "no_show"} />
        </div>
      </div>

      {/* Middle row: Date, Time, Branch, Fee */}
      <div className="py-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-[hsl(var(--muted-foreground))]">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-[hsl(var(--primary))]" />
          <div>
            <span className="font-semibold text-[hsl(var(--foreground))]">{appointment.date}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-[hsl(var(--primary))]" />
          <div>
            <span className="font-semibold text-[hsl(var(--foreground))]">{appointment.startTime}</span>
            <span className="ml-1 text-[hsl(var(--muted-foreground))]">(Slot time)</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-[hsl(var(--primary))] shrink-0" />
          <span className="truncate">{appointment.branchName}</span>
        </div>
      </div>

      {appointment.cancelReason && (
        <div className="mb-4 rounded-[var(--radius-md)] bg-[hsl(var(--danger-light))] p-3 text-xs text-[hsl(var(--danger))]">
          <span className="font-semibold">Cancellation reason:</span> {appointment.cancelReason}
        </div>
      )}

      {/* Actions footer */}
      {isUpcoming && (
        <div className="pt-4 border-t border-[hsl(var(--border))] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {canCheckIn && onCheckIn && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCheckIn(appointment.id)}
                disabled={isCheckingIn}
                className="text-xs border-[hsl(var(--success))] text-[hsl(var(--success))] hover:bg-[hsl(var(--success-light))]"
              >
                <CheckCircle className="h-3.5 w-3.5 mr-1" />
                {isCheckingIn ? "Checking In..." : "Check In"}
              </Button>
            )}

            <Link href={`/patient/queue/${appointment.doctorId}`}>
              <Button size="sm" className="text-xs flex items-center gap-1">
                <span className="relative flex h-2 w-2 mr-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                </span>
                Live Queue Tracker
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {onReschedule && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onReschedule(appointment)}
                className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              >
                Reschedule
              </Button>
            )}
            {onCancel && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onCancel(appointment.id)}
                className="text-xs text-[hsl(var(--danger))] hover:bg-[hsl(var(--danger-light))]"
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
