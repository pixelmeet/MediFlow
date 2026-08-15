"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  Calendar,
  Save,
  AlertCircle,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { ChangePasswordCard } from "@/components/shared/ChangePasswordCard";

interface PatientProfileData {
  id: string;
  userId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  age?: number | null;
  gender?: "MALE" | "FEMALE" | "OTHER" | null;
  bloodGroup?: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-" | null;
}

export default function PatientProfilePage() {
  const { refreshUser, logout } = useAuth();
  const { addToast } = useToast();

  const [profile, setProfile] = React.useState<PatientProfileData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Form states
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [age, setAge] = React.useState<string>("");
  const [gender, setGender] = React.useState<string>("");
  const [bloodGroup, setBloodGroup] = React.useState<string>("");

  const [isSaving, setIsSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  // Fetch initial profile
  React.useEffect(() => {
    let isMounted = true;
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        const res = await fetch("/api/v1/patients/profile");
        const json = await res.json();
        if (!isMounted) return;

        if (res.ok && json.data) {
          const data: PatientProfileData = json.data;
          setProfile(data);
          setName(data.name || "");
          setPhone(data.phone || "");
          setAge(data.age != null ? String(data.age) : "");
          setGender(data.gender || "");
          setBloodGroup(data.bloodGroup || "");
        } else {
          setError(json.error?.message || "Failed to load patient profile.");
        }
      } catch {
        if (isMounted) setError("Network error loading profile.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);

    if (!name.trim()) {
      setSaveError("Name cannot be empty.");
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        name: name.trim(),
        phone: phone.trim() || undefined,
        age: age ? Number(age) : null,
        gender: gender || null,
        bloodGroup: bloodGroup || null,
      };

      const res = await fetch("/api/v1/patients/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (res.ok) {
        setProfile(json.data);
        addToast({
          type: "success",
          title: "Profile Updated",
          description: "Your personal details have been saved successfully.",
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
    <div className="min-h-screen bg-[hsl(var(--background))] pb-16">
      {/* ─── Top Navbar ─────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-[hsl(var(--border))] bg-[hsl(var(--background))] shadow-[var(--shadow-sm)]">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/patient/dashboard">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-lg)] bg-[hsl(var(--primary))] text-white shadow-[var(--shadow-sm)]">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-serif text-lg font-normal text-[hsl(var(--foreground))]">
                My Profile
              </h1>
              <p className="text-xs text-[hsl(var(--muted-foreground))] font-sans">
                Manage personal information &amp; security
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 font-sans">
            <NotificationBell />
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="text-xs flex items-center gap-1.5 font-medium"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* ─── Main Content ───────────────────────────────── */}
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        {isLoading ? (
          <div className="space-y-6 animate-pulse">
            <div className="h-80 rounded-[var(--radius-xl)] bg-[hsl(var(--card))] border border-[hsl(var(--border))]" />
            <div className="h-80 rounded-[var(--radius-xl)] bg-[hsl(var(--card))] border border-[hsl(var(--border))]" />
          </div>
        ) : error ? (
          <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--danger-light))] bg-[hsl(var(--card))] p-8 text-center max-w-md mx-auto">
            <AlertCircle className="h-8 w-8 text-[hsl(var(--danger))] mx-auto mb-2" />
            <h3 className="font-serif text-sm font-normal text-[hsl(var(--foreground))]">{error}</h3>
            <Button
              size="sm"
              onClick={() => window.location.reload()}
              className="mt-4 text-xs font-medium"
            >
              Retry
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 font-sans">
            {/* ── Personal Info Form (7 cols) ── */}
            <div className="lg:col-span-7">
              <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6 sm:p-8 shadow-[var(--shadow-sm)] space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-[hsl(var(--border))]">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-lg)] bg-[hsl(var(--muted))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] font-serif font-normal text-sm shadow-sm">
                    {name ? name.slice(0, 2).toUpperCase() : "PT"}
                  </div>
                  <div>
                    <h2 className="font-serif text-lg font-normal text-[hsl(var(--foreground))]">
                      Personal Information
                    </h2>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] font-sans">
                      Your identity and contact information for clinic records
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-4">
                  {saveError && (
                    <div className="rounded-[var(--radius-lg)] border border-[hsl(var(--danger)/0.3)] bg-[hsl(var(--danger-light))] p-3 text-xs text-[hsl(var(--danger))] flex items-start gap-2.5">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{saveError}</span>
                    </div>
                  )}

                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-medium text-[hsl(var(--foreground))] mb-1.5">
                      Full Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[hsl(var(--muted-foreground))]">
                        <User className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter full name"
                        disabled={isSaving}
                        className="w-full pl-9 pr-3 py-2.5 text-xs rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-[hsl(var(--input-focus)/0.4)] focus-visible:border-[hsl(var(--input-focus))] transition-colors"
                      />
                    </div>
                  </div>

                  {/* Contact Info Grid: Email (Read-only) + Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[hsl(var(--foreground))] mb-1.5">
                        Email Address
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[hsl(var(--muted-foreground))]">
                          <Mail className="h-4 w-4" />
                        </div>
                        <input
                          type="email"
                          value={profile?.email || ""}
                          disabled
                          className="w-full pl-9 pr-3 py-2.5 text-xs rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--muted-foreground))] cursor-not-allowed opacity-75"
                        />
                      </div>
                      <span className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1 block">
                        Account email cannot be changed
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[hsl(var(--foreground))] mb-1.5">
                        Phone Number
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[hsl(var(--muted-foreground))]">
                          <Phone className="h-4 w-4" />
                        </div>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+91 98765 43210"
                          disabled={isSaving}
                          className="w-full pl-9 pr-3 py-2.5 text-xs rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-[hsl(var(--input-focus)/0.4)] focus-visible:border-[hsl(var(--input-focus))] transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Medical Stats: Age, Gender, Blood Group */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                    <div>
                      <label className="block text-xs font-medium text-[hsl(var(--foreground))] mb-1.5">
                        Age (Years)
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[hsl(var(--muted-foreground))]">
                          <Calendar className="h-4 w-4" />
                        </div>
                        <input
                          type="number"
                          value={age}
                          onChange={(e) => setAge(e.target.value)}
                          placeholder="e.g. 32"
                          min={0}
                          max={120}
                          disabled={isSaving}
                          className="w-full pl-9 pr-3 py-2.5 text-xs rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-[hsl(var(--input-focus)/0.4)] focus-visible:border-[hsl(var(--input-focus))] transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[hsl(var(--foreground))] mb-1.5">
                        Gender
                      </label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        disabled={isSaving}
                        className="w-full px-3 py-2.5 text-xs rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-[hsl(var(--input-focus)/0.4)] focus-visible:border-[hsl(var(--input-focus))] transition-colors"
                      >
                        <option value="">Select gender</option>
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[hsl(var(--foreground))] mb-1.5">
                        Blood Group
                      </label>
                      <div className="relative">
                        <select
                          value={bloodGroup}
                          onChange={(e) => setBloodGroup(e.target.value)}
                          disabled={isSaving}
                          className="w-full px-3 py-2.5 text-xs rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-[hsl(var(--input-focus)/0.4)] focus-visible:border-[hsl(var(--input-focus))] transition-colors font-mono"
                        >
                          <option value="">Select blood group</option>
                          <option value="A+">A+</option>
                          <option value="A-">A-</option>
                          <option value="B+">B+</option>
                          <option value="B-">B-</option>
                          <option value="AB+">AB+</option>
                          <option value="AB-">AB-</option>
                          <option value="O+">O+</option>
                          <option value="O-">O-</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <Button
                      type="submit"
                      size="sm"
                      disabled={isSaving || !name.trim()}
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
        )}
      </main>
    </div>
  );
}
