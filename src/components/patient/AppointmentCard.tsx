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
    <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6 sm:p-7 shadow-[var(--shadow-sm)] transition-colors hover:border-[hsl(var(--primary)/0.4)]">
      {/* Top row: Doctor info and status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[hsl(var(--border))]">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-[hsl(var(--muted))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] font-serif font-normal text-base">
            {appointment.doctorName.replace("Dr. ", "").slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h3 className="font-serif text-lg font-normal text-[hsl(var(--foreground))]">
              {appointment.doctorName}
            </h3>
            <p className="text-xs font-medium text-[hsl(var(--muted-foreground))]">
              {appointment.doctorSpecialty}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-[hsl(var(--muted))] px-3 py-1 rounded-[var(--radius-full)] text-xs font-mono font-medium text-[hsl(var(--foreground))] border border-[hsl(var(--border))]">
            <Ticket className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
            <span>Token: {appointment.tokenNumber}</span>
          </div>
          <StatusPill status={appointment.status.toLowerCase() as "confirmed" | "checked_in" | "waiting" | "in_consultation" | "completed" | "cancelled" | "no_show"} />
        </div>
      </div>

      {/* Middle row: Date, Time, Branch, Fee */}
      <div className="py-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-[hsl(var(--muted-foreground))] font-sans">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
          <div>
            <span className="font-medium text-[hsl(var(--foreground))]">{appointment.date}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
          <div>
            <span className="font-medium text-[hsl(var(--foreground))]">{appointment.startTime}</span>
            <span className="ml-1 text-[hsl(var(--muted-foreground))]">(Slot time)</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-[hsl(var(--muted-foreground))] shrink-0" />
          <span className="truncate">{appointment.branchName}</span>
        </div>
      </div>

      {/* Status banners */}
      {appointment.status === "NO_SHOW" && (
        <div className="mb-4 rounded-[var(--radius-md)] bg-[hsl(var(--danger-light))] border border-[hsl(var(--danger)/0.3)] p-3 text-xs text-[hsl(var(--danger))] flex items-center justify-between gap-2">
          <span>Marked as No-Show. If you have arrived, please report to the front desk reception to be reinstated.</span>
        </div>
      )}

      {appointment.checkedInAt && (
        <div className="mb-4 rounded-[var(--radius-md)] bg-[hsl(var(--success-light))] border border-[hsl(var(--success)/0.3)] p-2.5 text-xs text-[hsl(var(--success))] flex items-center gap-2">
          <CheckCircle className="h-3.5 w-3.5" />
          <span>Checked in at {new Date(appointment.checkedInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} — You are in the active queue.</span>
        </div>
      )}

      {appointment.cancelReason && (
        <div className="mb-4 rounded-[var(--radius-md)] bg-[hsl(var(--danger-light))] border border-[hsl(var(--danger)/0.3)] p-3 text-xs text-[hsl(var(--danger))]">
          <span className="font-semibold">Cancellation reason:</span> {appointment.cancelReason}
        </div>
      )}

      {/* Actions footer */}
      {isUpcoming && (
        <div className="pt-4 border-t border-[hsl(var(--border))] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {canCheckIn && onCheckIn && (
              appointment.eligibility?.status === "TOO_EARLY" ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  className="text-xs text-[hsl(var(--muted-foreground))] border-[hsl(var(--border))]"
                >
                  <Clock className="h-3.5 w-3.5 mr-1" />
                  Opens in {appointment.eligibility.minutesUntilOpen}m
                </Button>
              ) : appointment.eligibility?.status === "GRACE_PERIOD" ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onCheckIn(appointment.id)}
                  disabled={isCheckingIn}
                  className="text-xs border-[hsl(var(--warning)/0.4)] text-[hsl(var(--warning))] bg-[hsl(var(--warning-light))]"
                >
                  <CheckCircle className="h-3.5 w-3.5 mr-1" />
                  {isCheckingIn ? "Checking In..." : "Check In (Grace Active)"}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onCheckIn(appointment.id)}
                  disabled={isCheckingIn}
                  className="text-xs border-[hsl(var(--success)/0.4)] text-[hsl(var(--success))] bg-[hsl(var(--success-light))]"
                >
                  <CheckCircle className="h-3.5 w-3.5 mr-1" />
                  {isCheckingIn ? "Checking In..." : "Check In Now"}
                </Button>
              )
            )}

            <Link href={`/patient/queue/${appointment.doctorId}`}>
              <Button size="sm" className="text-xs flex items-center gap-1 font-medium">
                <span className="relative flex h-2 w-2 mr-1">
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                </span>
                Live Queue Tracker
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {onReschedule && appointment.status === "CONFIRMED" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onReschedule(appointment)}
                className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              >
                Reschedule
              </Button>
            )}
            {onCancel && appointment.status === "CONFIRMED" && (
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
