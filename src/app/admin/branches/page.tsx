"use client";

import * as React from "react";
import {
  MapPin,
  ShieldCheck,
  Plus,
  Edit,
  Trash2,
  ShieldAlert,
  Building2,
  Clock,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";

interface BranchDTO {
  id: string;
  name: string;
  address?: string | null;
  timezone: string;
  gracePeriodMin: number;
  rescheduleCutoffHrs: number;
  departmentCount: number;
}

interface ConflictDetails {
  departmentsCount: number;
  doctorsCount: number;
  activeAppointmentsCount: number;
}

export default function AdminBranchesPage() {
  const { addToast } = useToast();

  const [branches, setBranches] = React.useState<BranchDTO[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [reloadKey, setReloadKey] = React.useState(0);

  // Add / Edit Modal State
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [editingBranch, setEditingBranch] = React.useState<BranchDTO | null>(null);

  // Form fields
  const [branchName, setBranchName] = React.useState("");
  const [branchAddress, setBranchAddress] = React.useState("");
  const [branchTimezone, setBranchTimezone] = React.useState("Asia/Kolkata");
  const [gracePeriodMin, setGracePeriodMin] = React.useState(15);
  const [rescheduleCutoffHrs, setRescheduleCutoffHrs] = React.useState(2);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Delete / Conflict Resolution State
  const [deletingBranch, setDeletingBranch] = React.useState<BranchDTO | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [conflictDetails, setConflictDetails] = React.useState<ConflictDetails | null>(null);
  const [conflictMessage, setConflictMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;

    const fetchBranches = async () => {
      try {
        setIsLoading(true);
        const res = await fetch("/api/v1/admin/branches");
        const json = await res.json();
        if (isMounted && res.ok && json.data) {
          setBranches(json.data);
        }
      } catch {
        console.error("Failed to load branches");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchBranches();
    return () => {
      isMounted = false;
    };
  }, [reloadKey]);

  const handleOpenAdd = () => {
    setBranchName("");
    setBranchAddress("");
    setBranchTimezone("Asia/Kolkata");
    setGracePeriodMin(15);
    setRescheduleCutoffHrs(2);
    setIsAddOpen(true);
  };

  const handleOpenEdit = (branch: BranchDTO) => {
    setEditingBranch(branch);
    setBranchName(branch.name);
    setBranchAddress(branch.address || "");
    setBranchTimezone(branch.timezone || "Asia/Kolkata");
    setGracePeriodMin(branch.gracePeriodMin ?? 15);
    setRescheduleCutoffHrs(branch.rescheduleCutoffHrs ?? 2);
    setIsEditOpen(true);
  };

  const handleCreateBranch = async () => {
    if (!branchName.trim()) return;
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/v1/admin/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: branchName.trim(),
          address: branchAddress.trim() || null,
          timezone: branchTimezone,
          gracePeriodMin,
          rescheduleCutoffHrs,
        }),
      });

      const json = await res.json();

      if (res.ok) {
        addToast({
          type: "success",
          title: "Branch Created",
          description: `Hospital branch "${branchName}" has been successfully added.`,
        });
        setIsAddOpen(false);
        setReloadKey((k) => k + 1);
      } else {
        addToast({
          type: "error",
          title: "Creation Failed",
          description: json.error?.message || "Failed to create new branch.",
        });
      }
    } catch {
      addToast({
        type: "error",
        title: "Network Error",
        description: "An unexpected error occurred while creating branch.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateBranch = async () => {
    if (!editingBranch || !branchName.trim()) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/v1/admin/branches/${editingBranch.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: branchName.trim(),
          address: branchAddress.trim() || null,
          timezone: branchTimezone,
          gracePeriodMin,
          rescheduleCutoffHrs,
        }),
      });

      const json = await res.json();

      if (res.ok) {
        addToast({
          type: "success",
          title: "Branch Updated",
          description: "Branch details and policies saved successfully.",
        });
        setIsEditOpen(false);
        setReloadKey((k) => k + 1);
      } else {
        addToast({
          type: "error",
          title: "Update Failed",
          description: json.error?.message || "Could not update branch details.",
        });
      }
    } catch {
      addToast({
        type: "error",
        title: "Network Error",
        description: "An unexpected error occurred while updating branch.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDelete = (branch: BranchDTO) => {
    setDeletingBranch(branch);
    setConflictDetails(null);
    setConflictMessage(null);
  };

  const handleDeleteBranch = async () => {
    if (!deletingBranch) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/v1/admin/branches/${deletingBranch.id}`, {
        method: "DELETE",
      });

      const json = await res.json();

      if (res.ok) {
        addToast({
          type: "success",
          title: "Branch Deactivated",
          description: json.meta?.message || "Hospital branch has been successfully removed.",
        });
        setDeletingBranch(null);
        setReloadKey((k) => k + 1);
      } else if (res.status === 409) {
        // Conflict guard tripped
        const details = json.error?.details;
        if (details) {
          setConflictDetails({
            departmentsCount: Number(Array.isArray(details.departmentsCount) ? details.departmentsCount[0] : details.departmentsCount || 0),
            doctorsCount: Number(Array.isArray(details.doctorsCount) ? details.doctorsCount[0] : details.doctorsCount || 0),
            activeAppointmentsCount: Number(Array.isArray(details.activeAppointmentsCount) ? details.activeAppointmentsCount[0] : details.activeAppointmentsCount || 0),
          });
        }
        setConflictMessage(
          json.error?.message ||
            "Cannot remove branch with linked departments, doctors, or active appointments."
        );
      } else {
        addToast({
          type: "error",
          title: "Deletion Failed",
          description: json.error?.message || "Could not remove branch.",
        });
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 pb-16">
        {/* Header & Add CTA */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-normal text-[hsl(var(--foreground))] tracking-tight flex items-center gap-2.5">
              <MapPin className="h-7 w-7 text-[hsl(var(--primary))]" />
              Hospital Clinics &amp; Branches
            </h1>
            <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] mt-1 font-sans">
              Manage hospital physical campuses, clinical policies, check-in grace windows, and timezones
            </p>
          </div>

          <Button
            onClick={handleOpenAdd}
            size="sm"
            className="text-xs font-medium flex items-center gap-1.5 shadow-[var(--shadow-sm)] font-sans"
          >
            <Plus className="h-4 w-4" /> Add Branch
          </Button>
        </div>

        {/* Branches Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-sans">
          {isLoading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="h-56 rounded-[var(--radius-xl)] bg-[hsl(var(--card))] border border-[hsl(var(--border))] animate-pulse"
              />
            ))
          ) : branches.length === 0 ? (
            <div className="col-span-full py-12 text-center text-xs text-[hsl(var(--muted-foreground))] bg-[hsl(var(--card))] rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))]">
              No hospital branches found. Click &quot;Add Branch&quot; to create one.
            </div>
          ) : (
            branches.map((b) => (
              <div
                key={b.id}
                className="rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6 shadow-[var(--shadow-sm)] space-y-4 hover:border-[hsl(var(--primary)/0.4)] transition-colors"
              >
                {/* Card Top: Icon, Status Badge & Action Buttons */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-lg)] bg-[hsl(var(--muted))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] font-serif font-normal">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase bg-[hsl(var(--success-light))] border border-[hsl(var(--success)/0.3)] text-[hsl(var(--success))] px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3" /> Operational
                      </span>
                      <span className="text-[10px] font-mono text-[hsl(var(--muted-foreground))] ml-2 inline-flex items-center gap-1">
                        <Building2 className="h-3 w-3" /> {b.departmentCount} {b.departmentCount === 1 ? "Dept" : "Depts"}
                      </span>
                    </div>
                  </div>

                  {/* Row Actions */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEdit(b)}
                      className="h-8 w-8 p-0"
                      title="Edit Branch"
                    >
                      <Edit className="h-4 w-4 text-[hsl(var(--foreground))]" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenDelete(b)}
                      className="h-8 w-8 p-0 text-[hsl(var(--danger))] hover:bg-[hsl(var(--danger-light))]"
                      title="Deactivate Branch"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Branch Details */}
                <div>
                  <h3 className="font-serif text-lg font-normal text-[hsl(var(--foreground))]">{b.name}</h3>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                    {b.address || "Medical District Campus"}
                  </p>
                </div>

                {/* Branch Policies */}
                <div className="grid grid-cols-3 gap-2 pt-4 border-t border-[hsl(var(--border))] text-xs">
                  <div className="bg-[hsl(var(--background))] border border-[hsl(var(--border))] p-2.5 rounded-[var(--radius-md)] text-center">
                    <span className="text-[10px] text-[hsl(var(--muted-foreground))] font-medium block flex items-center justify-center gap-1">
                      <Globe className="h-2.5 w-2.5" /> Timezone
                    </span>
                    <strong className="text-xs font-mono font-medium text-[hsl(var(--foreground))] block truncate mt-0.5">
                      {b.timezone}
                    </strong>
                  </div>
                  <div className="bg-[hsl(var(--background))] border border-[hsl(var(--border))] p-2.5 rounded-[var(--radius-md)] text-center">
                    <span className="text-[10px] text-[hsl(var(--muted-foreground))] font-medium block flex items-center justify-center gap-1">
                      <Clock className="h-2.5 w-2.5" /> Grace Period
                    </span>
                    <strong className="text-xs text-[hsl(var(--primary))] font-mono block mt-0.5">
                      {b.gracePeriodMin} mins
                    </strong>
                  </div>
                  <div className="bg-[hsl(var(--background))] border border-[hsl(var(--border))] p-2.5 rounded-[var(--radius-md)] text-center">
                    <span className="text-[10px] text-[hsl(var(--muted-foreground))] font-medium block">
                      Reschedule Cutoff
                    </span>
                    <strong className="text-xs font-mono font-medium text-[hsl(var(--foreground))] block mt-0.5">
                      {b.rescheduleCutoffHrs} hrs prior
                    </strong>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

      {/* Add / Edit Branch Modal */}
      <Modal
        open={isAddOpen || isEditOpen}
        onClose={() => {
          setIsAddOpen(false);
          setIsEditOpen(false);
        }}
        title={isAddOpen ? "Add Hospital Branch" : `Edit ${editingBranch?.name}`}
        description="Configure hospital physical campus details, address, timezone, and patient scheduling policies."
      >
        <div className="space-y-4 pt-2 text-xs font-sans">
          <div>
            <label className="font-medium text-[hsl(var(--foreground))] block mb-1">Branch Name *</label>
            <input
              type="text"
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              placeholder="e.g. Central Hospital - Main Branch"
              className="w-full rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] p-2.5 text-xs text-[hsl(var(--foreground))] focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-[hsl(var(--input-focus)/0.4)] focus-visible:border-[hsl(var(--input-focus))] transition-colors"
            />
          </div>

          <div>
            <label className="font-medium text-[hsl(var(--foreground))] block mb-1">Campus Address / Location</label>
            <input
              type="text"
              value={branchAddress}
              onChange={(e) => setBranchAddress(e.target.value)}
              placeholder="e.g. 108 Health Boulevard, Medical District, Mumbai"
              className="w-full rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] p-2.5 text-xs text-[hsl(var(--foreground))] focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-[hsl(var(--input-focus)/0.4)] focus-visible:border-[hsl(var(--input-focus))] transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-medium text-[hsl(var(--foreground))] block mb-1">Timezone</label>
              <select
                value={branchTimezone}
                onChange={(e) => setBranchTimezone(e.target.value)}
                className="w-full rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] p-2.5 text-xs text-[hsl(var(--foreground))] focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-[hsl(var(--input-focus)/0.4)] focus-visible:border-[hsl(var(--input-focus))] transition-colors"
              >
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                <option value="UTC">UTC</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
                <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
              </select>
            </div>

            <div>
              <label className="font-medium text-[hsl(var(--foreground))] block mb-1">Grace Period (Min)</label>
              <input
                type="number"
                value={gracePeriodMin}
                onChange={(e) => setGracePeriodMin(Number(e.target.value))}
                min={5}
                max={60}
                className="w-full rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] p-2.5 text-xs text-[hsl(var(--foreground))] focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-[hsl(var(--input-focus)/0.4)] focus-visible:border-[hsl(var(--input-focus))] font-mono transition-colors"
              />
              <span className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5 block">
                Late check-in window
              </span>
            </div>

            <div>
              <label className="font-medium text-[hsl(var(--foreground))] block mb-1">Reschedule Cutoff (Hrs)</label>
              <input
                type="number"
                value={rescheduleCutoffHrs}
                onChange={(e) => setRescheduleCutoffHrs(Number(e.target.value))}
                min={0}
                max={48}
                className="w-full rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] p-2.5 text-xs text-[hsl(var(--foreground))] focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-[hsl(var(--input-focus)/0.4)] focus-visible:border-[hsl(var(--input-focus))] font-mono transition-colors"
              />
              <span className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5 block">
                Min hrs before slot
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[hsl(var(--border))]">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsAddOpen(false);
                setIsEditOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={isAddOpen ? handleCreateBranch : handleUpdateBranch}
              disabled={isSubmitting || !branchName.trim()}
              className="font-medium"
            >
              {isSubmitting ? "Saving..." : isAddOpen ? "Create Branch" : "Save Changes"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete / Conflict Resolution Modal */}
      <Modal
        open={Boolean(deletingBranch)}
        onClose={() => {
          setDeletingBranch(null);
          setConflictDetails(null);
          setConflictMessage(null);
        }}
        title="Deactivate Hospital Branch"
        description={`Remove ${deletingBranch?.name} from active hospital operations.`}
      >
        <div className="space-y-4 pt-2 text-xs font-sans">
          {conflictMessage ? (
            /* Conflict details box */
            <div className="space-y-3">
              <div className="p-3.5 rounded-[var(--radius-md)] bg-[hsl(var(--danger-light))] border border-[hsl(var(--danger)/0.3)] text-[hsl(var(--danger))] flex items-start gap-2.5">
                <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-medium text-sm">Cannot Deactivate Branch (Active Records Found)</strong>
                  <p className="text-xs text-[hsl(var(--foreground))] mt-1">
                    {conflictMessage}
                  </p>
                </div>
              </div>

              {conflictDetails && (
                <div className="p-3 rounded-[var(--radius-md)] bg-[hsl(var(--background))] border border-[hsl(var(--border))] space-y-1.5">
                  <span className="font-medium text-[hsl(var(--foreground))] block">Linked Entities to Resolve:</span>
                  <ul className="list-disc list-inside text-xs text-[hsl(var(--muted-foreground))] space-y-1">
                    {conflictDetails.departmentsCount > 0 && (
                      <li>
                        <strong className="text-[hsl(var(--foreground))]">{conflictDetails.departmentsCount}</strong> active department(s) assigned
                      </li>
                    )}
                    {conflictDetails.doctorsCount > 0 && (
                      <li>
                        <strong className="text-[hsl(var(--foreground))]">{conflictDetails.doctorsCount}</strong> active doctor(s) practicing here
                      </li>
                    )}
                    {conflictDetails.activeAppointmentsCount > 0 && (
                      <li>
                        <strong className="text-[hsl(var(--foreground))]">{conflictDetails.activeAppointmentsCount}</strong> upcoming appointment(s) booked
                      </li>
                    )}
                  </ul>
                  <p className="text-[11px] text-[hsl(var(--muted-foreground))] pt-1 border-t border-[hsl(var(--border))]">
                    Please reassign or delete these departments and doctors, and resolve or cancel any upcoming bookings before removing this branch.
                  </p>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setDeletingBranch(null);
                    setConflictDetails(null);
                    setConflictMessage(null);
                  }}
                >
                  Close
                </Button>
              </div>
            </div>
          ) : (
            /* Standard confirmation prompt */
            <div className="space-y-4">
              <div className="p-3 rounded-[var(--radius-md)] bg-[hsl(var(--warning-light))] border border-[hsl(var(--warning)/0.3)] text-[hsl(var(--warning))] flex items-start gap-2">
                <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-medium">Branch Deactivation Guard</strong>
                  <span className="text-[11px] text-[hsl(var(--foreground))]">
                    Deactivating this branch will prevent new bookings. The system will ensure no active departments, physicians, or upcoming appointments remain linked.
                  </span>
                </div>
              </div>

              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Are you sure you want to deactivate <strong className="text-[hsl(var(--foreground))]">{deletingBranch?.name}</strong>?
              </p>

              <div className="flex justify-end gap-2 pt-3 border-t border-[hsl(var(--border))]">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeletingBranch(null)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleDeleteBranch}
                  disabled={isDeleting}
                  className="bg-[hsl(var(--danger))] hover:bg-[hsl(var(--danger)/0.9)] text-white font-medium"
                >
                  {isDeleting ? "Checking & Deactivating..." : "Confirm Deactivation"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </main>
  );
}
