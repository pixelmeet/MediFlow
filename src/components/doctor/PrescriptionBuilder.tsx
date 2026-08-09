"use client";

import * as React from "react";
import { Plus, Trash2, Pill } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PrescriptionItemInput } from "@/lib/validation/consultation";

interface PrescriptionBuilderProps {
  items: PrescriptionItemInput[];
  onChange: (items: PrescriptionItemInput[]) => void;
}

const FREQUENCY_OPTIONS = [
  { label: "1-0-1 (Twice daily)", value: "1-0-1" },
  { label: "1-1-1 (Thrice daily)", value: "1-1-1" },
  { label: "1-0-0 (Morning only)", value: "1-0-0" },
  { label: "0-0-1 (Bedtime only)", value: "0-0-1" },
  { label: "Once daily", value: "Once daily" },
  { label: "SOS (As needed)", value: "SOS" },
];

export function PrescriptionBuilder({ items, onChange }: PrescriptionBuilderProps) {
  const handleAddItem = () => {
    const newItem: PrescriptionItemInput = {
      medicineName: "",
      dosage: "500mg",
      frequency: "1-0-1",
      duration: "5 Days",
      instructions: "After food",
    };
    onChange([...items, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof PrescriptionItemInput, value: string) => {
    const updated = items.map((item, i) => (i === index ? { ...item, [field]: value } : item));
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
            <Pill className="h-4 w-4 text-[hsl(var(--primary))]" />
            Digital Prescription Builder
          </h4>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
            Add medications, dosages, frequency, and instructions.
          </p>
        </div>

        <Button
          type="button"
          size="sm"
          onClick={handleAddItem}
          className="text-xs flex items-center gap-1 font-semibold"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Medicine
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-[var(--radius-xl)] border-2 border-dashed border-[hsl(var(--border))] p-6 text-center text-xs text-[hsl(var(--muted-foreground))]">
          <Pill className="h-6 w-6 mx-auto mb-2 text-[hsl(var(--muted-foreground)/0.5)]" />
          No medications added yet. Click &quot;Add Medicine&quot; above to prescribe drugs.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="p-4 rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] shadow-[var(--shadow-sm)] space-y-3"
            >
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-[hsl(var(--border))] text-xs font-bold text-[hsl(var(--foreground))]">
                <span>Medicine #{idx + 1}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveItem(idx)}
                  className="p-1 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--danger))] rounded hover:bg-[hsl(var(--danger-light))]"
                  title="Remove medicine"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                {/* Medicine Name */}
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))] block mb-1">
                    Medicine Name & Form
                  </label>
                  <input
                    type="text"
                    value={item.medicineName}
                    onChange={(e) => handleItemChange(idx, "medicineName", e.target.value)}
                    placeholder="e.g., Tab. Amoxicillin, Syrup Paracetamol"
                    className="w-full rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] p-2 text-xs text-[hsl(var(--foreground))] focus:border-[hsl(var(--primary))] focus:outline-none"
                  />
                </div>

                {/* Dosage */}
                <div>
                  <label className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))] block mb-1">
                    Dosage
                  </label>
                  <input
                    type="text"
                    value={item.dosage}
                    onChange={(e) => handleItemChange(idx, "dosage", e.target.value)}
                    placeholder="e.g., 500mg, 1 tablet"
                    className="w-full rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] p-2 text-xs text-[hsl(var(--foreground))] focus:border-[hsl(var(--primary))] focus:outline-none"
                  />
                </div>

                {/* Duration */}
                <div>
                  <label className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))] block mb-1">
                    Duration
                  </label>
                  <input
                    type="text"
                    value={item.duration}
                    onChange={(e) => handleItemChange(idx, "duration", e.target.value)}
                    placeholder="e.g., 5 Days, 1 Month"
                    className="w-full rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] p-2 text-xs text-[hsl(var(--foreground))] focus:border-[hsl(var(--primary))] focus:outline-none"
                  />
                </div>

                {/* Frequency */}
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))] block mb-1">
                    Frequency
                  </label>
                  <select
                    value={item.frequency}
                    onChange={(e) => handleItemChange(idx, "frequency", e.target.value)}
                    className="w-full rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] p-2 text-xs text-[hsl(var(--foreground))] focus:border-[hsl(var(--primary))] focus:outline-none"
                  >
                    {FREQUENCY_OPTIONS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Instructions */}
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))] block mb-1">
                    Special Instructions / Food Timing
                  </label>
                  <input
                    type="text"
                    value={item.instructions || ""}
                    onChange={(e) => handleItemChange(idx, "instructions", e.target.value)}
                    placeholder="e.g., After meals with warm water, Before breakfast"
                    className="w-full rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] p-2 text-xs text-[hsl(var(--foreground))] focus:border-[hsl(var(--primary))] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
