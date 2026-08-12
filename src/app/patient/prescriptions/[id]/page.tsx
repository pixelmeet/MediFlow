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
          <h2 className="text-lg font-bold text-[hsl(var(--foreground))]">Unable to Load Prescription</h2>
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
      <header className="print:hidden sticky top-0 z-40 border-b border-[hsl(var(--border))] bg-[hsl(var(--background)/0.8)] backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <Link href="/patient/prescriptions" className="flex items-center gap-1.5 text-xs font-bold text-[hsl(var(--foreground))] hover:text-[hsl(var(--primary))] transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Prescriptions
          </Link>

          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrint}
              size="sm"
              className="text-xs font-bold flex items-center gap-1.5 shadow-[var(--shadow-sm)]"
            >
              <Printer className="h-3.5 w-3.5" />
              Print / Save PDF
            </Button>
          </div>
        </div>
      </header>

      {/* ─── Prescription Document (Printable Sheet) ───────── */}
      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-6 sm:py-8">
        <div className="bg-white text-slate-900 border border-slate-200 rounded-[var(--radius-xl)] shadow-lg p-6 sm:p-10 space-y-6 print:border-none print:shadow-none print:p-0">
          {/* Hospital Header & Letterhead */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b-2 border-slate-800 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-700 text-white font-bold">
                  <Activity className="h-5 w-5" />
                </div>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                  MediFlow Healthcare
                </h1>
              </div>
              <p className="text-xs text-slate-600 font-medium">
                {prescription.doctor.branchName} • Center for Advanced Patient Care
              </p>
              <p className="text-[11px] text-slate-500 font-mono">
                Emergency Hotline: +91 1800-200-MED • Email: care@mediflow.in
              </p>
            </div>

            <div className="text-left sm:text-right space-y-1">
              <span className="inline-block bg-teal-100 text-teal-800 font-mono text-xs font-extrabold px-2.5 py-1 rounded">
                {prescription.prescriptionNumber}
              </span>
              <p className="text-xs text-slate-600 font-medium">
                Date: <span className="font-bold text-slate-900">{prescription.date}</span>
              </p>
              <p className="text-xs text-slate-600">
                Token: <span className="font-bold text-slate-900">{prescription.tokenNumber}</span>
              </p>
            </div>
          </div>

          {/* Doctor & Patient Two-Column Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
            {/* Doctor Info */}
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-800 block">
                Prescribing Physician
              </span>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-1.5">
                <Stethoscope className="h-4 w-4 text-teal-700" />
                {prescription.doctor.name}
              </h3>
              <p className="text-xs font-semibold text-slate-700">
                {prescription.doctor.specialty}
              </p>
              <p className="text-[11px] text-slate-500">
                {prescription.doctor.qualifications || "MBBS, MD"} • Reg No: MED-{prescription.doctor.id.slice(-4).toUpperCase()}
              </p>
            </div>

            {/* Patient Info */}
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-800 block">
                Patient Details
              </span>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-1.5">
                <User className="h-4 w-4 text-teal-700" />
                {prescription.patient.name}
              </h3>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-700 font-medium">
                {prescription.patient.age && <span>Age: {prescription.patient.age} yrs</span>}
                {prescription.patient.gender && <span>Gender: {prescription.patient.gender}</span>}
                {prescription.patient.bloodGroup && (
                  <span className="bg-red-50 text-red-700 px-1.5 py-0.5 rounded text-[11px] font-bold">
                    Blood: {prescription.patient.bloodGroup}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Clinical Findings & Diagnosis */}
          <div className="space-y-2 border-b border-slate-200 pb-5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 block">
              Clinical Assessment &amp; Diagnosis
            </span>
            <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg">
              <p className="text-sm font-bold text-slate-900">
                {prescription.clinicalSummary.diagnosis}
              </p>
            </div>
            {prescription.clinicalSummary.notes && (
              <p className="text-xs text-slate-600 mt-2 italic">
                <strong>Doctor Notes:</strong> {prescription.clinicalSummary.notes}
              </p>
            )}
          </div>

          {/* Rx Medications Table */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-serif font-black text-teal-800">℞</span>
              <h4 className="text-sm font-extrabold uppercase tracking-wide text-slate-900">
                Prescribed Medication &amp; Dosage Schedule
              </h4>
            </div>

            {prescription.items && prescription.items.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-300 bg-slate-100 text-slate-700">
                      <th className="py-2.5 px-3 font-bold w-10">#</th>
                      <th className="py-2.5 px-3 font-bold">Medicine Name</th>
                      <th className="py-2.5 px-3 font-bold">Dosage</th>
                      <th className="py-2.5 px-3 font-bold">Duration</th>
                      <th className="py-2.5 px-3 font-bold">Instructions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {prescription.items.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-slate-50">
                        <td className="py-3 px-3 font-mono font-bold text-slate-500">{idx + 1}</td>
                        <td className="py-3 px-3 font-bold text-slate-900">{item.medicine}</td>
                        <td className="py-3 px-3 font-semibold text-teal-800">{item.dose || "As directed"}</td>
                        <td className="py-3 px-3 text-slate-700">{item.duration || "Course"}</td>
                        <td className="py-3 px-3 text-slate-600 italic">{item.instructions || "After meals"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 rounded-lg">
                No pharmaceuticals prescribed. Rest and observation advised.
              </div>
            )}
          </div>

          {/* Follow-up & Advice */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-200 pt-5">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                Next Follow-Up Date
              </span>
              <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-teal-700" />
                {prescription.clinicalSummary.followUpDate || "SOS / As needed if symptoms persist"}
              </p>
            </div>

            <div className="text-left sm:text-right space-y-2 pt-4 sm:pt-0">
              <div className="inline-block text-center border-t border-slate-400 pt-2 px-6">
                <p className="text-xs font-extrabold text-slate-900">{prescription.doctor.name}</p>
                <p className="text-[10px] text-slate-500">Digitally Verified Signature</p>
                <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-teal-700 font-bold">
                  <CheckCircle2 className="h-3 w-3" /> MediFlow Verified Rx
                </div>
              </div>
            </div>
          </div>

          {/* Legal Footer */}
          <div className="border-t border-slate-200 pt-4 text-center text-[10px] text-slate-400 space-y-0.5">
            <p>This is a computer-generated digital prescription generated under MediFlow Smart Hospital Platform.</p>
            <p>Dispensation of Schedule H / X drugs requires valid identification and doctor authorization.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
