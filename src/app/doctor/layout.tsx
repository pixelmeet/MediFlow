import * as React from "react";
import { DoctorNavigation } from "@/components/doctor/DoctorNavigation";

export default function DoctorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <DoctorNavigation />
      {children}
    </div>
  );
}
