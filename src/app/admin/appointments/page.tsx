"use client";

import * as React from "react";
import { Calendar, Search, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import type { AdminAppointmentDTO, AdminDoctorDTO } from "@/lib/services/AdminService";

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: "bg-[hsl(var(--info-light))] border border-[hsl(var(--info)/0.3)] text-[hsl(var(--info))]",
  CHECKED_IN: "bg-[hsl(var(--primary-light))] border border-[hsl(var(--primary)/0.3)] text-[hsl(var(--primary))]",
  WAITING: "bg-[hsl(var(--warning-light))] border border-[hsl(var(--warning)/0.3)] text-[hsl(var(--warning))]",
  IN_CONSULTATION: "bg-[hsl(var(--primary))] text-white",
  COMPLETED: "bg-[hsl(var(--success-light))] border border-[hsl(var(--success)/0.3)] text-[hsl(var(--success))]",
  CANCELLED: "bg-[hsl(var(--danger-light))] border border-[hsl(var(--danger)/0.3)] text-[hsl(var(--danger))]",
  NO_SHOW: "bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]",
};

export default function AdminAppointmentsPage() {
  const { addToast } = useToast();

  const [appointments, setAppointments] = React.useState<AdminAppointmentDTO[]>([]);
  const [doctors, setDoctors] = React.useState<AdminDoctorDTO[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [reloadKey, setReloadKey] = React.useState(0);

  // Filter state
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedStatus, setSelectedStatus] = React.useState("");
  const [selectedDate, setSelectedDate] = React.useState(new Date().toISOString().slice(0, 10));

  // Override modal state
  const [selectedAppointment, setSelectedAppointment] = React.useState<AdminAppointmentDTO | null>(null);
  const [overrideStatus, setOverrideStatus] = React.useState("");
  const [overrideDoctorId, setOverrideDoctorId] = React.useState("");
  const [overrideReason, setOverrideReason] = React.useState("");
  const [isSubmittingOverride, setIsSubmittingOverride] = React.useState(false);

  // Refund modal state
  const [refundAppointment, setRefundAppointment] = React.useState<AdminAppointmentDTO | null>(null);
  const [refundReason, setRefundReason] = React.useState("Patient cancellation refund requested");
  const [isSubmittingRefund, setIsSubmittingRefund] = React.useState(false);

  React.useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        const queryParams = new URLSearchParams();
        if (selectedDate) queryParams.set("date", selectedDate);
        if (selectedStatus) queryParams.set("status", selectedStatus);
        if (searchQuery) queryParams.set("search", searchQuery);

        const [aptRes, docsRes] = await Promise.all([
          fetch(`/api/v1/admin/appointments?${queryParams.toString()}`),
          fetch("/api/v1/admin/doctors"),
        ]);

        const aptJson = await aptRes.json();
        const docsJson = await docsRes.json();

        if (isMounted) {
          if (aptRes.ok && aptJson.data) setAppointments(aptJson.data);
          if (docsRes.ok && docsJson.data) setDoctors(docsJson.data);
        }
      } catch {
        console.error("Failed to load appointments ledger");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [selectedDate, selectedStatus, searchQuery, reloadKey]);

  const handleOpenOverride = (apt: AdminAppointmentDTO) => {
    setSelectedAppointment(apt);
    setOverrideStatus(apt.status);
    setOverrideDoctorId(apt.doctorId);
    setOverrideReason("Administrative operational adjustment");
  };

  const handleSaveOverride = async () => {
    if (!selectedAppointment || !overrideReason) return;
    setIsSubmittingOverride(true);

    try {
      const res = await fetch(`/api/v1/admin/appointments/${selectedAppointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: overrideStatus || undefined,
          doctorId: overrideDoctorId !== selectedAppointment.doctorId ? overrideDoctorId : undefined,
          overrideReason,
        }),
      });

      const json = await res.json();

      if (res.ok) {
        addToast({
          type: "success",
          title: "Appointment Overridden",
          description: "Changes applied and recorded to the audit log.",
        });
        setSelectedAppointment(null);
        setReloadKey((k) => k + 1);
      } else {
        addToast({
          type: "error",
          title: "Override Failed",
          description: json.error?.message || "Could not override appointment.",
        });
      }
    } finally {
      setIsSubmittingOverride(false);
    }
  };

  const handleProcessRefund = async () => {
    if (!refundAppointment || !refundReason) return;
    setIsSubmittingRefund(true);

    try {
      const res = await fetch("/api/v1/payments/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId: refundAppointment.id,
          reason: refundReason,
        }),
      });

      const json = await res.json();

      if (res.ok) {
        addToast({
          type: "success",
          title: "Refund Processed",
          description: `₹${refundAppointment.feeSnapshot} successfully refunded for Token ${refundAppointment.tokenNumber}.`,
        });
        setRefundAppointment(null);
        setReloadKey((k) => k + 1);
      } else {
        addToast({
          type: "error",
          title: "Refund Failed",
          description: json.error?.message || "Could not process refund.",
        });
      }
    } catch {
      addToast({
        type: "error",
        title: "Refund Error",
        description: "Network error while processing refund.",
      });
    } finally {
      setIsSubmittingRefund(false);
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 pb-16">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-normal text-[hsl(var(--foreground))] tracking-tight flex items-center gap-2.5">
            <Calendar className="h-7 w-7 text-[hsl(var(--primary))]" />
            Master Appointments &amp; Overrides
          </h1>
          <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] mt-1 font-sans">
            Hospital-wide appointment directory with live status management, refund processing, and physician reassignment controls
          </p>
        </div>

        {/* Filter Bar */}
        <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-4 shadow-[var(--shadow-sm)] flex flex-wrap items-center gap-3 font-sans">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by patient, token (A-01), or doctor..."
              className="w-full rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] pl-9 pr-3 py-2 text-xs text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-[hsl(var(--input-focus)/0.4)] focus-visible:border-[hsl(var(--input-focus))] transition-colors"
            />
          </div>

          <div className="w-40">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] p-2 text-xs text-[hsl(var(--foreground))] focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-[hsl(var(--input-focus)/0.4)] focus-visible:border-[hsl(var(--input-focus))] font-mono transition-colors"
            />
          </div>

          <div className="w-44">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] p-2 text-xs text-[hsl(var(--foreground))] focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-[hsl(var(--input-focus)/0.4)] focus-visible:border-[hsl(var(--input-focus))] transition-colors"
            >
              <option value="">All Statuses</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="CHECKED_IN">Checked In</option>
              <option value="WAITING">Waiting in Queue</option>
              <option value="IN_CONSULTATION">In Consultation</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="NO_SHOW">No Show</option>
            </select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setReloadKey((k) => k + 1)}
            className="text-xs flex items-center gap-1 font-medium"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Sync
          </Button>
        </div>

        {/* Appointments Table */}
        <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] shadow-[var(--shadow-sm)] overflow-hidden font-sans">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--background))] font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider text-[11px]">
                  <th className="p-4">Token &amp; Time</th>
                  <th className="p-4">Patient</th>
                  <th className="p-4">Doctor &amp; Specialty</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Fee &amp; Payment</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))]">
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={6} className="p-4">
                        <div className="h-10 bg-[hsl(var(--muted))] rounded" />
                      </td>
                    </tr>
                  ))
                ) : appointments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-xs text-[hsl(var(--muted-foreground))]">
                      No appointments found matching filter criteria.
                    </td>
                  </tr>
                ) : (
                  appointments.map((apt) => (
                    <tr key={apt.id} className="hover:bg-[hsl(var(--background))] transition-colors">
                      <td className="p-4 font-mono">
                        <span className="font-serif text-sm font-normal text-[hsl(var(--primary))] block">{apt.tokenNumber}</span>
                        <span className="text-[11px] text-[hsl(var(--muted-foreground))]">{apt.startTime}</span>
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-sm text-[hsl(var(--foreground))]">{apt.patientName}</div>
                        <div className="text-[11px] text-[hsl(var(--muted-foreground))] font-mono mt-0.5">{apt.patientPhone || "—"}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-[hsl(var(--foreground))]">{apt.doctorName}</div>
                        <div className="text-[11px] text-[hsl(var(--primary))] mt-0.5">{apt.specialty}</div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-[var(--radius-full)] text-[11px] font-mono uppercase ${STATUS_COLORS[apt.status] || "bg-[hsl(var(--background))]"}`}>
                          {apt.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="font-mono text-sm text-[hsl(var(--foreground))]">
                          ₹{apt.feeSnapshot}
                        </div>
                        <div className="mt-1">
                          {apt.refundedAt ? (
                            <span className="inline-block px-2 py-0.5 rounded-[var(--radius-full)] text-[10px] font-mono uppercase bg-[hsl(var(--danger-light))] border border-[hsl(var(--danger)/0.3)] text-[hsl(var(--danger))]">
                              REFUNDED
                            </span>
                          ) : apt.paymentStatus === "PAID" ? (
                            <span className="inline-block px-2 py-0.5 rounded-[var(--radius-full)] text-[10px] font-mono uppercase bg-[hsl(var(--success-light))] border border-[hsl(var(--success)/0.3)] text-[hsl(var(--success))]">
                              PAID
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded-[var(--radius-full)] text-[10px] font-mono uppercase bg-[hsl(var(--warning-light))] border border-[hsl(var(--warning)/0.3)] text-[hsl(var(--warning))]">
                              {apt.paymentStatus || "PENDING"}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        {apt.paymentStatus === "PAID" && !apt.refundedAt && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setRefundAppointment(apt);
                              setRefundReason(`Refund for appointment ${apt.tokenNumber} (${apt.status})`);
                            }}
                            className="text-xs font-medium"
                          >
                            Refund
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenOverride(apt)}
                          className="text-xs font-medium"
                        >
                          Override
                        </Button>
                      </td>
                    </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Override Modal */}
      <Modal
        open={Boolean(selectedAppointment)}
        onClose={() => setSelectedAppointment(null)}
        title="Admin Appointment Override"
        description={`Modify status or reassign physician for Token ${selectedAppointment?.tokenNumber} (${selectedAppointment?.patientName}).`}
      >
        <div className="space-y-4 pt-2 text-xs font-sans">
          <div>
            <label className="font-medium text-[hsl(var(--foreground))] block mb-1">Appointment Status</label>
            <select
              value={overrideStatus}
              onChange={(e) => setOverrideStatus(e.target.value)}
              className="w-full rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] p-2.5 text-xs text-[hsl(var(--foreground))] focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-[hsl(var(--input-focus)/0.4)] focus-visible:border-[hsl(var(--input-focus))] transition-colors"
            >
              <option value="CONFIRMED">CONFIRMED (Booked)</option>
              <option value="CHECKED_IN">CHECKED_IN (Patient arrived at clinic)</option>
              <option value="WAITING">WAITING (In active waiting queue)</option>
              <option value="IN_CONSULTATION">IN_CONSULTATION (In doctor cabin)</option>
              <option value="COMPLETED">COMPLETED (Consultation finished)</option>
              <option value="CANCELLED">CANCELLED (Administrative cancellation)</option>
              <option value="NO_SHOW">NO_SHOW (Patient did not arrive)</option>
            </select>
          </div>

          <div>
            <label className="font-medium text-[hsl(var(--foreground))] block mb-1">Reassign to Doctor</label>
            <select
              value={overrideDoctorId}
              onChange={(e) => setOverrideDoctorId(e.target.value)}
              className="w-full rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] p-2.5 text-xs text-[hsl(var(--foreground))] focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-[hsl(var(--input-focus)/0.4)] focus-visible:border-[hsl(var(--input-focus))] transition-colors"
            >
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} — {d.specialty} ({d.departmentName})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-medium text-[hsl(var(--foreground))] block mb-1">
              Reason for Administrative Override <span className="text-[hsl(var(--danger))]">*</span>
            </label>
            <textarea
              rows={2}
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="e.g., Doctor emergency leave, manual front-desk arrival check-in"
              className="w-full rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] p-2.5 text-xs text-[hsl(var(--foreground))] focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-[hsl(var(--input-focus)/0.4)] focus-visible:border-[hsl(var(--input-focus))] transition-colors"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[hsl(var(--border))]">
            <Button variant="outline" size="sm" onClick={() => setSelectedAppointment(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveOverride}
              disabled={isSubmittingOverride || !overrideReason}
              className="font-medium"
            >
              {isSubmittingOverride ? "Applying..." : "Save Override"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Refund Confirmation Modal */}
      <Modal
        open={Boolean(refundAppointment)}
        onClose={() => setRefundAppointment(null)}
        title="Process Patient Refund"
        description={`Issue a full refund of ₹${refundAppointment?.feeSnapshot} for Token ${refundAppointment?.tokenNumber} (${refundAppointment?.patientName}).`}
      >
        <div className="space-y-4 pt-2 text-xs font-sans">
          <div className="rounded-[var(--radius-md)] bg-[hsl(var(--warning-light))] border border-[hsl(var(--warning)/0.3)] p-3 text-[hsl(var(--warning))] font-medium">
            This action will mark the payment as REFUNDED and release the associated transaction.
          </div>

          <div>
            <label className="font-medium text-[hsl(var(--foreground))] block mb-1">
              Refund Reason <span className="text-[hsl(var(--danger))]">*</span>
            </label>
            <textarea
              rows={2}
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder="Reason for refund..."
              className="w-full rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] p-2.5 text-xs text-[hsl(var(--foreground))] focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-[hsl(var(--input-focus)/0.4)] focus-visible:border-[hsl(var(--input-focus))] transition-colors"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[hsl(var(--border))]">
            <Button variant="outline" size="sm" onClick={() => setRefundAppointment(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleProcessRefund}
              disabled={isSubmittingRefund || !refundReason.trim()}
              className="font-medium"
            >
              {isSubmittingRefund ? "Processing Refund..." : "Confirm & Process Refund"}
            </Button>
          </div>
        </div>
      </Modal>
    </main>
  );
}
