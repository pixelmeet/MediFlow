"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Stethoscope, Save, CheckCircle2, Calendar, FileText, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { PatientHistoryPanel } from "@/components/doctor/PatientHistoryPanel";
import { PrescriptionBuilder } from "@/components/doctor/PrescriptionBuilder";
import type { ConsultationDetailsDTO, PatientHistoryVisitDTO } from "@/lib/services/ConsultationService";
import type { PrescriptionItemInput } from "@/lib/validation/consultation";

export default function DoctorConsultationPage() {
  const params = useParams();
  const router = useRouter();
  const tokenId = params.tokenId as string;
  const { addToast } = useToast();

  const [details, setDetails] = React.useState<ConsultationDetailsDTO | null>(null);
  const [historyVisits, setHistoryVisits] = React.useState<PatientHistoryVisitDTO[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isLoadingVisits, setIsLoadingVisits] = React.useState(false);

  // Form State
  const [complaints, setComplaints] = React.useState("");
  const [examinationNotes, setExaminationNotes] = React.useState("");
  const [diagnosis, setDiagnosis] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [followUpDate, setFollowUpDate] = React.useState("");
  const [prescriptionItems, setPrescriptionItems] = React.useState<PrescriptionItemInput[]>([]);

  const [isSavingDraft, setIsSavingDraft] = React.useState(false);
  const [isCompleting, setIsCompleting] = React.useState(false);
  const [lastSavedTime, setLastSavedTime] = React.useState<string | null>(null);

  // Fetch consultation details
  React.useEffect(() => {
    let isMounted = true;

    const fetchDetails = async () => {
      try {
        const res = await fetch(`/api/v1/consultations/${tokenId}`);
        const json = await res.json();
        if (!isMounted) return;

        if (res.ok && json.data) {
          const d: ConsultationDetailsDTO = json.data;
          setDetails(d);

          if (d.consultation) {
            setComplaints(d.consultation.complaints || "");
            setExaminationNotes(d.consultation.examinationNotes || "");
            setDiagnosis(d.consultation.diagnosis || "");
            setNotes(d.consultation.notes || "");
            setFollowUpDate(d.consultation.followUpDate || "");
            if (d.consultation.prescription?.items) {
              setPrescriptionItems(d.consultation.prescription.items);
            }
          }

          // Fetch patient past visits
          if (d.patient?.id) {
            setIsTransMounted(d.patient.id);
          }
        }
      } catch {
        console.error("Failed to load consultation session");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    const setIsTransMounted = async (patientId: string) => {
      setIsLoadingVisits(true);
      try {
        const res = await fetch(`/api/v1/patients/${patientId}/history`);
        const json = await res.json();
        if (isMounted && res.ok && json.data) {
          setHistoryVisits(json.data);
        }
      } catch {
        if (isMounted) setHistoryVisits([]);
      } finally {
        if (isMounted) setIsLoadingVisits(false);
      }
    };

    fetchDetails();

    return () => {
      isMounted = false;
    };
  }, [tokenId]);

  // Periodic autosave draft (every 15s if diagnosis or complaints present)
  React.useEffect(() => {
    if (!details?.consultation?.id || (!diagnosis && !complaints)) return;

    const autoSaveTimer = setTimeout(async () => {
      try {
        await fetch(`/api/v1/consultations/${tokenId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "save_draft",
            complaints,
            examinationNotes,
            diagnosis,
            notes,
            followUpDate: followUpDate || null,
            prescriptionItems,
          }),
        });
        setLastSavedTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      } catch {
        // silent fail on autosave background
      }
    }, 15000);

    return () => clearTimeout(autoSaveTimer);
  }, [tokenId, details, complaints, examinationNotes, diagnosis, notes, followUpDate, prescriptionItems]);

  const handleManualSaveDraft = async () => {
    setIsSavingDraft(true);
    try {
      const res = await fetch(`/api/v1/consultations/${tokenId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_draft",
          complaints,
          examinationNotes,
          diagnosis,
          notes,
          followUpDate: followUpDate || null,
          prescriptionItems,
        }),
      });

      if (res.ok) {
        setLastSavedTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
        addToast({
          type: "success",
          title: "Draft Saved",
          description: "Consultation notes have been saved.",
        });
      }
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleCompleteConsultation = async () => {
    if (!diagnosis.trim()) {
      addToast({
        type: "warning",
        title: "Diagnosis Required",
        description: "Please enter a clinical diagnosis before completing consultation.",
      });
      return;
    }

    setIsCompleting(true);
    try {
      const res = await fetch(`/api/v1/consultations/${tokenId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete",
          complaints,
          examinationNotes,
          diagnosis,
          notes,
          followUpDate: followUpDate || null,
          prescriptionItems,
        }),
      });

      const json = await res.json();

      if (res.ok) {
        addToast({
          type: "success",
          title: "Consultation Completed",
          description: json.meta?.message || "Prescription generated and visit finished.",
        });
        router.push("/doctor/dashboard");
      } else {
        addToast({
          type: "error",
          title: "Failed to Complete",
          description: json.error?.message || "Could not complete consultation.",
        });
      }
    } catch {
      addToast({
        type: "error",
        title: "Network Error",
        description: "Failed to submit completed consultation.",
      });
    } finally {
      setIsCompleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[hsl(var(--background))] p-8">
        <div className="max-w-7xl mx-auto space-y-6 animate-pulse">
          <div className="h-20 rounded-[var(--radius-xl)] bg-[hsl(var(--card))] border border-[hsl(var(--border))]" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="h-96 rounded-[var(--radius-xl)] bg-[hsl(var(--card))] border border-[hsl(var(--border))]" />
            <div className="lg:col-span-2 h-96 rounded-[var(--radius-xl)] bg-[hsl(var(--card))] border border-[hsl(var(--border))]" />
          </div>
        </div>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center p-4">
        <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 text-center max-w-md">
          <AlertCircle className="h-8 w-8 text-[hsl(var(--danger))] mx-auto mb-2" />
          <h2 className="text-base font-bold text-[hsl(var(--foreground))]">Consultation Not Found</h2>
          <Link href="/doctor/dashboard">
            <Button size="sm" className="mt-4 text-xs">
              Back to Doctor Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[hsl(var(--background))] pb-24">
      {/* ─── Header / Action Bar ──────────────────────────── */}
      <div className="border-b border-[hsl(var(--border))] bg-[hsl(var(--card)/0.6)] backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link href="/doctor/dashboard">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-lg)] bg-[hsl(var(--primary))] text-white shadow-[var(--shadow-sm)]">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
                Consultation: <span className="text-[hsl(var(--primary))]">{details.patient.name}</span>
                <span className="font-mono bg-[hsl(var(--primary-light))] text-[hsl(var(--primary))] text-xs px-2 py-0.5 rounded font-bold">
                  Token {details.tokenNumber}
                </span>
              </h1>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                {details.appointmentDate} at {details.appointmentTime} • {details.doctor.specialty}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {lastSavedTime && (
              <span className="hidden sm:inline text-[11px] text-[hsl(var(--muted-foreground))]">
                Autosaved at {lastSavedTime}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualSaveDraft}
              disabled={isSavingDraft}
              className="text-xs flex items-center gap-1.5"
            >
              <Save className="h-3.5 w-3.5" />
              {isSavingDraft ? "Saving..." : "Save Draft"}
            </Button>
            <Button
              size="sm"
              onClick={handleCompleteConsultation}
              disabled={isCompleting || !diagnosis.trim()}
              className="text-xs flex items-center gap-1.5 font-bold shadow-[var(--shadow-sm)]"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {isCompleting ? "Finishing..." : "Complete Consultation"}
            </Button>
          </div>
        </div>
      </div>

      {/* ─── Two-Column Clinical Workspace ───────────────── */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Patient Demographics & History */}
          <div className="lg:col-span-1 space-y-6">
            <PatientHistoryPanel
              patient={details.patient}
              visits={historyVisits}
              isLoadingVisits={isLoadingVisits}
            />
          </div>

          {/* Right Column: Active Clinical Form & Prescription */}
          <div className="lg:col-span-2 space-y-6">
            {/* Clinical Notes Card */}
            <div className="rounded-[var(--radius-2xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6 shadow-[var(--shadow-sm)] space-y-4">
              <h3 className="text-base font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
                <FileText className="h-4 w-4 text-[hsl(var(--primary))]" />
                Clinical Examination & Findings
              </h3>

              <div className="space-y-4 text-xs">
                {/* Chief Complaints */}
                <div>
                  <label className="font-semibold text-[hsl(var(--foreground))] block mb-1">
                    Chief Complaints & Symptoms
                  </label>
                  <textarea
                    rows={2}
                    value={complaints}
                    onChange={(e) => setComplaints(e.target.value)}
                    placeholder="e.g., Shortness of breath on exertion, chest heaviness for 3 days..."
                    className="w-full rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] p-2.5 text-xs text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:outline-none"
                  />
                </div>

                {/* Examination Notes / Vitals */}
                <div>
                  <label className="font-semibold text-[hsl(var(--foreground))] block mb-1">
                    Physical Examination Findings / Vitals
                  </label>
                  <textarea
                    rows={2}
                    value={examinationNotes}
                    onChange={(e) => setExaminationNotes(e.target.value)}
                    placeholder="e.g., BP: 130/85 mmHg, Pulse: 78 bpm, Chest: Bilateral clear..."
                    className="w-full rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] p-2.5 text-xs text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:outline-none"
                  />
                </div>

                {/* Primary Diagnosis (Required) */}
                <div>
                  <label className="font-semibold text-[hsl(var(--foreground))] block mb-1">
                    Formal Diagnosis <span className="text-[hsl(var(--danger))]">*</span>
                  </label>
                  <input
                    type="text"
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    placeholder="e.g., Stable Angina Pectoris, Essential Hypertension, Acute Bronchitis"
                    className="w-full rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] p-2.5 text-xs font-bold text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] placeholder:font-normal focus:border-[hsl(var(--primary))] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Prescription Builder Card */}
            <div className="rounded-[var(--radius-2xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6 shadow-[var(--shadow-sm)]">
              <PrescriptionBuilder
                items={prescriptionItems}
                onChange={setPrescriptionItems}
              />
            </div>

            {/* General Advice & Follow-Up Date */}
            <div className="rounded-[var(--radius-2xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6 shadow-[var(--shadow-sm)] space-y-4">
              <h3 className="text-sm font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[hsl(var(--primary))]" />
                Advice & Follow-Up Schedule
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-semibold text-[hsl(var(--foreground))] block mb-1">
                    Special Advice & Dietary Recommendations
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g., Low sodium diet, 30 min daily brisk walk, return if pain increases"
                    className="w-full rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] p-2.5 text-xs text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-[hsl(var(--foreground))] block mb-1">
                    Recommended Follow-Up Date
                  </label>
                  <input
                    type="date"
                    value={followUpDate}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="w-full rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] p-2.5 text-xs text-[hsl(var(--foreground))] focus:border-[hsl(var(--primary))] focus:outline-none"
                  />
                  <span className="text-[11px] text-[hsl(var(--muted-foreground))] mt-1 block">
                    Patient will receive a reminder before this date.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
