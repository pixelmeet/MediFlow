"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Stethoscope, LayoutDashboard, Calendar, User, LogOut, Menu, X } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
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
  const shouldReduceMotion = useReducedMotion();

  const hamburgerButtonRef = React.useRef<HTMLButtonElement>(null);
  const drawerRef = React.useRef<HTMLDivElement>(null);

  // Focus on route change: Shift focus to main heading or landmark for screen readers
  React.useEffect(() => {
    const timer = setTimeout(() => {
      const h1 = document.querySelector("main h1");
      if (h1 && h1 instanceof HTMLElement) {
        h1.setAttribute("tabIndex", "-1");
        h1.focus({ preventScroll: true });
      } else {
        const main = document.getElementById("main-content") || document.querySelector("main");
        if (main && main instanceof HTMLElement) {
          main.setAttribute("tabIndex", "-1");
          main.focus({ preventScroll: true });
        }
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [pathname]);

  // Trap focus and handle Escape key for mobile drawer
  React.useEffect(() => {
    if (!mobileMenuOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setMobileMenuOpen(false);
        hamburgerButtonRef.current?.focus();
        return;
      }

      if (e.key === "Tab" && drawerRef.current) {
        const focusableElements = drawerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    // Initial focus into drawer
    const timer = setTimeout(() => {
      if (drawerRef.current) {
        const firstFocusable = drawerRef.current.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        firstFocusable?.focus();
      }
    }, 50);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timer);
    };
  }, [mobileMenuOpen]);

  const handleCloseDrawer = () => {
    setMobileMenuOpen(false);
    hamburgerButtonRef.current?.focus();
  };

  const currentNav = NAV_LINKS.find(
    (link) => pathname === link.href || (link.href !== "/doctor/dashboard" && pathname.startsWith(link.href))
  );

  return (
    <>
      {/* ─── Desktop Left Sidebar (≥1024px) ─────────────────────── */}
      <aside
        aria-label="Doctor Navigation Sidebar"
        className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-64 flex-col justify-between border-r border-[hsl(var(--border))] bg-[hsl(var(--background))] shadow-[var(--shadow-sm)]"
      >
        {/* Top: Brand Logo & Doctor Badge */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-[hsl(var(--border))] px-5">
          <Link href="/doctor/dashboard" className="flex items-center gap-2.5 cursor-pointer">
            <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-lg)] bg-[hsl(var(--primary))] text-white shadow-[var(--shadow-sm)]">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <span className="font-serif text-xl font-normal tracking-tight text-[hsl(var(--foreground))]">
                MediFlow
              </span>
              <span className="ml-2 text-[10px] font-mono font-medium uppercase bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] px-1.5 py-0.5 rounded-[var(--radius-sm)]">
                Doctor
              </span>
            </div>
          </Link>
        </div>

        {/* Middle: Navigation Links (Vertical List) */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <p className="px-3 pb-2 text-[10px] font-mono font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
            Clinical Menu
          </p>
          <nav className="flex flex-col gap-2">
            {NAV_LINKS.map((link) => {
              const Icon = link.icon;
              const isActive =
                pathname === link.href || (link.href !== "/doctor/dashboard" && pathname.startsWith(link.href));

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`min-h-[44px] px-3.5 py-2.5 rounded-[var(--radius-md)] text-xs font-medium flex items-center gap-3 transition-colors cursor-pointer ${
                    isActive
                      ? "bg-[hsl(var(--card))] text-[hsl(var(--foreground))] border-l-4 border-l-[hsl(var(--primary))] border-r border-t border-b border-[hsl(var(--card-border))] shadow-[var(--shadow-sm)] font-semibold"
                      : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] border-l-4 border-l-transparent"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-[hsl(var(--primary))]" : ""}`} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom: User Profile & Separated Sign Out */}
        <div className="shrink-0 border-t border-[hsl(var(--border))] p-4 bg-[hsl(var(--card)/0.4)] space-y-3">
          <Link
            href="/doctor/profile"
            className="block px-1 text-xs hover:opacity-85 transition-opacity cursor-pointer"
          >
            <p className="font-medium text-[hsl(var(--foreground))] truncate">{user?.name || "Doctor"}</p>
            <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">Clinical Station</p>
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={logout}
            className="w-full min-h-[44px] text-xs font-medium flex items-center justify-center gap-2 text-[hsl(var(--danger))] border-[hsl(var(--danger)/0.3)] hover:bg-[hsl(var(--danger-light))] cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </Button>
        </div>
      </aside>

      {/* ─── Desktop Top Strip (≥1024px) ────────────────────────── */}
      <header className="hidden lg:flex sticky top-0 z-30 h-16 border-b border-[hsl(var(--border))] bg-[hsl(var(--background))]/95 backdrop-blur-md px-6 sm:px-8 items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
            Clinical /
          </span>
          <span className="text-xs font-medium text-[hsl(var(--foreground))] font-sans">
            {currentNav?.label || "Clinical Console"}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <NotificationBell />
          <div className="h-4 w-px bg-[hsl(var(--border))]" />
          <Link
            href="/doctor/profile"
            className="text-right text-xs hover:opacity-80 transition-opacity cursor-pointer"
          >
            <p className="font-medium text-[hsl(var(--foreground))]">{user?.name || "Doctor"}</p>
            <p className="text-[10px] text-[hsl(var(--muted-foreground))]">Clinical Station</p>
          </Link>
        </div>
      </header>

      {/* ─── Mobile Slim Top Bar (<1024px) ──────────────────────── */}
      <header className="lg:hidden sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 shadow-[var(--shadow-sm)]">
        <div className="flex items-center gap-3">
          <button
            ref={hamburgerButtonRef}
            onClick={() => setMobileMenuOpen(true)}
            className="min-h-[44px] min-w-[44px] p-2.5 rounded-[var(--radius-md)] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors cursor-pointer flex items-center justify-center"
            aria-label="Open Navigation Menu"
            aria-expanded={mobileMenuOpen}
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link href="/doctor/dashboard" className="flex items-center gap-2 cursor-pointer">
            <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] bg-[hsl(var(--primary))] text-white shadow-[var(--shadow-sm)]">
              <Stethoscope className="h-4 w-4" />
            </div>
            <span className="font-serif text-lg font-normal tracking-tight text-[hsl(var(--foreground))]">
              MediFlow
            </span>
            <span className="text-[9px] font-mono font-medium uppercase bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] px-1 py-0.2 rounded-[var(--radius-xs)]">
              Doctor
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <NotificationBell />
        </div>
      </header>

      {/* ─── Mobile Drawer (<1024px) ────────────────────────────── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.2 }}
              onClick={handleCloseDrawer}
              className="lg:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-xs cursor-pointer"
              aria-hidden="true"
            />

            {/* Slide-in Drawer Container */}
            <motion.aside
              ref={drawerRef}
              role="dialog"
              aria-modal="true"
              aria-label="Mobile Navigation Menu"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={
                shouldReduceMotion
                  ? { duration: 0 }
                  : { type: "spring", damping: 25, stiffness: 280 }
              }
              className="lg:hidden fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-[hsl(var(--background))] border-r border-[hsl(var(--border))] shadow-2xl flex flex-col justify-between overflow-y-auto"
            >
              {/* Drawer Top / Header */}
              <div className="flex h-16 shrink-0 items-center justify-between border-b border-[hsl(var(--border))] px-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] bg-[hsl(var(--primary))] text-white">
                    <Stethoscope className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-serif text-lg font-normal text-[hsl(var(--foreground))]">
                      MediFlow
                    </span>
                    <span className="ml-1.5 text-[9px] font-mono font-medium uppercase bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] px-1 py-0.2 rounded-[var(--radius-xs)]">
                      Doctor
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleCloseDrawer}
                  className="min-h-[44px] min-w-[44px] p-2.5 rounded-[var(--radius-md)] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors cursor-pointer flex items-center justify-center"
                  aria-label="Close navigation menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Drawer Middle: Nav Links */}
              <div className="flex-1 overflow-y-auto px-3 py-4">
                <p className="px-3 pb-2 text-[10px] font-mono font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  Clinical Menu
                </p>
                <nav className="flex flex-col gap-2">
                  {NAV_LINKS.map((link) => {
                    const Icon = link.icon;
                    const isActive =
                      pathname === link.href || (link.href !== "/doctor/dashboard" && pathname.startsWith(link.href));

                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`min-h-[44px] px-3.5 py-2.5 rounded-[var(--radius-md)] text-sm font-medium flex items-center gap-3 transition-colors cursor-pointer ${
                          isActive
                            ? "bg-[hsl(var(--card))] text-[hsl(var(--foreground))] border-l-4 border-l-[hsl(var(--primary))] border-r border-t border-b border-[hsl(var(--card-border))] shadow-[var(--shadow-sm)] font-semibold"
                            : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] border-l-4 border-l-transparent"
                        }`}
                        aria-current={isActive ? "page" : undefined}
                      >
                        <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-[hsl(var(--primary))]" : ""}`} />
                        <span>{link.label}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>

              {/* Drawer Bottom: User Info & Sign Out */}
              <div className="shrink-0 border-t border-[hsl(var(--border))] p-4 bg-[hsl(var(--card)/0.4)] space-y-3">
                <div className="px-1 text-xs">
                  <p className="font-medium text-[hsl(var(--foreground))] truncate">{user?.name || "Doctor"}</p>
                  <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">Clinical Station</p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="w-full min-h-[44px] text-xs font-medium flex items-center justify-center gap-2 text-[hsl(var(--danger))] border-[hsl(var(--danger)/0.3)] hover:bg-[hsl(var(--danger-light))] cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </Button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
