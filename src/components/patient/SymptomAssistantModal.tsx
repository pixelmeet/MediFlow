"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Bot,
  Sparkles,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Stethoscope,
  Info,
  RotateCcw,
  PhoneCall,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import type { SymptomAnalysisResult } from "@/lib/services/AiAssistantService";

interface SymptomAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const COMMON_SYMPTOM_CHIPS = [
  "High fever & body chills",
  "Skin itching & red rash",
  "Severe chest pressure",
  "Persistent dry cough & sore throat",
  "Sharp stomach ache & acidity",
  "Severe migraine & blurred vision",
  "Knee joint swelling",
  "Child has fever and vomiting",
];

export function SymptomAssistantModal({ isOpen, onClose }: SymptomAssistantModalProps) {
  const router = useRouter();
  const [symptoms, setSymptoms] = React.useState("");
  const [age, setAge] = React.useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [result, setResult] = React.useState<SymptomAnalysisResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!symptoms.trim() || symptoms.trim().length < 3) {
      setError("Please describe your symptoms in at least 3 characters.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/ai/symptom-checker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symptoms: symptoms.trim(),
          age: age ? parseInt(age, 10) : undefined,
        }),
      });

      const json = await res.json();
      if (res.ok && json.data) {
        setResult(json.data);
      } else {
        setError(json.error?.message || "Failed to analyze symptoms. Please try again.");
      }
    } catch {
      setError("Network error communicating with AI assistant.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setSymptoms("");
    setAge("");
    setResult(null);
    setError(null);
  };

  const handleSelectDepartment = (deptName: string) => {
    onClose();
    router.push(`/patient/search?dept=${encodeURIComponent(deptName)}`);
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="AI Health Triage & Department Guide"
      description="Describe symptoms to identify the appropriate clinical specialty and physician."
      size="lg"
    >
      <div className="space-y-5">
        {!result ? (
          /* ─── Input Form ────────────────────────────────────────── */
          <div className="space-y-4">
            {/* Disclaimer Callout */}
            <div className="rounded-[var(--radius-lg)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-3 flex items-start gap-2.5">
              <Info className="h-4 w-4 text-[hsl(var(--muted-foreground))] shrink-0 mt-0.5" />
              <p className="text-[11px] text-[hsl(var(--muted-foreground))] leading-relaxed font-sans">
                <strong className="text-[hsl(var(--foreground))]">Informational triage only:</strong> This assistant helps navigate hospital departments. It does not provide medical diagnoses or prescribe treatments.
              </p>
            </div>

            {/* Common Symptom Chips */}
            <div>
              <label className="text-xs font-medium text-[hsl(var(--foreground))] mb-1.5 flex items-center gap-1.5 font-sans">
                <Sparkles className="h-3.5 w-3.5 text-[hsl(var(--primary))]" />
                Common Symptoms:
              </label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {COMMON_SYMPTOM_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setSymptoms(chip)}
                    className="text-[11px] px-2.5 py-1 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] hover:border-[hsl(var(--primary))] transition-colors"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Textarea */}
            <div>
              <label htmlFor="symptoms-input" className="text-xs font-medium text-[hsl(var(--foreground))] block mb-1">
                Describe your symptoms <span className="text-[hsl(var(--danger))]">*</span>
              </label>
              <textarea
                id="symptoms-input"
                rows={4}
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                placeholder="E.g., continuous headache and dizziness for the last 2 days..."
                className="w-full rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] p-3 text-xs text-[hsl(var(--foreground))] focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-[hsl(var(--input-focus)/0.4)] focus-visible:border-[hsl(var(--input-focus))] placeholder:text-[hsl(var(--muted-foreground))] transition-colors"
              />
            </div>

            {/* Optional Age */}
            <div className="w-full sm:w-1/3">
              <label htmlFor="patient-age" className="text-xs font-medium text-[hsl(var(--foreground))] block mb-1">
                Patient Age (Optional)
              </label>
              <input
                id="patient-age"
                type="number"
                min="0"
                max="120"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="e.g. 32"
                className="w-full rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-xs text-[hsl(var(--foreground))] focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-[hsl(var(--input-focus)/0.4)] focus-visible:border-[hsl(var(--input-focus))] transition-colors"
              />
            </div>

            {error && (
              <div className="p-3 rounded-[var(--radius-md)] bg-[hsl(var(--danger-light))] border border-[hsl(var(--danger)/0.3)] text-[hsl(var(--danger))] text-xs font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[hsl(var(--border))]">
              <Button variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAnalyze}
                disabled={isAnalyzing || !symptoms.trim()}
                className="font-medium flex items-center gap-1.5 shadow-[var(--shadow-sm)]"
              >
                {isAnalyzing ? (
                  <>
                    <Bot className="h-3.5 w-3.5 animate-spin" />
                    Analyzing Symptoms...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    Analyze & Recommend
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          /* ─── Analysis Results View ─────────────────────────────────── */
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Emergency Alert Banner */}
            {result.isEmergency ? (
              <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--danger)/0.4)] bg-[hsl(var(--danger-light))] p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--danger))] text-white shadow">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-serif text-base font-normal text-[hsl(var(--danger))]">
                      Critical Emergency Notice
                    </h4>
                    <p className="text-xs text-[hsl(var(--danger))] mt-1 font-medium leading-relaxed">
                      {result.emergencyMessage}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-[hsl(var(--danger)/0.2)] flex flex-wrap items-center gap-3">
                  <a
                    href="tel:108"
                    className="inline-flex items-center gap-2 bg-[hsl(var(--danger))] text-white font-medium text-xs px-4 py-2 rounded-[var(--radius-md)] shadow hover:bg-[hsl(var(--danger)/0.9)] transition-colors"
                  >
                    <PhoneCall className="h-3.5 w-3.5" />
                    Call Emergency Ambulance (108 / 911)
                  </a>
                  <span className="text-[11px] text-[hsl(var(--danger))] font-medium">
                    Do not wait for a routine appointment.
                  </span>
                </div>
              </div>
            ) : (
              /* Recommended Specialty Card */
              <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-5 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-lg)] bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] shadow-sm">
                      <Stethoscope className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                        Recommended Specialty
                      </span>
                      <h3 className="font-serif text-xl font-normal text-[hsl(var(--foreground))]">
                        {result.primaryRecommendation.departmentName}
                      </h3>
                      <p className="text-xs font-medium text-[hsl(var(--primary))]">
                        {result.primaryRecommendation.specialty}
                      </p>
                    </div>
                  </div>

                  <span className="rounded-full bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] px-2.5 py-1 text-[11px] font-mono font-medium shrink-0 shadow-sm">
                    {Math.round(result.primaryRecommendation.confidence * 100)}% Match
                  </span>
                </div>

                <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
                  {result.primaryRecommendation.reason}
                </p>

                <div className="pt-2">
                  <Button
                    onClick={() => handleSelectDepartment(result.primaryRecommendation.departmentName)}
                    className="w-full sm:w-auto font-medium text-xs flex items-center justify-center gap-2 shadow-[var(--shadow-sm)]"
                  >
                    Find {result.primaryRecommendation.specialty}s &amp; Book
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}

            {/* Alternative Departments if present */}
            {result.alternativeRecommendations && result.alternativeRecommendations.length > 0 && (
              <div className="space-y-2">
                <h5 className="font-serif text-sm font-normal text-[hsl(var(--foreground))]">
                  Alternative Consultations:
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {result.alternativeRecommendations.map((alt) => (
                    <div
                      key={alt.departmentName}
                      className="p-3 rounded-[var(--radius-lg)] border border-[hsl(var(--border))] bg-[hsl(var(--card))] flex items-center justify-between gap-2"
                    >
                      <div>
                        <p className="text-xs font-medium text-[hsl(var(--foreground))]">{alt.departmentName}</p>
                        <p className="text-[11px] text-[hsl(var(--muted-foreground))]">{alt.specialty}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSelectDepartment(alt.departmentName)}
                        className="text-[11px] h-7 px-2"
                      >
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested Questions for Doctor */}
            {result.suggestedQuestionsForDoctor && result.suggestedQuestionsForDoctor.length > 0 && (
              <div className="rounded-[var(--radius-lg)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-3.5 space-y-2">
                <h5 className="text-xs font-medium text-[hsl(var(--foreground))] flex items-center gap-1.5 font-sans">
                  <HelpCircle className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
                  Helpful Questions for Your Doctor:
                </h5>
                <ul className="space-y-1.5 pl-1">
                  {result.suggestedQuestionsForDoctor.map((q, idx) => (
                    <li key={idx} className="text-[11px] text-[hsl(var(--muted-foreground))] flex items-start gap-1.5">
                      <CheckCircle2 className="h-3 w-3 text-[hsl(var(--success))] shrink-0 mt-0.5" />
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Disclaimer Footer */}
            <p className="text-[10px] text-[hsl(var(--muted-foreground))] italic border-t border-[hsl(var(--border))] pt-2">
              {result.disclaimer}
            </p>

            <div className="flex items-center justify-between pt-2 border-t border-[hsl(var(--border))]">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="text-xs flex items-center gap-1 text-[hsl(var(--muted-foreground))]"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Check Another Symptom
              </Button>
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
