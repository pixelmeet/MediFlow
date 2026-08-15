"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Shield,
  LayoutDashboard,
  Stethoscope,
  Building2,
  MapPin,
  Calendar,
  UserCheck,
  Clock,
  LogOut,
  BarChart3,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/shared/NotificationBell";

const NAV_LINKS = [
  { href: "/admin/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/queue", label: "Live Queue", icon: Clock },
  { href: "/admin/checkin", label: "Check-In Desk", icon: UserCheck },
  { href: "/admin/doctors", label: "Doctors", icon: Stethoscope },
  { href: "/admin/departments", label: "Departments", icon: Building2 },
  { href: "/admin/branches", label: "Branches", icon: MapPin },
  { href: "/admin/appointments", label: "Appointments", icon: Calendar },
];

export function AdminNavigation() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[hsl(var(--border))] bg-[hsl(var(--background))] shadow-[var(--shadow-sm)]">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand & Admin Badge */}
        <div className="flex items-center gap-3">
          <Link href="/admin/overview" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-lg)] bg-[hsl(var(--primary))] text-white shadow-[var(--shadow-sm)]">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <span className="font-serif text-xl font-normal tracking-tight text-[hsl(var(--foreground))]">
                MediFlow
              </span>
              <span className="ml-2 text-[10px] font-mono font-medium uppercase bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] px-2 py-0.5 rounded-[var(--radius-sm)]">
                Admin
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation Tabs (Desktop) */}
        <nav className="hidden lg:flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || (link.href !== "/admin/overview" && pathname.startsWith(link.href));

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-[hsl(var(--card))] text-[hsl(var(--foreground))] border border-[hsl(var(--card-border))] shadow-[var(--shadow-sm)]"
                    : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* User Profile, Notifications & Sign Out */}
        <div className="flex items-center gap-3">
          <NotificationBell />

          <div className="hidden sm:block text-right text-xs">
            <p className="font-medium text-[hsl(var(--foreground))]">{user?.name || "Hospital Administrator"}</p>
            <p className="text-[10px] text-[hsl(var(--muted-foreground))]">Central HQ</p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={logout}
            className="hidden sm:flex text-xs items-center gap-1 text-[hsl(var(--danger))] border-[hsl(var(--danger)/0.3)] hover:bg-[hsl(var(--danger-light))]"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </Button>

          {/* Mobile Menu Trigger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-[var(--radius-md)] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Sheet */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-x-0 top-16 bottom-0 z-50 bg-[hsl(var(--background))] border-t border-[hsl(var(--border))] p-6 flex flex-col justify-between animate-fade-in overflow-y-auto">
          <div className="space-y-2">
            <div className="pb-3 mb-2 border-b border-[hsl(var(--border))]">
              <p className="font-serif text-lg font-normal text-[hsl(var(--foreground))]">{user?.name || "Administrator"}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Central Hospital Administration</p>
            </div>

            {NAV_LINKS.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href || (link.href !== "/admin/overview" && pathname.startsWith(link.href));

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-[var(--radius-md)] text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-[hsl(var(--card))] text-[hsl(var(--foreground))] border border-[hsl(var(--card-border))]"
                      : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div className="pt-6 border-t border-[hsl(var(--border))] mt-4">
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                setMobileMenuOpen(false);
                logout();
              }}
              className="w-full flex items-center justify-center gap-2 text-[hsl(var(--danger))] border-[hsl(var(--danger)/0.3)] hover:bg-[hsl(var(--danger-light))]"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
