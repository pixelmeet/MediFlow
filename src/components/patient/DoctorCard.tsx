"use client";

import * as React from "react";
import Link from "next/link";
import { Star, MapPin, Clock, Calendar, ChevronRight, Languages, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DoctorDTO } from "@/lib/services/DoctorService";

interface DoctorCardProps {
  doctor: DoctorDTO;
}

export function DoctorCard({ doctor }: DoctorCardProps) {
  return (
    <div className="group rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-5 shadow-[var(--shadow-sm)] transition-all hover:border-[hsl(var(--primary)/0.4)] hover:shadow-[var(--shadow)] flex flex-col justify-between">
      <div>
        {/* Top Header: Avatar, Name, Specialty, Rating */}
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-[hsl(var(--primary-light))] text-[hsl(var(--primary))] font-bold text-lg border border-[hsl(var(--primary)/0.2)]">
            {doctor.name.replace("Dr. ", "").slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-bold text-base text-[hsl(var(--foreground))] truncate group-hover:text-[hsl(var(--primary))] transition-colors">
                {doctor.name}
              </h3>
              <div className="flex items-center gap-1 bg-[hsl(var(--warning-light))] px-2 py-0.5 rounded-[var(--radius-full)] text-xs font-semibold text-[hsl(var(--warning))] shrink-0">
                <Star className="h-3.5 w-3.5 fill-current" />
                <span>{doctor.averageRating}</span>
              </div>
            </div>
            <p className="text-xs font-medium text-[hsl(var(--primary))] mt-0.5">
              {doctor.specialty}
            </p>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5 line-clamp-1">
              {doctor.qualifications || "Senior Specialist"}
            </p>
          </div>
        </div>

        {/* Info Grid: Experience, Fee, Languages, Branch */}
        <div className="mt-4 pt-3 border-t border-[hsl(var(--border))] grid grid-cols-2 gap-2.5 text-xs text-[hsl(var(--muted-foreground))]">
          <div className="flex items-center gap-1.5">
            <Award className="h-3.5 w-3.5 text-[hsl(var(--foreground)/0.6)]" />
            <span>{doctor.experience ? `${doctor.experience} yrs exp.` : "10+ yrs exp."}</span>
          </div>
          <div className="flex items-center gap-1.5 font-semibold text-[hsl(var(--foreground))]">
            <span>₹{doctor.fee}</span>
            <span className="font-normal text-[hsl(var(--muted-foreground))]">/ consult</span>
          </div>
          <div className="flex items-center gap-1.5 truncate col-span-2">
            <MapPin className="h-3.5 w-3.5 text-[hsl(var(--foreground)/0.6)] shrink-0" />
            <span className="truncate">{doctor.branch.name}</span>
          </div>
          <div className="flex items-center gap-1.5 truncate col-span-2">
            <Languages className="h-3.5 w-3.5 text-[hsl(var(--foreground)/0.6)] shrink-0" />
            <span className="truncate">{doctor.language.join(", ")}</span>
          </div>
        </div>
      </div>

      {/* Footer: Next Available Slot & Action CTA */}
      <div className="mt-5 pt-3 border-t border-[hsl(var(--border))] flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-xs font-medium text-[hsl(var(--success))] bg-[hsl(var(--success-light))] px-2.5 py-1 rounded-[var(--radius-full)]">
          <Clock className="h-3 w-3" />
          <span>{doctor.nextAvailableSlot || "Available Today"}</span>
        </div>

        <Link href={`/patient/doctor/${doctor.id}`}>
          <Button size="sm" className="flex items-center gap-1 text-xs">
            <Calendar className="h-3.5 w-3.5" />
            Book Slot
            <ChevronRight className="h-3 w-3" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
