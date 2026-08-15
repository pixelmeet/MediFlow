"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DoctorFilterBarProps {
  specialties: string[];
  branches: { id: string; name: string }[];
  selectedSpecialty?: string;
  selectedBranchId?: string;
  selectedMaxFee?: number;
  selectedLanguage?: string;
  onSpecialtyChange: (specialty?: string) => void;
  onBranchChange: (branchId?: string) => void;
  onMaxFeeChange: (maxFee?: number) => void;
  onLanguageChange: (lang?: string) => void;
  onClearFilters: () => void;
}

export function DoctorFilterBar({
  specialties,
  branches,
  selectedSpecialty,
  selectedBranchId,
  selectedMaxFee,
  selectedLanguage,
  onSpecialtyChange,
  onBranchChange,
  onMaxFeeChange,
  onLanguageChange,
  onClearFilters,
}: DoctorFilterBarProps) {
  const hasActiveFilters = Boolean(
    selectedSpecialty || selectedBranchId || selectedMaxFee || selectedLanguage
  );

  return (
    <div className="space-y-4 mb-6">
      {/* Horizontal specialty chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => onSpecialtyChange(undefined)}
          className={`shrink-0 rounded-[var(--radius-full)] px-3.5 py-1.5 text-xs font-medium transition-all ${
            !selectedSpecialty
              ? "bg-[hsl(var(--primary))] text-white shadow-[var(--shadow-sm)]"
              : "bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:border-[hsl(var(--primary)/0.4)]"
          }`}
        >
          All Specialties
        </button>
        {specialties.map((spec) => (
          <button
            key={spec}
            onClick={() => onSpecialtyChange(selectedSpecialty === spec ? undefined : spec)}
            className={`shrink-0 rounded-[var(--radius-full)] px-3.5 py-1.5 text-xs font-medium transition-all ${
              selectedSpecialty === spec
                ? "bg-[hsl(var(--primary))] text-white shadow-[var(--shadow-sm)]"
                : "bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:border-[hsl(var(--primary)/0.4)]"
            }`}
          >
            {spec}
          </button>
        ))}
      </div>

      {/* Secondary filter selectors (Branch, Fee, Language, Clear) */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Branch Filter */}
        <select
          value={selectedBranchId || ""}
          onChange={(e) => onBranchChange(e.target.value || undefined)}
          className="rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-1.5 text-xs font-medium text-[hsl(var(--foreground))] focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-[hsl(var(--input-focus)/0.4)] focus-visible:border-[hsl(var(--input-focus))] transition-colors"
        >
          <option value="">All Hospital Branches</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>

        {/* Max Fee Filter */}
        <select
          value={selectedMaxFee?.toString() || ""}
          onChange={(e) => onMaxFeeChange(e.target.value ? Number(e.target.value) : undefined)}
          className="rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-1.5 text-xs font-medium text-[hsl(var(--foreground))] focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-[hsl(var(--input-focus)/0.4)] focus-visible:border-[hsl(var(--input-focus))] transition-colors"
        >
          <option value="">Any Consultation Fee</option>
          <option value="600">Up to ₹600</option>
          <option value="800">Up to ₹800</option>
          <option value="1000">Up to ₹1000</option>
        </select>

        {/* Language Filter */}
        <select
          value={selectedLanguage || ""}
          onChange={(e) => onLanguageChange(e.target.value || undefined)}
          className="rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-1.5 text-xs font-medium text-[hsl(var(--foreground))] focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-[hsl(var(--input-focus)/0.4)] focus-visible:border-[hsl(var(--input-focus))] transition-colors"
        >
          <option value="">Any Language</option>
          <option value="English">English</option>
          <option value="Hindi">Hindi</option>
          <option value="Gujarati">Gujarati</option>
          <option value="Marathi">Marathi</option>
          <option value="Bengali">Bengali</option>
          <option value="Tamil">Tamil</option>
        </select>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="text-xs text-[hsl(var(--danger))] hover:bg-[hsl(var(--danger-light))] hover:text-[hsl(var(--danger))] h-8 px-2.5 flex items-center gap-1"
          >
            <X className="h-3.5 w-3.5" />
            Clear Filters
          </Button>
        )}
      </div>
    </div>
  );
}
