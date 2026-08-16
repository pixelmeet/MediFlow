import * as React from "react";
import { AdminNavigation } from "@/components/admin/AdminNavigation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <AdminNavigation />
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {children}
      </div>
    </div>
  );
}
