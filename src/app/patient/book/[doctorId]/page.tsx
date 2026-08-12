"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Building2,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import type { DoctorDTO } from "@/lib/services/DoctorService";
import type { AppointmentDTO } from "@/lib/services/AppointmentService";

export default function BookAppointmentPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  const doctorId = params.doctorId as string;
  const date = searchParams.get("date") || "";
  const startTime = searchParams.get("startTime") || "";
  const branchId = searchParams.get("branchId") || "";

  const [doctor, setDoctor] = React.useState<DoctorDTO | null>(null);
  const [isLoadingDoc, setIsLoadingDoc] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [paymentChoice, setPaymentChoice] = React.useState<"online" | "clinic">("online");
  const [paymentMethod, setPaymentMethod] = React.useState<"upi" | "card">("upi");
  const [bookedAppointment, setBookedAppointment] = React.useState<AppointmentDTO | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Fetch doctor info
  React.useEffect(() => {
    async function fetchDoc() {
      setIsLoadingDoc(true);
      try {
        const res = await fetch(`/api/v1/doctors/${doctorId}`);
        const json = await res.json();
        if (res.ok && json.data) {
          setDoctor(json.data);
        }
      } catch {
        console.error("Failed to load doctor");
      } finally {
        setIsLoadingDoc(false);
      }
    }
    if (doctorId) fetchDoc();
  }, [doctorId]);

  const handleConfirmBooking = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const idempotencyKey = `book_${doctorId}_${date}_${startTime}_${Date.now()}`;
      const res = await fetch("/api/v1/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId,
          branchId: branchId || doctor?.branch.id || "branch_main_01",
          date,
          startTime,
          idempotencyKey,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setErrorMessage(json.error?.message || "Failed to book appointment. Slot might be taken.");
        return;
      }

      const appointment: AppointmentDTO = json.data;

      // If online payment chosen, process mock payment
      if (paymentChoice === "online") {
        await fetch("/api/v1/payments/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            appointmentId: appointment.id,
            amount: Number(doctor?.fee || 800),
            provider: "mock",
            method: paymentMethod,
          }),
        });
      } else {
        await fetch("/api/v1/payments/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            appointmentId: appointment.id,
            amount: Number(doctor?.fee || 800),
            provider: "clinic",
          }),
        });
      }

      setBookedAppointment(appointment);
    } catch {
      setErrorMessage("Network error while booking appointment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (bookedAppointment) {
    return (
      <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full rounded-[var(--radius-2xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6 sm:p-8 shadow-[var(--shadow-md)] text-center space-y-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[hsl(var(--success-light))] text-[hsl(var(--success))] mx-auto border border-[hsl(var(--success)/0.3)] animate-bounce">
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[hsl(var(--foreground))]">
              Appointment Confirmed!
            </h1>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
              Your appointment slot and queue token have been reserved.
            </p>
          </div>

          {/* Token Card */}
          <div className="rounded-[var(--radius-xl)] bg-[hsl(var(--primary-light))] border border-[hsl(var(--primary)/0.2)] p-5">
            <span className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--primary))]">
              Queue Token Number
            </span>
            <div className="text-4xl font-extrabold font-mono text-[hsl(var(--primary))] my-2">
              {bookedAppointment.tokenNumber}
            </div>
            <p className="text-[11px] text-[hsl(var(--primary-dark))]">
              Show this token at the reception desk on arrival
            </p>
          </div>

          {/* Summary Box */}
          <div className="rounded-[var(--radius-lg)] bg-[hsl(var(--muted)/0.3)] p-4 text-xs space-y-2 text-left">
            <div className="flex justify-between">
              <span className="text-[hsl(var(--muted-foreground))]">Doctor:</span>
              <strong className="text-[hsl(var(--foreground))]">{bookedAppointment.doctorName}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-[hsl(var(--muted-foreground))]">Date &amp; Time:</span>
              <strong className="text-[hsl(var(--foreground))]">{bookedAppointment.date} at {bookedAppointment.startTime}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-[hsl(var(--muted-foreground))]">Payment Status:</span>
              <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                paymentChoice === "online"
                  ? "bg-[hsl(var(--success-light))] text-[hsl(var(--success))]"
                  : "bg-[hsl(var(--warning-light))] text-[hsl(var(--warning))]"
              }`}>
                {paymentChoice === "online" ? "PAID ONLINE (MOCK)" : "PAY AT CLINIC"}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link href={`/patient/queue/${doctorId}`} className="w-full">
              <Button size="lg" className="w-full font-bold shadow-[var(--shadow-sm)]">
                Track Live Queue
              </Button>
            </Link>
            <Link href="/patient/appointments" className="w-full">
              <Button variant="outline" size="lg" className="w-full text-xs">
                My Appointments
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] pb-12">
      {/* ─── Header ───────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-[hsl(var(--border))] bg-[hsl(var(--background)/0.8)] backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Slot Picker
          </button>
          <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))]">
            Step 2 of 2: Confirm Booking
          </span>
        </div>
      </header>

      {/* ─── Main Content ─────────────────────────────────── */}
      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[hsl(var(--foreground))]">
            Confirm Your Appointment
          </h1>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
            Please review the details and choose your preferred payment method.
          </p>
        </div>

        {errorMessage && (
          <div className="rounded-[var(--radius-lg)] bg-[hsl(var(--danger-light))] border border-[hsl(var(--danger)/0.3)] p-4 flex items-center gap-3 text-xs text-[hsl(var(--danger))]">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Appointment Card Review */}
        <div className="rounded-[var(--radius-2xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6 shadow-[var(--shadow-sm)] space-y-6">
          <div className="flex items-start gap-4 pb-6 border-b border-[hsl(var(--border))]">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-[hsl(var(--primary-light))] text-[hsl(var(--primary))] font-bold text-base">
              {doctor?.name.replace("Dr. ", "").slice(0, 2).toUpperCase() || "DR"}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[hsl(var(--foreground))]">
                {doctor?.name || "Doctor"}
              </h2>
              <p className="text-xs font-medium text-[hsl(var(--primary))]">
                {doctor?.specialty} • {doctor?.department.name}
              </p>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                {doctor?.branch.name}
              </p>
            </div>
          </div>

          {/* Schedule Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="rounded-[var(--radius-lg)] bg-[hsl(var(--muted)/0.2)] p-3.5 flex items-center gap-3">
              <Calendar className="h-5 w-5 text-[hsl(var(--primary))]" />
              <div>
                <span className="text-[hsl(var(--muted-foreground))] block">Appointment Date</span>
                <strong className="text-sm text-[hsl(var(--foreground))]">{date}</strong>
              </div>
            </div>

            <div className="rounded-[var(--radius-lg)] bg-[hsl(var(--muted)/0.2)] p-3.5 flex items-center gap-3">
              <Clock className="h-5 w-5 text-[hsl(var(--primary))]" />
              <div>
                <span className="text-[hsl(var(--muted-foreground))] block">Selected Time Slot</span>
                <strong className="text-sm text-[hsl(var(--primary))] font-mono">{startTime}</strong>
              </div>
            </div>
          </div>

          {/* Patient Details */}
          <div className="pt-4 border-t border-[hsl(var(--border))] space-y-2 text-xs">
            <h3 className="font-semibold text-sm text-[hsl(var(--foreground))] mb-2">
              Patient Information
            </h3>
            <div className="grid grid-cols-2 gap-2 text-[hsl(var(--muted-foreground))]">
              <div>
                <span>Patient Name:</span>
                <p className="font-medium text-[hsl(var(--foreground))] mt-0.5">{user?.name || "Patient"}</p>
              </div>
              <div>
                <span>Contact Email/Phone:</span>
                <p className="font-medium text-[hsl(var(--foreground))] mt-0.5">{user?.email || user?.phone || "N/A"}</p>
              </div>
            </div>
          </div>

          {/* Payment Mode Selection */}
          <div className="pt-4 border-t border-[hsl(var(--border))] space-y-3">
            <h3 className="font-semibold text-sm text-[hsl(var(--foreground))]">
              Select Payment Option
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: Pay Online */}
              <div
                onClick={() => setPaymentChoice("online")}
                className={`cursor-pointer rounded-[var(--radius-xl)] border-2 p-4 transition-all ${
                  paymentChoice === "online"
                    ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary-light))]"
                    : "border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-[hsl(var(--border-hover))]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-4 w-4 rounded-full border-2 border-[hsl(var(--primary))] flex items-center justify-center">
                      {paymentChoice === "online" && <div className="h-2 w-2 rounded-full bg-[hsl(var(--primary))]" />}
                    </div>
                    <div>
                      <p className="font-bold text-xs text-[hsl(var(--foreground))] flex items-center gap-1.5">
                        <CreditCard className="h-3.5 w-3.5 text-[hsl(var(--primary))]" />
                        Pay Online (Instant)
                      </p>
                      <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">UPI, Cards, Netbanking</p>
                    </div>
                  </div>
                  <span className="font-extrabold text-sm text-[hsl(var(--primary))]">
                    ₹{doctor?.fee || 800}
                  </span>
                </div>
              </div>

              {/* Option 2: Pay at Clinic */}
              <div
                onClick={() => setPaymentChoice("clinic")}
                className={`cursor-pointer rounded-[var(--radius-xl)] border-2 p-4 transition-all ${
                  paymentChoice === "clinic"
                    ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary-light))]"
                    : "border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-[hsl(var(--border-hover))]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-4 w-4 rounded-full border-2 border-[hsl(var(--primary))] flex items-center justify-center">
                      {paymentChoice === "clinic" && <div className="h-2 w-2 rounded-full bg-[hsl(var(--primary))]" />}
                    </div>
                    <div>
                      <p className="font-bold text-xs text-[hsl(var(--foreground))] flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-[hsl(var(--primary))]" />
                        Pay at Clinic Desk
                      </p>
                      <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">Pay on check-in</p>
                    </div>
                  </div>
                  <span className="font-extrabold text-sm text-[hsl(var(--muted-foreground))]">
                    ₹{doctor?.fee || 800}
                  </span>
                </div>
              </div>
            </div>

            {/* If Online Payment, show payment sub-method */}
            {paymentChoice === "online" && (
              <div className="p-3 rounded-[var(--radius-lg)] bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))] flex items-center justify-between text-xs">
                <span className="font-medium text-[hsl(var(--muted-foreground))] flex items-center gap-1">
                  <Lock className="h-3.5 w-3.5 text-[hsl(var(--success))]" />
                  Mock Gateway Sandbox (Instant Confirmation)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("upi")}
                    className={`px-2 py-1 rounded text-[11px] font-bold ${
                      paymentMethod === "upi" ? "bg-[hsl(var(--primary))] text-white" : "bg-[hsl(var(--card))] text-[hsl(var(--foreground))]"
                    }`}
                  >
                    UPI / QR
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("card")}
                    className={`px-2 py-1 rounded text-[11px] font-bold ${
                      paymentMethod === "card" ? "bg-[hsl(var(--primary))] text-white" : "bg-[hsl(var(--card))] text-[hsl(var(--foreground))]"
                    }`}
                  >
                    Card
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Policy notes */}
          <div className="rounded-[var(--radius-md)] bg-[hsl(var(--info-light))] p-3 flex items-start gap-2 text-[11px] text-[hsl(var(--info))]">
            <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              Free rescheduling &amp; full refund is available up to 2 hours before the slot time. Live queue updates are sent automatically.
            </span>
          </div>

          {/* Action button */}
          <Button
            size="lg"
            onClick={handleConfirmBooking}
            disabled={isSubmitting || isLoadingDoc}
            className="w-full flex items-center justify-center gap-2 font-semibold shadow-[var(--shadow-sm)]"
          >
            {isSubmitting
              ? "Securing Booking & Slot..."
              : paymentChoice === "online"
              ? `Pay ₹${doctor?.fee || 800} & Confirm Booking`
              : `Confirm Booking (Pay at Clinic: ₹${doctor?.fee || 800})`}
          </Button>
        </div>
      </main>
    </div>
  );
}
