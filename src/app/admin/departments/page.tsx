"use client";

import * as React from "react";
import { Building2, Plus, Users, MapPin } from "lucide-react";
import { AdminNavigation } from "@/components/admin/AdminNavigation";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";

interface DepartmentDTO {
  id: string;
  name: string;
  branchId: string;
  branchName: string;
  doctorCount: number;
  doctors: { id: string; name: string; specialty: string }[];
}

interface BranchDTO {
  id: string;
  name: string;
}

export default function AdminDepartmentsPage() {
  const { addToast } = useToast();

  const [departments, setDepartments] = React.useState<DepartmentDTO[]>([]);
  const [branches, setBranches] = React.useState<BranchDTO[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [reloadKey, setReloadKey] = React.useState(0);

  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [deptName, setDeptName] = React.useState("");
  const [branchId, setBranchId] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        const [deptRes, branchRes] = await Promise.all([
          fetch("/api/v1/admin/departments"),
          fetch("/api/v1/admin/branches"),
        ]);

        const [deptJson, branchJson] = await Promise.all([deptRes.json(), branchRes.json()]);

        if (isMounted) {
          if (deptRes.ok && deptJson.data) setDepartments(deptJson.data);
          if (branchRes.ok && branchJson.data) {
            setBranches(branchJson.data);
            if (branchJson.data.length > 0 && !branchId) {
              setBranchId(branchJson.data[0].id);
            }
          }
        }
      } catch {
        console.error("Failed to load departments");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [reloadKey, branchId]);

  const handleCreateDepartment = async () => {
    if (!deptName || !branchId) return;
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/v1/admin/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: deptName,
          branchId,
          isActive: true,
        }),
      });

      const json = await res.json();

      if (res.ok) {
        addToast({
          type: "success",
          title: "Department Created",
          description: "New clinical department registered successfully.",
        });
        setIsAddOpen(false);
        setDeptName("");
        setReloadKey((k) => k + 1);
      } else {
        addToast({
          type: "error",
          title: "Failed to Create",
          description: json.error?.message || "Could not create department.",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] pb-16">
      <AdminNavigation />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-normal text-[hsl(var(--foreground))] tracking-tight flex items-center gap-2.5">
              <Building2 className="h-7 w-7 text-[hsl(var(--primary))]" />
              Medical Departments
            </h1>
            <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] mt-1 font-sans">
              Manage clinical specialties and hospital branch departmental assignments
            </p>
          </div>

          <Button
            size="sm"
            onClick={() => setIsAddOpen(true)}
            className="text-xs font-medium flex items-center gap-1.5 shadow-[var(--shadow-sm)] font-sans"
          >
            <Plus className="h-4 w-4" /> Add Department
          </Button>
        </div>

        {/* Departments Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-40 rounded-[var(--radius-xl)] bg-[hsl(var(--card))] border border-[hsl(var(--border))] animate-pulse" />
            ))
          ) : departments.length === 0 ? (
            <div className="col-span-full py-12 text-center text-xs text-[hsl(var(--muted-foreground))] font-sans">
              No departments found.
            </div>
          ) : (
            departments.map((dept) => (
              <div
                key={dept.id}
                className="rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6 shadow-[var(--shadow-sm)] space-y-4 hover:border-[hsl(var(--primary)/0.4)] transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-lg)] bg-[hsl(var(--muted))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] font-serif font-normal">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-mono uppercase bg-[hsl(var(--success-light))] border border-[hsl(var(--success)/0.3)] text-[hsl(var(--success))] px-2.5 py-0.5 rounded-full">
                    Active
                  </span>
                </div>

                <div>
                  <h3 className="font-serif text-base font-normal text-[hsl(var(--foreground))]">{dept.name}</h3>
                  <div className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))] mt-1 font-sans">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{dept.branchName}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-[hsl(var(--border))] flex items-center justify-between text-xs font-sans">
                  <span className="text-[hsl(var(--muted-foreground))] flex items-center gap-1.5 font-medium">
                    <Users className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" /> Assigned Doctors
                  </span>
                  <span className="font-mono text-[hsl(var(--foreground))] font-medium">{dept.doctorCount} Doctors</span>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Add Department Modal */}
      <Modal
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add Medical Department"
        description="Register a new clinical department in a specific hospital branch."
      >
        <div className="space-y-4 pt-2 text-xs font-sans">
          <div>
            <label className="font-medium text-[hsl(var(--foreground))] block mb-1">Department Name</label>
            <input
              type="text"
              value={deptName}
              onChange={(e) => setDeptName(e.target.value)}
              placeholder="e.g., Neurology, Pediatrics, Dermatology"
              className="w-full rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] p-2.5 text-xs text-[hsl(var(--foreground))] focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-[hsl(var(--input-focus)/0.4)] focus-visible:border-[hsl(var(--input-focus))] transition-colors"
            />
          </div>

          <div>
            <label className="font-medium text-[hsl(var(--foreground))] block mb-1">Assigned Hospital Branch</label>
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="w-full rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] p-2.5 text-xs text-[hsl(var(--foreground))] focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-[hsl(var(--input-focus)/0.4)] focus-visible:border-[hsl(var(--input-focus))] transition-colors"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[hsl(var(--border))]">
            <Button variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreateDepartment} disabled={isSubmitting || !deptName} className="font-medium">
              {isSubmitting ? "Creating..." : "Add Department"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
