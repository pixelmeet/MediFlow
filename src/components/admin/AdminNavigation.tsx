"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, LayoutDashboard, Stethoscope, Building2, MapPin, Calendar, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

const NAV_LINKS = [
  { href: "/admin/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/doctors", label: "Doctors", icon: Stethoscope },
  { href: "/admin/departments", label: "Departments", icon: Building2 },
  { href: "/admin/branches", label: "Branches", icon: MapPin },
  { href: "/admin/appointments", label: "Appointments", icon: Calendar },
];

export function AdminNavigation() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-[var(--shadow-sm)]">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand & Admin Badge */}
        <div className="flex items-center gap-3">
          <Link href="/admin/overview" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-lg)] bg-[hsl(var(--primary))] text-white shadow-[var(--shadow-sm)]">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-[hsl(var(--foreground))]">
                Medi<span className="text-[hsl(var(--primary))]">Flow</span>
              </span>
              <span className="ml-2 text-[10px] font-bold uppercase bg-[hsl(var(--primary-light))] text-[hsl(var(--primary))] px-1.5 py-0.5 rounded">
                Admin
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || (link.href !== "/admin/overview" && pathname.startsWith(link.href));

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-[var(--radius-md)] text-xs font-bold transition-colors ${
                  isActive
                    ? "bg-[hsl(var(--primary))] text-white shadow-[var(--shadow-sm)]"
                    : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/0.3)]"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* User Profile & Sign Out */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-right text-xs">
            <p className="font-bold text-[hsl(var(--foreground))]">{user?.name || "Hospital Administrator"}</p>
            <p className="text-[10px] text-[hsl(var(--muted-foreground))]">Central Hospital HQ</p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={logout}
            className="text-xs flex items-center gap-1 text-[hsl(var(--danger))] border-[hsl(var(--danger)/0.3)] hover:bg-[hsl(var(--danger-light))]"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </div>

      {/* Mobile Navigation Scroll Strip */}
      <div className="md:hidden flex items-center gap-2 overflow-x-auto px-4 py-2 border-t border-[hsl(var(--border))] no-scrollbar">
        {NAV_LINKS.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-1 px-3 py-1 rounded-[var(--radius-md)] text-xs font-bold shrink-0 transition-colors ${
                isActive
                  ? "bg-[hsl(var(--primary))] text-white"
                  : "bg-[hsl(var(--muted)/0.3)] text-[hsl(var(--muted-foreground))]"
              }`}
            >
              <Icon className="h-3 w-3" />
              {link.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
