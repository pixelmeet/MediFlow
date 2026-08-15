"use client";

import * as React from "react";
import {
  UserCheck,
  Search,
  RefreshCw,
  Clock,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Users,
  ShieldCheck,
} from "lucide-react";
import { AdminNavigation } from "@/components/admin/AdminNavigation";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import type { CheckInDeskItemDTO } from "@/lib/services/CheckInService";

export default function AdminCheckInDeskPage() {
  const { addToast } = useToast();

  const [items, setItems] = React.useState<CheckInDeskItemDTO[]>([]);
  const [branches, setBranches] = React.useState<{ id: string; name: string }[]>([]);
  const [selectedBranchId, setSelectedBranchId] = React.useState("");
  const [selectedDate, setSelectedDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("ALL");
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSweeping, setIsSweeping] = React.useState(false);
  const [reloadKey, setReloadKey] = React.useState(0);

  // Reinstate Modal State
  const [reinstateItem, setReinstateItem] = React.useState<CheckInDeskItemDTO | null>(null);
  const [reinstateReason, setReinstateReason] = React.useState("");
  const [isSubmittingReinstate, setIsSubmittingReinstate] = React.useState(false);

  // In-flight check-in IDs
  const [checkingInIds, setCheckingInIds] = React.useState<Record<string, boolean>>({});

  // Fetch branches
  React.useEffect(() => {
    fetch("/api/v1/admin/branches")
      .then((res) => res.json())
      .then((json) => {
        if (json.data) setBranches(json.data);
      })
      .catch(() => {});
  }, []);

  // Fetch check-in items
  React.useEffect(() => {
    let isMounted = true;
    const fetchCheckIns = async () => {
      try {
        const queryParams = new URLSearchParams();
        if (selectedDate) queryParams.set("date", selectedDate);
        if (selectedBranchId) queryParams.set("branchId", selectedBranchId);
        if (searchQuery) queryParams.set("search", searchQuery);

        const res = await fetch(`/api/v1/admin/checkins?${queryParams.toString()}`);
        const json = await res.json();
        if (isMounted && res.ok && json.data) {
          setItems(json.data);
        }
      } catch (err) {
        console.error("Failed to load check-in ledger:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchCheckIns();

    // Auto-poll every 5 seconds for front-desk live sync
    const interval = setInterval(fetchCheckIns, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedDate, selectedBranchId, searchQuery, reloadKey]);

  // Handle staff 1-click check-in
  const handleCheckIn = async (item: CheckInDeskItemDTO) => {
    setCheckingInIds((prev) => ({ ...prev, [item.id]: true }));
    try {
      const res = await fetch(`/api/v1/appointments/${item.id}/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceByStaff: true }),
      });
      const json = await res.json();

      if (res.ok) {
        addToast({
          type: "success",
          title: "Patient Checked In",
          description: `${item.patientName} (${item.tokenNumber}) is now active in queue.`,
        });
        setReloadKey((k) => k + 1);
      } else {
        addToast({
          type: "error",
          title: "Check-in Error",
          description: json.error?.message || "Could not check in patient.",
        });
      }
    } catch {
      addToast({
        type: "error",
        title: "Network Error",
        description: "Failed to connect to check-in service.",
      });
    } finally {
      setCheckingInIds((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  // Handle No-Show Sweep
  const handleRunSweep = async () => {
    setIsSweeping(true);
    try {
      const res = await fetch("/api/v1/appointments/sweep-noshows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId: selectedBranchId || undefined,
          date: selectedDate,
        }),
      });
      const json = await res.json();

      if (res.ok && json.data) {
        addToast({
          type: json.data.sweptCount > 0 ? "warning" : "info",
          title: "No-Show Sweep Complete",
          description: json.meta?.message || `Swept ${json.data.sweptCount} overdue appointments.`,
        });
        setReloadKey((k) => k + 1);
      } else {
        addToast({
          type: "error",
          title: "Sweep Failed",
          description: json.error?.message || "Could not run automated sweep.",
        });
      }
    } finally {
      setIsSweeping(false);
    }
  };

  // Handle Reinstate Patient
  const handleConfirmReinstate = async () => {
    if (!reinstateItem || !reinstateReason.trim()) return;
    setIsSubmittingReinstate(true);

    try {
      const res = await fetch(`/api/v1/appointments/${reinstateItem.id}/reinstate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reinstateReason }),
      });
      const json = await res.json();

      if (res.ok) {
        addToast({
          type: "success",
          title: "Patient Reinstated",
          description: `${reinstateItem.patientName} (${reinstateItem.tokenNumber}) restored to waiting queue.`,
        });
        setReinstateItem(null);
        setReinstateReason("");
        setReloadKey((k) => k + 1);
      } else {
        addToast({
          type: "error",
          title: "Reinstatement Failed",
          description: json.error?.message || "Could not reinstate patient.",
        });
      }
    } finally {
      setIsSubmittingReinstate(false);
    }
  };

  // KPI Calculations
  const totalCount = items.length;
  const checkedInCount = items.filter(
    (i) => i.status === "CHECKED_IN" || i.status === "WAITING" || i.status === "IN_CONSULTATION"
  ).length;
  const pendingCheckInCount = items.filter((i) => i.status === "CONFIRMED").length;
  const noShowCount = items.filter((i) => i.status === "NO_SHOW").length;
  const gracePeriodCount = items.filter(
    (i) => i.status === "CONFIRMED" && i.eligibility.status === "GRACE_PERIOD"
  ).length;

  // Filter items by status tab
  const filteredItems = items.filter((item) => {
    if (statusFilter === "ALL") return true;
    if (statusFilter === "PENDING") return item.status === "CONFIRMED";
    if (statusFilter === "CHECKED_IN")
      return item.status === "CHECKED_IN" || item.status === "WAITING" || item.status === "IN_CONSULTATION";
    if (statusFilter === "GRACE") return item.eligibility.status === "GRACE_PERIOD" && item.status === "CONFIRMED";
    if (statusFilter === "NO_SHOW") return item.status === "NO_SHOW";
    return true;
  });

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] pb-16">
      <AdminNavigation />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-normal text-[hsl(var(--foreground))] tracking-tight flex items-center gap-2.5">
              <UserCheck className="h-7 w-7 text-[hsl(var(--primary))]" />
              Front-Desk Check-In &amp; No-Show Desk
            </h1>
            <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] mt-1 font-sans">
              Manage patient arrival check-ins, grace periods, and automated no-show lifecycle
            </p>
          </div>

          <div className="flex items-center gap-2 font-sans">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRunSweep}
              disabled={isSweeping}
              className="text-xs flex items-center gap-1.5 border-[hsl(var(--warning)/0.4)] text-[hsl(var(--warning))] bg-[hsl(var(--warning-light))] font-medium"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              {isSweeping ? "Sweeping Overdue..." : "Run No-Show Sweep"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setReloadKey((k) => k + 1)}
              className="text-xs flex items-center gap-1.5 font-medium"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Sync
            </Button>
          </div>
        </div>

        {/* Live KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-sans">
          <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-4 shadow-[var(--shadow-sm)]">
            <div className="flex items-center justify-between text-xs text-[hsl(var(--muted-foreground))]">
              <span className="font-medium">Total Today</span>
              <Users className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
            </div>
            <p className="font-serif text-2xl font-normal text-[hsl(var(--foreground))] mt-1 font-mono">{totalCount}</p>
            <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">Booked slots</p>
          </div>

          <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-4 shadow-[var(--shadow-sm)]">
            <div className="flex items-center justify-between text-xs text-[hsl(var(--success))]">
              <span className="font-medium">Checked In</span>
              <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" />
            </div>
            <p className="font-serif text-2xl font-normal text-[hsl(var(--success))] mt-1 font-mono">{checkedInCount}</p>
            <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">In waiting room</p>
          </div>

          <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-4 shadow-[var(--shadow-sm)]">
            <div className="flex items-center justify-between text-xs text-[hsl(var(--muted-foreground))]">
              <span className="font-medium">Pending Arrival</span>
              <Clock className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
            </div>
            <p className="font-serif text-2xl font-normal text-[hsl(var(--foreground))] mt-1 font-mono">{pendingCheckInCount}</p>
            <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">Awaiting check-in</p>
          </div>

          <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-4 shadow-[var(--shadow-sm)]">
            <div className="flex items-center justify-between text-xs text-[hsl(var(--warning))]">
              <span className="font-medium">Grace Period</span>
              <AlertTriangle className="h-4 w-4 text-[hsl(var(--warning))]" />
            </div>
            <p className="font-serif text-2xl font-normal text-[hsl(var(--warning))] mt-1 font-mono">{gracePeriodCount}</p>
            <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">&le; 15 min late</p>
          </div>

          <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-4 shadow-[var(--shadow-sm)]">
            <div className="flex items-center justify-between text-xs text-[hsl(var(--danger))]">
              <span className="font-medium">No-Shows</span>
              <RotateCcw className="h-4 w-4 text-[hsl(var(--danger))]" />
            </div>
            <p className="font-serif text-2xl font-normal text-[hsl(var(--danger))] mt-1 font-mono">{noShowCount}</p>
            <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">Overdue / Reinstatable</p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-4 shadow-[var(--shadow-sm)] flex flex-wrap items-center gap-3 font-sans">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search token (A-01), patient name, or phone..."
              className="w-full rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] pl-9 pr-3 py-2 text-xs text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-[hsl(var(--input-focus)/0.4)] focus-visible:border-[hsl(var(--input-focus))] transition-colors"
            />
          </div>

          <div className="w-36">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] p-2 text-xs text-[hsl(var(--foreground))] focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-[hsl(var(--input-focus)/0.4)] focus-visible:border-[hsl(var(--input-focus))] font-mono transition-colors"
            />
          </div>

          {branches.length > 0 && (
            <div className="w-48">
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="w-full rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] p-2 text-xs text-[hsl(var(--foreground))] focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-[hsl(var(--input-focus)/0.4)] focus-visible:border-[hsl(var(--input-focus))] transition-colors"
              >
                <option value="">All Hospital Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-[hsl(var(--background))] border border-[hsl(var(--border))] p-1 rounded-[var(--radius-md)] text-xs">
            {[
              { id: "ALL", label: "All" },
              { id: "PENDING", label: `Pending (${pendingCheckInCount})` },
              { id: "CHECKED_IN", label: `Checked In (${checkedInCount})` },
              { id: "GRACE", label: `Grace (${gracePeriodCount})` },
              { id: "NO_SHOW", label: `No-Show (${noShowCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1 rounded-[var(--radius-md)] font-medium transition-all ${
                  statusFilter === tab.id
                    ? "bg-[hsl(var(--primary))] text-white shadow-[var(--shadow-sm)]"
                    : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Check-in Ledger Table */}
        <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] shadow-[var(--shadow-sm)] overflow-hidden font-sans">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--background))] font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider text-[11px]">
                  <th className="p-4">Token &amp; Slot</th>
                  <th className="p-4">Patient Information</th>
                  <th className="p-4">Physician</th>
                  <th className="p-4">Check-In Status / Window</th>
                  <th className="p-4">Arrival Timestamp</th>
                  <th className="p-4 text-right">Desk Actions</th>
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
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-xs text-[hsl(var(--muted-foreground))]">
                      No appointments matching the selected filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const isCheckedIn =
                      item.status === "CHECKED_IN" ||
                      item.status === "WAITING" ||
                      item.status === "IN_CONSULTATION" ||
                      item.status === "COMPLETED";

                    return (
                      <tr key={item.id} className="hover:bg-[hsl(var(--background))] transition-colors">
                        {/* Token & Slot */}
                        <td className="p-4 font-mono">
                          <span className="font-serif font-normal text-base text-[hsl(var(--primary))] block">{item.tokenNumber}</span>
                          <span className="text-[11px] text-[hsl(var(--muted-foreground))] flex items-center gap-1 mt-0.5 font-sans">
                            <Clock className="h-3 w-3" /> {item.startTime}
                          </span>
                        </td>

                        {/* Patient */}
                        <td className="p-4">
                          <div className="font-medium text-sm text-[hsl(var(--foreground))]">{item.patientName}</div>
                          <div className="text-[11px] text-[hsl(var(--muted-foreground))] font-mono mt-0.5">
                            {item.patientPhone || "—"}
                          </div>
                        </td>

                        {/* Doctor */}
                        <td className="p-4">
                          <div className="font-medium text-[hsl(var(--foreground))]">{item.doctorName}</div>
                          <div className="text-[11px] text-[hsl(var(--primary))]">{item.specialty}</div>
                          <div className="text-[10px] text-[hsl(var(--muted-foreground))]">{item.branchName}</div>
                        </td>

                        {/* Status / Window Eligibility */}
                        <td className="p-4">
                          {isCheckedIn ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[var(--radius-full)] text-[11px] font-medium bg-[hsl(var(--success-light))] border border-[hsl(var(--success)/0.3)] text-[hsl(var(--success))]">
                              <CheckCircle2 className="h-3 w-3" /> Checked In
                            </span>
                          ) : item.status === "NO_SHOW" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[var(--radius-full)] text-[11px] font-medium bg-[hsl(var(--danger-light))] border border-[hsl(var(--danger)/0.3)] text-[hsl(var(--danger))]">
                              <AlertTriangle className="h-3 w-3" /> No-Show
                            </span>
                          ) : item.eligibility.status === "GRACE_PERIOD" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[var(--radius-full)] text-[11px] font-medium bg-[hsl(var(--warning-light))] border border-[hsl(var(--warning)/0.3)] text-[hsl(var(--warning))]">
                              <Clock className="h-3 w-3" /> Grace Period Active ({item.eligibility.minutesLate}m late)
                            </span>
                          ) : item.eligibility.status === "TOO_EARLY" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[var(--radius-full)] text-[11px] font-medium bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]">
                              <Clock className="h-3 w-3" /> Opens in {item.eligibility.minutesUntilOpen}m
                            </span>
                          ) : item.eligibility.status === "EXPIRED" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[var(--radius-full)] text-[11px] font-medium bg-[hsl(var(--danger-light))] border border-[hsl(var(--danger)/0.3)] text-[hsl(var(--danger))]">
                              <AlertTriangle className="h-3 w-3" /> Grace Expired ({item.eligibility.minutesLate}m)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[var(--radius-full)] text-[11px] font-medium bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))]">
                              <UserCheck className="h-3 w-3" /> Ready for Check-In
                            </span>
                          )}
                        </td>

                        {/* Arrival Timestamp */}
                        <td className="p-4 font-mono text-xs text-[hsl(var(--muted-foreground))]">
                          {item.checkedInAt ? (
                            <span className="font-medium text-[hsl(var(--foreground))]">
                              {new Date(item.checkedInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>

                        {/* Actions */}
                        <td className="p-4 text-right">
                          {isCheckedIn ? (
                            <span className="text-[11px] font-medium text-[hsl(var(--success))] inline-flex items-center gap-1">
                              <ShieldCheck className="h-3.5 w-3.5" /> In Queue
                            </span>
                          ) : item.status === "NO_SHOW" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setReinstateItem(item);
                                setReinstateReason("Patient arrived late with valid emergency explanation");
                              }}
                              className="text-xs font-medium"
                            >
                              <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reinstate
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleCheckIn(item)}
                              disabled={checkingInIds[item.id]}
                              className="text-xs font-medium"
                            >
                              <UserCheck className="h-3.5 w-3.5 mr-1" />
                              {checkingInIds[item.id] ? "Checking In..." : "Check In"}
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Reinstate Modal */}
      <Modal
        open={Boolean(reinstateItem)}
        onClose={() => setReinstateItem(null)}
        title="Reinstate No-Show Patient"
        description={`Restore Token ${reinstateItem?.tokenNumber} (${reinstateItem?.patientName}) into the active clinical waiting queue.`}
      >
        <div className="space-y-4 pt-2 text-xs font-sans">
          <div className="p-3 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-[var(--radius-md)] space-y-1">
            <p>
              <span className="font-medium text-[hsl(var(--foreground))]">Scheduled Slot:</span> {reinstateItem?.startTime} ({reinstateItem?.date})
            </p>
            <p>
              <span className="font-medium text-[hsl(var(--foreground))]">Physician:</span> {reinstateItem?.doctorName} ({reinstateItem?.specialty})
            </p>
          </div>

          <div>
            <label className="font-medium block mb-1 text-[hsl(var(--foreground))]">
              Clinical / Administrative Reason for Reinstatement <span className="text-[hsl(var(--danger))]">*</span>
            </label>
            <textarea
              rows={3}
              value={reinstateReason}
              onChange={(e) => setReinstateReason(e.target.value)}
              placeholder="e.g., Traffic delay verified, patient arrived at reception counter"
              className="w-full rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] p-2.5 text-xs text-[hsl(var(--foreground))] focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-[hsl(var(--input-focus)/0.4)] focus-visible:border-[hsl(var(--input-focus))] transition-colors"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[hsl(var(--border))]">
            <Button variant="outline" size="sm" onClick={() => setReinstateItem(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmReinstate}
              disabled={isSubmittingReinstate || !reinstateReason.trim()}
              className="font-medium"
            >
              {isSubmittingReinstate ? "Reinstating..." : "Confirm Reinstatement"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
