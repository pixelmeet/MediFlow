"use client";

import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export default function AdminOverviewPage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] p-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">
              Admin Overview
            </h1>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
              Welcome{user?.name ? `, ${user.name}` : ""}
            </p>
          </div>
          <Button variant="outline" onClick={() => logout()}>
            Sign Out
          </Button>
        </div>
        <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6">
          <p className="text-[hsl(var(--muted-foreground))]">
            Hospital KPIs and operational controls will appear here in the next phase.
          </p>
        </div>
      </div>
    </div>
  );
}
