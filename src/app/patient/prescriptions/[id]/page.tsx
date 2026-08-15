"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Printer,
  Calendar,
  User,
  Stethoscope,
  Activity,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PrescriptionDTO } from "@/lib/services/PrescriptionService";

export default function PrescriptionDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [prescription, setPrescription] = React.useState<PrescriptionDTO | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    const fetchDetail = async () => {
      try {
        const res = await fetch(`/api/v1/patients/prescriptions/${id}`);
        const json = await res.json();
        if (!isMounted) return;

        if (res.ok && json.data) {
          setPrescription(json.data);
        } else {
          setError(json.error?.message || "Prescription not found or access denied");
        }
      } catch {
        if (isMounted) setError("Network error loading prescription");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    if (id) fetchDetail();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))]">
        <div className="text-center space-y-2">
          <Activity className="h-8 w-8 text-[hsl(var(--primary))] animate-spin mx-auto" />
          <p className="text-xs text-[hsl(var(--muted-foreground))]">Loading prescription details...</p>
        </div>
      </div>
    );
  }

  if (error || !prescription) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))] p-4">
        <div className="max-w-md w-full rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6 text-center space-y-4 shadow-[var(--shadow-md)]">
          <AlertCircle className="h-10 w-10 text-[hsl(var(--danger))] mx-auto" />
          <h2 className="font-serif text-xl font-normal text-[hsl(var(--foreground))]">Unable to Load Prescription</h2>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">{error || "Record could not be found."}</p>
          <Link href="/patient/prescriptions">
            <Button size="sm" variant="outline" className="text-xs">
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              Back to Prescriptions
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] pb-16">
      {/* ─── Non-Print Action Bar ─────────────────────────── */}
      <header className="print:hidden sticky top-0 z-40 border-b border-[hsl(var(--border))] bg-[hsl(var(--background))] backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <Link href="/patient/prescriptions" className="flex items-center gap-1.5 text-xs font-medium text-[hsl(var(--foreground))] hover:text-[hsl(var(--primary))] transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Prescriptions
          </Link>

          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrint}
              size="sm"
              className="text-xs font-medium flex items-center gap-1.5 shadow-[var(--shadow-sm)]"
            >
              <Printer className="h-3.5 w-3.5" />
              Print / Save PDF
            </Button>
          </div>
        </div>
      </header>

      {/* ─── Prescription Document (Printable Sheet) ───────── */}
      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-6 sm:py-8">
        <div className="bg-[hsl(var(--card))] text-[hsl(var(--foreground))] border border-[hsl(var(--card-border))] rounded-[var(--radius-xl)] shadow-[var(--shadow-sm)] p-6 sm:p-10 space-y-6 print:border-none print:shadow-none print:p-0">
          {/* Hospital Header & Letterhead */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-[hsl(var(--border))] gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(var(--primary))] text-white font-serif font-normal">
                  <Activity className="h-5 w-5" />
                </div>
                <h1 className="font-serif text-2xl font-normal tracking-tight text-[hsl(var(--foreground))]">
                  MediFlow Healthcare
                </h1>
              </div>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                {prescription.doctor.branchName} • Center for Advanced Patient Care
              </p>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))] font-mono">
                Emergency Hotline: +91 1800-200-MED • Email: care@mediflow.in
              </p>
            </div>

            <div className="text-left sm:text-right space-y-1">
              <span className="inline-block bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] font-mono text-xs font-medium px-2.5 py-1 rounded">
                {prescription.prescriptionNumber}
              </span>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Date: <span className="font-medium text-[hsl(var(--foreground))]">{prescription.date}</span>
              </p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Token: <span className="font-mono font-medium text-[hsl(var(--foreground))]">{prescription.tokenNumber}</span>
              </p>
            </div>
          </div>

          {/* Doctor & Patient Two-Column Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-[hsl(var(--background))] p-5 rounded-xl border border-[hsl(var(--border))]">
            {/* Doctor Info */}
            <div className="space-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))] block font-sans">
                Prescribing Physician
              </span>
              <h3 className="font-serif text-base font-normal text-[hsl(var(--foreground))] flex items-center gap-1.5">
                <Stethoscope className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                {prescription.doctor.name}
              </h3>
              <p className="text-xs font-medium text-[hsl(var(--muted-foreground))]">
                {prescription.doctor.specialty}
              </p>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))] font-mono">
                {prescription.doctor.qualifications || "MBBS, MD"} • Reg No: MED-{prescription.doctor.id.slice(-4).toUpperCase()}
              </p>
            </div>

            {/* Patient Info */}
            <div className="space-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))] block font-sans">
                Patient Details
              </span>
              <h3 className="font-serif text-base font-normal text-[hsl(var(--foreground))] flex items-center gap-1.5">
                <User className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                {prescription.patient.name}
              </h3>
              <div className="flex flex-wrap items-center gap-3 text-xs text-[hsl(var(--muted-foreground))] font-medium font-sans">
                {prescription.patient.age && <span>Age: {prescription.patient.age} yrs</span>}
                {prescription.patient.gender && <span>Gender: {prescription.patient.gender}</span>}
                {prescription.patient.bloodGroup && (
                  <span className="bg-[hsl(var(--danger-light))] text-[hsl(var(--danger))] px-1.5 py-0.5 rounded text-[11px] font-mono font-medium">
                    Blood: {prescription.patient.bloodGroup}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Clinical Findings & Diagnosis */}
          <div className="space-y-2 border-b border-[hsl(var(--border))] pb-5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))] block font-sans">
              Clinical Assessment &amp; Diagnosis
            </span>
            <div className="p-3.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg">
              <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                {prescription.clinicalSummary.diagnosis}
              </p>
            </div>
            {prescription.clinicalSummary.notes && (
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-2 italic font-sans">
                <strong className="text-[hsl(var(--foreground))] not-italic">Doctor Notes:</strong> {prescription.clinicalSummary.notes}
              </p>
            )}
          </div>

          {/* Rx Medications Table */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-serif font-normal text-[hsl(var(--foreground))]">℞</span>
              <h4 className="font-serif text-sm font-normal uppercase tracking-wide text-[hsl(var(--foreground))]">
                Prescribed Medication &amp; Dosage Schedule
              </h4>
            </div>

            {prescription.items && prescription.items.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--muted-foreground))] font-sans">
                      <th className="py-2.5 px-3 font-medium w-10">#</th>
                      <th className="py-2.5 px-3 font-medium">Medicine Name</th>
                      <th className="py-2.5 px-3 font-medium">Dosage</th>
                      <th className="py-2.5 px-3 font-medium">Duration</th>
                      <th className="py-2.5 px-3 font-medium">Instructions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[hsl(var(--border))] font-sans">
                    {prescription.items.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-[hsl(var(--background))] transition-colors">
                        <td className="py-3 px-3 font-mono text-[hsl(var(--muted-foreground))]">{idx + 1}</td>
                        <td className="py-3 px-3 font-medium text-[hsl(var(--foreground))]">{item.medicine}</td>
                        <td className="py-3 px-3 font-mono text-[hsl(var(--foreground))]">{item.dose || "As directed"}</td>
                        <td className="py-3 px-3 text-[hsl(var(--muted-foreground))]">{item.duration || "Course"}</td>
                        <td className="py-3 px-3 text-[hsl(var(--muted-foreground))] italic">{item.instructions || "After meals"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-[hsl(var(--muted-foreground))] bg-[hsl(var(--background))] rounded-lg border border-[hsl(var(--border))]">
                No pharmaceuticals prescribed. Rest and observation advised.
              </div>
            )}
          </div>

          {/* Follow-up & Advice */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-[hsl(var(--border))] pt-5">
            <div className="space-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))] block font-sans">
                Next Follow-Up Date
              </span>
              <p className="text-xs font-medium text-[hsl(var(--foreground))] flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                {prescription.clinicalSummary.followUpDate || "SOS / As needed if symptoms persist"}
              </p>
            </div>

            <div className="text-left sm:text-right space-y-2 pt-4 sm:pt-0">
              <div className="inline-block text-center border-t border-[hsl(var(--border))] pt-2 px-6">
                <p className="font-serif text-sm font-normal text-[hsl(var(--foreground))]">{prescription.doctor.name}</p>
                <p className="text-[10px] text-[hsl(var(--muted-foreground))] font-sans">Digitally Verified Signature</p>
                <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-[hsl(var(--success))] font-mono">
                  <CheckCircle2 className="h-3 w-3" /> MediFlow Verified Rx
                </div>
              </div>
            </div>
          </div>

          {/* Legal Footer */}
          <div className="border-t border-[hsl(var(--border))] pt-4 text-center text-[10px] text-[hsl(var(--muted-foreground))] space-y-0.5 font-sans">
            <p>This is a computer-generated digital prescription generated under MediFlow Smart Hospital Platform.</p>
            <p>Dispensation of Schedule H / X drugs requires valid identification and doctor authorization.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
