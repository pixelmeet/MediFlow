"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Stethoscope, LayoutDashboard, Calendar, User, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/shared/NotificationBell";

const NAV_LINKS = [
  { href: "/doctor/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/doctor/schedule", label: "Schedule", icon: Calendar },
  { href: "/doctor/profile", label: "Profile", icon: User },
];

export function DoctorNavigation() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[hsl(var(--border))] bg-[hsl(var(--background))] shadow-[var(--shadow-sm)]">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand & Doctor Badge */}
        <div className="flex items-center gap-3">
          <Link href="/doctor/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-lg)] bg-[hsl(var(--primary))] text-white shadow-[var(--shadow-sm)]">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <span className="font-serif text-xl font-normal tracking-tight text-[hsl(var(--foreground))]">
                MediFlow
              </span>
              <span className="ml-2 text-[10px] font-mono font-medium uppercase bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] px-2 py-0.5 rounded-[var(--radius-sm)]">
                Doctor
              </span>
            </div>
          </Link>
        </div>

        {/* Desktop Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1.5">
          {NAV_LINKS.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || (link.href !== "/doctor/dashboard" && pathname.startsWith(link.href));

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-[var(--radius-md)] text-xs font-medium transition-colors ${
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

          <Link href="/doctor/profile" className="hidden sm:block text-right text-xs hover:opacity-80 transition-opacity">
            <p className="font-medium text-[hsl(var(--foreground))]">{user?.name || "Doctor"}</p>
            <p className="text-[10px] text-[hsl(var(--muted-foreground))]">Clinical Station</p>
          </Link>

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
            className="md:hidden p-2 rounded-[var(--radius-md)] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Sheet */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-16 bottom-0 z-50 bg-[hsl(var(--background))] border-t border-[hsl(var(--border))] p-6 flex flex-col justify-between animate-fade-in">
          <div className="space-y-3">
            <div className="pb-3 border-b border-[hsl(var(--border))]">
              <p className="font-serif text-lg font-normal text-[hsl(var(--foreground))]">{user?.name || "Doctor"}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Clinical Station</p>
            </div>

            {NAV_LINKS.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-4 py-3 rounded-[var(--radius-md)] text-sm font-medium transition-colors ${
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

          <div className="pt-6 border-t border-[hsl(var(--border))]">
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
