"use client";

import * as React from "react";
import { Stethoscope, Plus, Search, Edit, Trash2, ShieldAlert } from "lucide-react";
import { AdminNavigation } from "@/components/admin/AdminNavigation";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import type { AdminDoctorDTO } from "@/lib/services/AdminService";

interface DepartmentOption {
  id: string;
  name: string;
}

export default function AdminDoctorsPage() {
  const { addToast } = useToast();

  const [doctors, setDoctors] = React.useState<AdminDoctorDTO[]>([]);
  const [departments, setDepartments] = React.useState<DepartmentOption[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedDepartment, setSelectedDepartment] = React.useState("");
  const [reloadKey, setReloadKey] = React.useState(0);

  // Add / Edit Modal State
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [editingDoctor, setEditingDoctor] = React.useState<AdminDoctorDTO | null>(null);

  // Form fields
  const [docName, setDocName] = React.useState("");
  const [docEmail, setDocEmail] = React.useState("");
  const [docPhone, setDocPhone] = React.useState("");
  const [docSpecialty, setDocSpecialty] = React.useState("");
  const [docQual, setDocQual] = React.useState("MBBS, MD");
  const [docExp, setDocExp] = React.useState(5);
  const [docFee, setDocFee] = React.useState(500);
  const [docDeptId, setDocDeptId] = React.useState("");
  const [docDuration, setDocDuration] = React.useState(20);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Delete / Conflict Resolution Modal State
  const [deletingDoctor, setDeletingDoctor] = React.useState<AdminDoctorDTO | null>(null);
  const [deleteResolution, setDeleteResolution] = React.useState<"CANCEL_APPOINTMENTS" | "REASSIGN">("CANCEL_APPOINTMENTS");
  const [reassignDocId, setReassignDocId] = React.useState("");
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Load doctors & departments
  React.useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        const [docsRes, deptsRes] = await Promise.all([
          fetch(`/api/v1/admin/doctors?search=${encodeURIComponent(searchQuery)}&departmentId=${selectedDepartment}`),
          fetch("/api/v1/admin/departments"),
        ]);

        const [docsJson, deptsJson] = await Promise.all([docsRes.json(), deptsRes.json()]);

        if (isMounted) {
          if (docsRes.ok && docsJson.data) setDoctors(docsJson.data);
          if (deptsRes.ok && deptsJson.data) {
            setDepartments(deptsJson.data);
            if (!docDeptId && deptsJson.data.length > 0) {
              setDocDeptId(deptsJson.data[0].id);
            }
          }
        }
      } catch {
        console.error("Failed to load doctor directory");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [searchQuery, selectedDepartment, reloadKey, docDeptId]);

  const handleOpenAdd = () => {
    setDocName("");
    setDocEmail("");
    setDocPhone("+91 ");
    setDocSpecialty("Cardiology");
    setDocQual("MBBS, MD");
    setDocExp(6);
    setDocFee(600);
    setDocDuration(20);
    if (departments.length > 0) setDocDeptId(departments[0].id);
    setIsAddOpen(true);
  };

  const handleOpenEdit = (doc: AdminDoctorDTO) => {
    setEditingDoctor(doc);
    setDocName(doc.name);
    setDocEmail(doc.email);
    setDocPhone(doc.phone);
    setDocSpecialty(doc.specialty);
    setDocQual(doc.qualifications);
    setDocExp(doc.experienceYears);
    setDocFee(doc.consultationFee);
    setDocDeptId(doc.departmentId);
    setDocDuration(doc.appointmentDurationMin);
    setIsEditOpen(true);
  };

  const handleCreateDoctor = async () => {
    if (!docName || !docEmail || !docSpecialty || !docDeptId) return;
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/v1/admin/doctors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: docName,
          email: docEmail,
          phone: docPhone,
          specialty: docSpecialty,
          qualifications: docQual,
          experienceYears: docExp,
          consultationFee: docFee,
          departmentId: docDeptId,
          appointmentDurationMin: docDuration,
          languages: ["English", "Hindi"],
        }),
      });

      const json = await res.json();

      if (res.ok) {
        addToast({
          type: "success",
          title: "Doctor Registered",
          description: "New doctor profile created — activation link sent.",
        });
        setIsAddOpen(false);
        setReloadKey((k) => k + 1);
      } else {
        addToast({
          type: "error",
          title: "Registration Failed",
          description: json.error?.message || "Could not register doctor.",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateDoctor = async () => {
    if (!editingDoctor) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/v1/admin/doctors/${editingDoctor.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: docName,
          email: docEmail,
          phone: docPhone,
          specialty: docSpecialty,
          qualifications: docQual,
          experienceYears: docExp,
          consultationFee: docFee,
          departmentId: docDeptId,
          appointmentDurationMin: docDuration,
        }),
      });

      const json = await res.json();

      if (res.ok) {
        addToast({
          type: "success",
          title: "Doctor Updated",
          description: "Profile changes saved successfully.",
        });
        setIsEditOpen(false);
        setReloadKey((k) => k + 1);
      } else {
        addToast({
          type: "error",
          title: "Update Failed",
          description: json.error?.message || "Could not update doctor.",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDoctor = async () => {
    if (!deletingDoctor) return;
    setIsDeleting(true);

    try {
      const res = await fetch(
        `/api/v1/admin/doctors/${deletingDoctor.id}?resolution=${deleteResolution}&reassignDoctorId=${reassignDocId}`,
        { method: "DELETE" }
      );

      const json = await res.json();

      if (res.ok) {
        addToast({
          type: "success",
          title: "Doctor Removed",
          description: json.meta?.message || "Doctor deactivated and appointments resolved.",
        });
        setDeletingDoctor(null);
        setReloadKey((k) => k + 1);
      } else {
        addToast({
          type: "error",
          title: "Action Failed",
          description: json.error?.message || "Could not remove doctor.",
        });
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] pb-16">
      <AdminNavigation />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Page Title & Add CTA */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-normal text-[hsl(var(--foreground))] tracking-tight flex items-center gap-2.5">
              <Stethoscope className="h-7 w-7 text-[hsl(var(--primary))]" />
              Doctor Management Directory
            </h1>
            <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] mt-1 font-sans">
              Manage physician credentials, consultation fees, departments, and clinical parameters
            </p>
          </div>

          <Button
            onClick={handleOpenAdd}
            size="sm"
            className="text-xs font-medium flex items-center gap-1.5 shadow-[var(--shadow-sm)] font-sans"
          >
            <Plus className="h-4 w-4" /> Add New Doctor
          </Button>
        </div>

        {/* Filter Bar */}
        <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-4 shadow-[var(--shadow-sm)] flex flex-col sm:flex-row items-stretch sm:items-center gap-3 font-sans">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search doctors by name or specialty..."
              className="w-full rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] pl-9 pr-3 py-2 text-xs text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-[hsl(var(--input-focus)/0.4)] focus-visible:border-[hsl(var(--input-focus))] transition-colors"
            />
          </div>

          <div className="sm:w-60">
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] p-2 text-xs text-[hsl(var(--foreground))] focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-[hsl(var(--input-focus)/0.4)] focus-visible:border-[hsl(var(--input-focus))] transition-colors"
            >
              <option value="">All Medical Departments</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Doctors Table */}
        <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] shadow-[var(--shadow-sm)] overflow-hidden font-sans">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--background))] font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider text-[11px]">
                  <th className="p-4">Physician</th>
                  <th className="p-4">Department &amp; Branch</th>
                  <th className="p-4">Consultation Fee</th>
                  <th className="p-4">Slot Duration</th>
                  <th className="p-4">Active Appointments</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))]">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={6} className="p-4">
                        <div className="h-10 bg-[hsl(var(--muted))] rounded" />
                      </td>
                    </tr>
                  ))
                ) : doctors.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-xs text-[hsl(var(--muted-foreground))]">
                      No doctors matching search criteria.
                    </td>
                  </tr>
                ) : (
                  doctors.map((doc) => (
                    <tr key={doc.id} className="hover:bg-[hsl(var(--background))] transition-colors">
                      <td className="p-4">
                        <div className="font-medium text-sm text-[hsl(var(--foreground))]">{doc.name}</div>
                        <div className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">
                          {doc.qualifications} • {doc.experienceYears} yrs exp
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-[hsl(var(--primary))]">{doc.departmentName}</div>
                        <div className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">{doc.branchName}</div>
                      </td>
                      <td className="p-4 font-mono text-sm text-[hsl(var(--foreground))]">
                        ₹{doc.consultationFee}
                      </td>
                      <td className="p-4">
                        <span className="bg-[hsl(var(--background))] border border-[hsl(var(--border))] px-2.5 py-1 rounded-[var(--radius-md)] text-[11px] font-mono text-[hsl(var(--foreground))]">
                          {doc.appointmentDurationMin} mins
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="font-mono text-sm text-[hsl(var(--foreground))]">
                          {doc.activeAppointmentsCount}
                        </span>{" "}
                        <span className="text-[hsl(var(--muted-foreground))]">Upcoming</span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(doc)}
                            className="h-8 w-8 p-0"
                            title="Edit Doctor"
                          >
                            <Edit className="h-4 w-4 text-[hsl(var(--foreground))]" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingDoctor(doc)}
                            className="h-8 w-8 p-0 text-[hsl(var(--danger))] hover:bg-[hsl(var(--danger-light))]"
                            title="Deactivate Doctor"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Add / Edit Doctor Modal */}
      <Modal
        open={isAddOpen || isEditOpen}
        onClose={() => {
          setIsAddOpen(false);
          setIsEditOpen(false);
        }}
        title={isAddOpen ? "Register New Doctor" : `Edit ${editingDoctor?.name}`}
        description="Configure physician profile credentials, consultation charges, and clinical department."
      >
        <div className="space-y-4 pt-2 text-xs font-sans">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-medium text-[hsl(var(--foreground))] block mb-1">Doctor Full Name</label>
              <input
                type="text"
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                placeholder="Dr. Rajesh Patel"
                className="w-full rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] p-2 text-xs text-[hsl(var(--foreground))] focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-[hsl(var(--input-focus)/0.4)] focus-visible:border-[hsl(var(--input-focus))] transition-colors"
              />
            </div>
            <div>
              <label className="font-medium text-[hsl(var(--foreground))] block mb-1">Department</label>
              <select
                value={docDeptId}
                onChange={(e) => setDocDeptId(e.target.value)}
                className="w-full rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] p-2 text-xs text-[hsl(var(--foreground))] focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-[hsl(var(--input-focus)/0.4)] focus-visible:border-[hsl(var(--input-focus))] transition-colors"
              >
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-medium text-[hsl(var(--foreground))] block mb-1">Email Address</label>
              <input
                type="email"
                value={docEmail}
                onChange={(e) => setDocEmail(e.target.value)}
                placeholder="doctor@mediflow.com"
                className="w-full rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] p-2 text-xs text-[hsl(var(--foreground))] focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-[hsl(var(--input-focus)/0.4)] focus-visible:border-[hsl(var(--input-focus))] transition-colors"
              />
            </div>
            <div>
              <label className="font-medium text-[hsl(var(--foreground))] block mb-1">Phone Number</label>
              <input
                type="text"
                value={docPhone}
                onChange={(e) => setDocPhone(e.target.value)}
                placeholder="+91 98201 11223"
                className="w-full rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] p-2 text-xs text-[hsl(var(--foreground))] focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-[hsl(var(--input-focus)/0.4)] focus-visible:border-[hsl(var(--input-focus))] transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-medium text-[hsl(var(--foreground))] block mb-1">Specialty</label>
              <input
                type="text"
                value={docSpecialty}
                onChange={(e) => setDocSpecialty(e.target.value)}
                placeholder="Cardiology"
                className="w-full rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] p-2 text-xs text-[hsl(var(--foreground))] focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-[hsl(var(--input-focus)/0.4)] focus-visible:border-[hsl(var(--input-focus))] transition-colors"
              />
            </div>
            <div>
              <label className="font-medium text-[hsl(var(--foreground))] block mb-1">Qualifications</label>
              <input
                type="text"
                value={docQual}
                onChange={(e) => setDocQual(e.target.value)}
                placeholder="MBBS, MD"
                className="w-full rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] p-2 text-xs text-[hsl(var(--foreground))] focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-[hsl(var(--input-focus)/0.4)] focus-visible:border-[hsl(var(--input-focus))] transition-colors"
              />
            </div>
            <div>
              <label className="font-medium text-[hsl(var(--foreground))] block mb-1">Experience (Years)</label>
              <input
                type="number"
                value={docExp}
                onChange={(e) => setDocExp(Number(e.target.value))}
                min={0}
                max={50}
                className="w-full rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] p-2 text-xs text-[hsl(var(--foreground))] focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-[hsl(var(--input-focus)/0.4)] focus-visible:border-[hsl(var(--input-focus))] transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-medium text-[hsl(var(--foreground))] block mb-1">Consultation Fee (₹)</label>
              <input
                type="number"
                value={docFee}
                onChange={(e) => setDocFee(Number(e.target.value))}
                min={0}
                step={50}
                className="w-full rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] p-2 text-xs text-[hsl(var(--foreground))] focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-[hsl(var(--input-focus)/0.4)] focus-visible:border-[hsl(var(--input-focus))] transition-colors"
              />
            </div>
            <div>
              <label className="font-medium text-[hsl(var(--foreground))] block mb-1">Appointment Slot Duration (Min)</label>
              <select
                value={docDuration}
                onChange={(e) => setDocDuration(Number(e.target.value))}
                className="w-full rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] p-2 text-xs text-[hsl(var(--foreground))] focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-[hsl(var(--input-focus)/0.4)] focus-visible:border-[hsl(var(--input-focus))] transition-colors"
              >
                <option value={15}>15 Minutes</option>
                <option value={20}>20 Minutes</option>
                <option value={30}>30 Minutes</option>
                <option value={45}>45 Minutes</option>
              </select>
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
              onClick={isAddOpen ? handleCreateDoctor : handleUpdateDoctor}
              disabled={isSubmitting || !docName || !docEmail}
              className="font-medium"
            >
              {isSubmitting ? "Saving..." : isAddOpen ? "Register Doctor" : "Save Changes"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete / Conflict Resolution Modal */}
      <Modal
        open={Boolean(deletingDoctor)}
        onClose={() => setDeletingDoctor(null)}
        title="Remove Doctor & Resolve Bookings"
        description={`Deactivate ${deletingDoctor?.name}. Choose how to handle upcoming appointments.`}
      >
        <div className="space-y-4 pt-2 text-xs font-sans">
          <div className="p-3 rounded-[var(--radius-md)] bg-[hsl(var(--warning-light))] border border-[hsl(var(--warning)/0.3)] text-[hsl(var(--warning))] flex items-start gap-2">
            <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-medium">Upcoming Bookings Impact</strong>
              <span>
                {deletingDoctor?.activeAppointmentsCount || 0} active appointments are currently booked with this doctor.
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="font-medium text-[hsl(var(--foreground))] block">Resolution Strategy</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 p-2.5 rounded-[var(--radius-md)] border border-[hsl(var(--border))] bg-[hsl(var(--background))] cursor-pointer">
                <input
                  type="radio"
                  name="resolution"
                  value="CANCEL_APPOINTMENTS"
                  checked={deleteResolution === "CANCEL_APPOINTMENTS"}
                  onChange={() => setDeleteResolution("CANCEL_APPOINTMENTS")}
                  className="text-[hsl(var(--primary))] focus:ring-[hsl(var(--primary))]"
                />
                <div>
                  <span className="font-medium text-[hsl(var(--foreground))] block">Cancel all upcoming appointments</span>
                  <span className="text-[11px] text-[hsl(var(--muted-foreground))]">
                    Appointments will be marked CANCELLED with administration note.
                  </span>
                </div>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-[var(--radius-md)] border border-[hsl(var(--border))] bg-[hsl(var(--background))] cursor-pointer">
                <input
                  type="radio"
                  name="resolution"
                  value="REASSIGN"
                  checked={deleteResolution === "REASSIGN"}
                  onChange={() => setDeleteResolution("REASSIGN")}
                  className="text-[hsl(var(--primary))] focus:ring-[hsl(var(--primary))]"
                />
                <div>
                  <span className="font-medium text-[hsl(var(--foreground))] block">Reassign to another doctor</span>
                  <span className="text-[11px] text-[hsl(var(--muted-foreground))]">
                    Move all booked patients to a peer physician in the department.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {deleteResolution === "REASSIGN" && (
            <div>
              <label className="font-medium text-[hsl(var(--foreground))] block mb-1">Target Doctor for Reassignment</label>
              <select
                value={reassignDocId}
                onChange={(e) => setReassignDocId(e.target.value)}
                className="w-full rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] p-2 text-xs text-[hsl(var(--foreground))] focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-[hsl(var(--input-focus)/0.4)] focus-visible:border-[hsl(var(--input-focus))] transition-colors"
              >
                <option value="">Select Doctor...</option>
                {doctors
                  .filter((d) => d.id !== deletingDoctor?.id)
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.specialty})
                    </option>
                  ))}
              </select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-[hsl(var(--border))]">
            <Button variant="outline" size="sm" onClick={() => setDeletingDoctor(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleDeleteDoctor}
              disabled={isDeleting || (deleteResolution === "REASSIGN" && !reassignDocId)}
              className="bg-[hsl(var(--danger))] hover:bg-[hsl(var(--danger)/0.9)] text-white font-medium"
            >
              {isDeleting ? "Processing..." : "Confirm Deactivation"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
