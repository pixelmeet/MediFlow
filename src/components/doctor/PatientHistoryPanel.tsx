"use client";

import * as React from "react";
import { User, Heart, AlertTriangle, Calendar, Pill, ChevronDown, ChevronUp, History } from "lucide-react";
import type { PatientHistoryVisitDTO } from "@/lib/services/ConsultationService";

interface PatientHistoryPanelProps {
  patient: {
    id: string;
    name: string;
    gender?: string | null;
    age?: number | null;
    bloodGroup?: string | null;
    allergies?: string[] | null;
  };
  visits: PatientHistoryVisitDTO[];
  isLoadingVisits?: boolean;
}

export function PatientHistoryPanel({
  patient,
  visits,
  isLoadingVisits,
}: PatientHistoryPanelProps) {
  const [expandedVisitId, setExpandedVisitId] = React.useState<string | null>(
    visits[0]?.consultationId || null
  );

  return (
    <div className="space-y-6">
      {/* Patient Vitals & Demographics Card */}
      <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6 shadow-[var(--shadow-sm)] space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] font-serif font-normal text-lg border border-[hsl(var(--border))]">
            <User className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-normal text-[hsl(var(--foreground))]">
              {patient.name}
            </h3>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5 font-sans">
              {patient.gender || "Patient"} • {patient.age ? `${patient.age} yrs` : "Adult"}
            </p>
          </div>
        </div>

        {/* Quick Badges: Blood Group & Allergies */}
        <div className="pt-3 border-t border-[hsl(var(--border))] grid grid-cols-2 gap-2 text-xs font-sans">
          <div className="rounded-[var(--radius-md)] bg-[hsl(var(--background))] border border-[hsl(var(--border))] p-2.5 flex items-center gap-2">
            <Heart className="h-4 w-4 text-[hsl(var(--danger))] shrink-0" />
            <div>
              <span className="text-[10px] uppercase font-medium text-[hsl(var(--muted-foreground))] block">Blood Group</span>
              <strong className="text-xs text-[hsl(var(--foreground))] font-mono">{patient.bloodGroup || "O+"}</strong>
            </div>
          </div>

          <div className="rounded-[var(--radius-md)] bg-[hsl(var(--warning-light))] border border-[hsl(var(--warning)/0.3)] p-2.5 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-[hsl(var(--warning))] shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-medium text-[hsl(var(--warning))] block">Allergies</span>
              <span className="text-xs text-[hsl(var(--foreground))] font-medium truncate block">
                {patient.allergies && patient.allergies.length > 0 ? patient.allergies.join(", ") : "NKDA (None)"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Medical Visit History Accordion */}
      <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6 shadow-[var(--shadow-sm)] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[hsl(var(--border))]">
          <h4 className="font-serif text-base font-normal text-[hsl(var(--foreground))] flex items-center gap-2">
            <History className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
            Medical History & Past Consultations
          </h4>
          <span className="text-xs font-mono text-[hsl(var(--muted-foreground))]">
            {visits.length} Record{visits.length === 1 ? "" : "s"}
          </span>
        </div>

        {isLoadingVisits ? (
          <div className="space-y-3 py-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-20 rounded-[var(--radius-lg)] bg-[hsl(var(--muted))] animate-pulse" />
            ))}
          </div>
        ) : visits.length === 0 ? (
          <div className="text-center py-6 text-xs text-[hsl(var(--muted-foreground))] font-sans">
            No previous consultation records for this patient.
          </div>
        ) : (
          <div className="space-y-3 font-sans">
            {visits.map((visit) => {
              const isExpanded = expandedVisitId === visit.consultationId;

              return (
                <div
                  key={visit.consultationId}
                  className="rounded-[var(--radius-lg)] border border-[hsl(var(--border))] overflow-hidden transition-all text-xs"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedVisitId(isExpanded ? null : visit.consultationId)}
                    className="w-full flex items-center justify-between p-3.5 bg-[hsl(var(--background))] hover:bg-[hsl(var(--muted))] text-left transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2 font-medium text-[hsl(var(--foreground))]">
                        <Calendar className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
                        <span>{visit.date}</span>
                        <span className="font-normal text-[hsl(var(--muted-foreground))]">• {visit.doctorName}</span>
                      </div>
                      <p className="text-[11px] font-medium text-[hsl(var(--foreground))] mt-0.5">
                        {visit.diagnosis}
                      </p>
                    </div>

                    {isExpanded ? <ChevronUp className="h-4 w-4 text-[hsl(var(--muted-foreground))]" /> : <ChevronDown className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />}
                  </button>

                  {isExpanded && (
                    <div className="p-3.5 bg-[hsl(var(--card))] border-t border-[hsl(var(--border))] space-y-2.5">
                      {visit.notes && (
                        <div>
                          <span className="font-medium text-[11px] text-[hsl(var(--muted-foreground))] block">Physician Notes:</span>
                          <p className="text-[11px] text-[hsl(var(--foreground))] mt-0.5 leading-relaxed">{visit.notes}</p>
                        </div>
                      )}

                      {visit.medicines && visit.medicines.length > 0 && (
                        <div>
                          <span className="font-medium text-[11px] text-[hsl(var(--muted-foreground))] block mb-1 flex items-center gap-1">
                            <Pill className="h-3 w-3 text-[hsl(var(--muted-foreground))]" /> Prescribed Medications:
                          </span>
                          <div className="space-y-1">
                            {visit.medicines.map((m, idx) => (
                              <div key={idx} className="flex items-center justify-between bg-[hsl(var(--background))] px-2.5 py-1.5 rounded border border-[hsl(var(--border))] text-[11px]">
                                <strong className="text-[hsl(var(--foreground))] font-medium">{m.name}</strong>
                                <span className="text-[hsl(var(--muted-foreground))] font-mono">{m.frequency} • {m.duration}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
