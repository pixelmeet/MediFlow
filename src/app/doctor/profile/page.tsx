"use client";

import * as React from "react";
import {
  Stethoscope,
  GraduationCap,
  Briefcase,
  Languages,
  Image as ImageIcon,
  Save,
  AlertCircle,
  Building2,
  Lock,
  Plus,
  X,
  Clock,
  CreditCard,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { ChangePasswordCard } from "@/components/shared/ChangePasswordCard";

interface DoctorProfileData {
  id: string;
  userId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  specialty: string;
  bio?: string | null;
  qualifications?: string | null;
  experience?: number | null;
  language: string[];
  photoUrl?: string | null;
  fee: number;
  departmentName?: string;
  branchName?: string;
  appointmentDurationMin?: number;
}

const COMMON_LANGUAGES = [
  "English",
  "Hindi",
  "Gujarati",
  "Marathi",
  "Bengali",
  "Tamil",
  "Telugu",
  "Kannada",
  "Malayalam",
  "Punjabi",
];

export default function DoctorProfilePage() {
  const { refreshUser } = useAuth();
  const { addToast } = useToast();

  const [profile, setProfile] = React.useState<DoctorProfileData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Form states
  const [bio, setBio] = React.useState("");
  const [qualifications, setQualifications] = React.useState("");
  const [experience, setExperience] = React.useState<string>("");
  const [languages, setLanguages] = React.useState<string[]>([]);
  const [customLanguage, setCustomLanguage] = React.useState("");
  const [photoUrl, setPhotoUrl] = React.useState("");

  const [isSaving, setIsSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        const res = await fetch("/api/v1/doctors/profile");
        const json = await res.json();
        if (!isMounted) return;

        if (res.ok && json.data) {
          const data: DoctorProfileData = json.data;
          setProfile(data);
          setBio(data.bio || "");
          setQualifications(data.qualifications || "");
          setExperience(data.experience != null ? String(data.experience) : "");
          setLanguages(data.language || ["English", "Hindi"]);
          setPhotoUrl(data.photoUrl || "");
        } else {
          setError(json.error?.message || "Failed to load doctor profile.");
        }
      } catch {
        if (isMounted) setError("Network error loading doctor profile.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleToggleLanguage = (lang: string) => {
    if (languages.includes(lang)) {
      if (languages.length > 1) {
        setLanguages(languages.filter((l) => l !== lang));
      } else {
        addToast({
          type: "warning",
          title: "Language Required",
          description: "Please select at least one consultation language.",
        });
      }
    } else {
      setLanguages([...languages, lang]);
    }
  };

  const handleAddCustomLanguage = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customLanguage.trim();
    if (!trimmed) return;
    if (!languages.some((l) => l.toLowerCase() === trimmed.toLowerCase())) {
      setLanguages([...languages, trimmed]);
    }
    setCustomLanguage("");
  };

  const handleRemoveLanguage = (lang: string) => {
    if (languages.length > 1) {
      setLanguages(languages.filter((l) => l !== lang));
    } else {
      addToast({
        type: "warning",
        title: "Language Required",
        description: "Please select at least one consultation language.",
      });
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setIsSaving(true);

    try {
      const payload = {
        bio: bio.trim() || null,
        qualifications: qualifications.trim() || null,
        experience: experience ? Number(experience) : null,
        language: languages,
        photoUrl: photoUrl.trim() || null,
      };

      const res = await fetch("/api/v1/doctors/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (res.ok) {
        setProfile((prev) => (prev ? { ...prev, ...json.data } : null));
        addToast({
          type: "success",
          title: "Profile Updated",
          description: "Your professional bio and clinical details have been saved.",
        });
        await refreshUser();
      } else {
        const errorMsg = json.error?.message || "Failed to update profile.";
        setSaveError(errorMsg);
        addToast({
          type: "error",
          title: "Update Failed",
          description: errorMsg,
        });
      }
    } catch {
      const errorMsg = "Network error. Please try again.";
      setSaveError(errorMsg);
      addToast({
        type: "error",
        title: "Network Error",
        description: errorMsg,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8 pb-16">
      {/* Page Header */}
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-normal text-[hsl(var(--foreground))] tracking-tight flex items-center gap-2.5">
          <Stethoscope className="h-7 w-7 text-[hsl(var(--primary))]" />
          Doctor Professional Profile
        </h1>
        <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] mt-1 font-sans">
          Manage your clinical biography, qualifications, languages, and account credentials
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-6 animate-pulse">
          <div className="h-44 rounded-[var(--radius-xl)] bg-[hsl(var(--card))] border border-[hsl(var(--border))]" />
          <div className="h-96 rounded-[var(--radius-xl)] bg-[hsl(var(--card))] border border-[hsl(var(--border))]" />
        </div>
      ) : error ? (
        <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--danger-light))] bg-[hsl(var(--card))] p-8 text-center max-w-md mx-auto">
          <AlertCircle className="h-8 w-8 text-[hsl(var(--danger))] mx-auto mb-2" />
          <h3 className="font-serif text-sm font-normal text-[hsl(var(--foreground))]">{error}</h3>
          <Button
            size="sm"
            onClick={() => window.location.reload()}
            className="mt-4 text-xs"
          >
            Retry
          </Button>
        </div>
      ) : (
        <>
          {/* ── Hospital Assignment / Read-Only Parameters Card ── */}
          <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6 sm:p-7 shadow-[var(--shadow-sm)] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[hsl(var(--border))]">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                <h2 className="font-serif text-sm font-normal text-[hsl(var(--foreground))] uppercase tracking-wider">
                  Hospital Assignment &amp; Consultation Parameters
                </h2>
              </div>
              <span className="text-[11px] font-mono text-[hsl(var(--muted-foreground))] bg-[hsl(var(--background))] border border-[hsl(var(--border))] px-2.5 py-0.5 rounded-[var(--radius-full)] inline-flex items-center gap-1">
                <Lock className="h-3 w-3" /> Admin Managed
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-sans">
              <div className="p-3.5 rounded-[var(--radius-lg)] bg-[hsl(var(--background))] border border-[hsl(var(--border))]">
                <span className="text-[10px] uppercase font-medium tracking-wider text-[hsl(var(--muted-foreground))] block mb-1">
                  Physician Name
                </span>
                <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                  {profile?.name}
                </p>
              </div>

              <div className="p-3.5 rounded-[var(--radius-lg)] bg-[hsl(var(--background))] border border-[hsl(var(--border))]">
                <span className="text-[10px] uppercase font-medium tracking-wider text-[hsl(var(--muted-foreground))] block mb-1">
                  Specialty &amp; Branch
                </span>
                <p className="text-sm font-medium text-[hsl(var(--primary))] truncate">
                  {profile?.specialty}
                </p>
                <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">
                  {profile?.branchName || "Main Hospital"}
                </p>
              </div>

              <div className="p-3.5 rounded-[var(--radius-lg)] bg-[hsl(var(--background))] border border-[hsl(var(--border))]">
                <span className="text-[10px] uppercase font-medium tracking-wider text-[hsl(var(--muted-foreground))] flex items-center gap-1 mb-1">
                  <CreditCard className="h-3 w-3 text-[hsl(var(--muted-foreground))]" />
                  Consultation Fee
                </span>
                <p className="text-sm font-mono text-[hsl(var(--foreground))]">
                  ₹{profile?.fee}
                </p>
                <p className="text-[10px] text-[hsl(var(--muted-foreground))]">Per visit</p>
              </div>

              <div className="p-3.5 rounded-[var(--radius-lg)] bg-[hsl(var(--background))] border border-[hsl(var(--border))]">
                <span className="text-[10px] uppercase font-medium tracking-wider text-[hsl(var(--muted-foreground))] flex items-center gap-1 mb-1">
                  <Clock className="h-3 w-3 text-[hsl(var(--muted-foreground))]" />
                  Slot Duration
                </span>
                <p className="text-sm font-mono text-[hsl(var(--foreground))]">
                  {profile?.appointmentDurationMin || 20} Minutes
                </p>
                <p className="text-[10px] text-[hsl(var(--muted-foreground))]">Default session length</p>
              </div>
            </div>

            <p className="text-[11px] text-[hsl(var(--muted-foreground))] italic font-sans">
              Note: Specialty, department assignment, consultation fees, and appointment slot durations are configured by hospital administration.
            </p>
          </div>

          {/* ── Two-Column Grid: Editable Profile (7 cols) + Security (5 cols) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 font-sans">
            {/* ── Editable Profile Form (7 cols) ── */}
            <div className="lg:col-span-7">
              <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6 sm:p-8 shadow-[var(--shadow-sm)] space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-[hsl(var(--border))]">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-lg)] bg-[hsl(var(--muted))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] font-serif font-normal text-sm shadow-sm">
                    <Stethoscope className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-serif text-lg font-normal text-[hsl(var(--foreground))]">
                      Clinical &amp; Public Bio
                    </h2>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      Displayed to patients on doctor directory &amp; booking pages
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-5">
                  {saveError && (
                    <div className="rounded-[var(--radius-lg)] border border-[hsl(var(--danger)/0.3)] bg-[hsl(var(--danger-light))] p-3 text-xs text-[hsl(var(--danger))] flex items-start gap-2.5">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{saveError}</span>
                    </div>
                  )}

                  {/* Bio */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-medium text-[hsl(var(--foreground))]">
                        Professional Biography
                      </label>
                      <span className="text-[10px] font-mono text-[hsl(var(--muted-foreground))]">
                        {bio.length}/1000 characters
                      </span>
                    </div>
                    <textarea
                      rows={4}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Brief overview of clinical expertise, special interests, fellowships, and patient care philosophy..."
                      maxLength={1000}
                      disabled={isSaving}
                      className="w-full p-3 text-xs rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-[hsl(var(--input-focus)/0.4)] focus-visible:border-[hsl(var(--input-focus))] transition-colors leading-relaxed"
                    />
                  </div>

                  {/* Qualifications & Experience Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-[hsl(var(--foreground))] mb-1.5">
                        Medical Qualifications
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[hsl(var(--muted-foreground))]">
                          <GraduationCap className="h-4 w-4" />
                        </div>
                        <input
                          type="text"
                          value={qualifications}
                          onChange={(e) => setQualifications(e.target.value)}
                          placeholder="e.g. MBBS, MD (Medicine), DM (Cardiology), FACC"
                          disabled={isSaving}
                          className="w-full pl-9 pr-3 py-2.5 text-xs rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-[hsl(var(--input-focus)/0.4)] focus-visible:border-[hsl(var(--input-focus))] transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[hsl(var(--foreground))] mb-1.5">
                        Experience (Years)
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[hsl(var(--muted-foreground))]">
                          <Briefcase className="h-4 w-4" />
                        </div>
                        <input
                          type="number"
                          value={experience}
                          onChange={(e) => setExperience(e.target.value)}
                          placeholder="e.g. 12"
                          min={0}
                          max={70}
                          disabled={isSaving}
                          className="w-full pl-9 pr-3 py-2.5 text-xs rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-[hsl(var(--input-focus)/0.4)] focus-visible:border-[hsl(var(--input-focus))] transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Languages Selection */}
                  <div>
                    <label className="block text-xs font-medium text-[hsl(var(--foreground))] mb-1.5">
                      Consultation Languages
                    </label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {COMMON_LANGUAGES.map((lang) => {
                        const isSelected = languages.includes(lang);
                        return (
                          <button
                            key={lang}
                            type="button"
                            onClick={() => handleToggleLanguage(lang)}
                            disabled={isSaving}
                            className={`text-xs px-2.5 py-1 rounded-[var(--radius-md)] font-medium transition-colors border ${
                              isSelected
                                ? "bg-[hsl(var(--primary))] text-white border-[hsl(var(--primary))]"
                                : "bg-[hsl(var(--background))] text-[hsl(var(--foreground))] border-[hsl(var(--border))] hover:border-[hsl(var(--primary)/0.4)]"
                            }`}
                          >
                            {lang} {isSelected && "✓"}
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom language input */}
                    <div className="flex items-center gap-2 mt-2">
                      <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[hsl(var(--muted-foreground))]">
                          <Languages className="h-3.5 w-3.5" />
                        </div>
                        <input
                          type="text"
                          value={customLanguage}
                          onChange={(e) => setCustomLanguage(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddCustomLanguage(e);
                            }
                          }}
                          placeholder="Add custom language (e.g. French, German)..."
                          disabled={isSaving}
                          className="w-full pl-9 pr-3 py-1.5 text-xs rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-[hsl(var(--input-focus)/0.4)] focus-visible:border-[hsl(var(--input-focus))] transition-colors"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddCustomLanguage}
                        disabled={!customLanguage.trim() || isSaving}
                        className="text-xs font-medium"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Add
                      </Button>
                    </div>

                    {/* Selected languages pills */}
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      <span className="text-[10px] uppercase font-mono text-[hsl(var(--muted-foreground))] mr-1 self-center">
                        Active:
                      </span>
                      {languages.map((lang) => (
                        <span
                          key={lang}
                          className="inline-flex items-center gap-1 text-[11px] font-medium bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] px-2.5 py-0.5 rounded-[var(--radius-full)]"
                        >
                          {lang}
                          <button
                            type="button"
                            onClick={() => handleRemoveLanguage(lang)}
                            className="hover:text-[hsl(var(--danger))] transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Profile Photo URL */}
                  <div>
                    <label className="block text-xs font-medium text-[hsl(var(--foreground))] mb-1.5">
                      Doctor Photo URL (Optional)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[hsl(var(--muted-foreground))]">
                        <ImageIcon className="h-4 w-4" />
                      </div>
                      <input
                        type="url"
                        value={photoUrl}
                        onChange={(e) => setPhotoUrl(e.target.value)}
                        placeholder="https://images.unsplash.com/photo-..."
                        disabled={isSaving}
                        className="w-full pl-9 pr-3 py-2.5 text-xs rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-[hsl(var(--input-focus)/0.4)] focus-visible:border-[hsl(var(--input-focus))] transition-colors"
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <Button
                      type="submit"
                      size="sm"
                      disabled={isSaving}
                      className="text-xs font-medium flex items-center gap-1.5 shadow-[var(--shadow-sm)]"
                    >
                      <Save className="h-3.5 w-3.5" />
                      {isSaving ? "Saving Changes..." : "Save Profile Details"}
                    </Button>
                  </div>
                </form>
              </div>
            </div>

            {/* ── Security & Change Password (5 cols) ── */}
            <div className="lg:col-span-5">
              <ChangePasswordCard />
            </div>
          </div>
        </>
      )}
    </main>
  );
}
