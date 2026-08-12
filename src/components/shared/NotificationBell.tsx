"use client";

import * as React from "react";
import {
  Bell,
  Check,
  Clock,
  Calendar,
  AlertCircle,
  FileText,
  CreditCard,
  CheckCheck,
  X,
  Stethoscope,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  payload?: Record<string, unknown> | null;
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const fetchNotifications = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/v1/notifications?limit=20");
      const json = await res.json();
      if (res.ok && json.data) {
        setNotifications(json.data.notifications || []);
        setUnreadCount(json.data.unreadCount || 0);
      }
    } catch {
      console.error("Failed to load notifications");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let isMounted = true;
    const run = async () => {
      try {
        const res = await fetch("/api/v1/notifications?limit=20");
        const json = await res.json();
        if (isMounted && res.ok && json.data) {
          setNotifications(json.data.notifications || []);
          setUnreadCount(json.data.unreadCount || 0);
        }
      } catch {
        console.error("Failed to load notifications");
      }
    };
    run();
    const interval = setInterval(run, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Close dropdown on click outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleMarkRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch("/api/v1/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_read", notificationId: id }),
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch {
      console.error("Failed to mark notification read");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch("/api/v1/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_all_read" }),
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch {
      console.error("Failed to mark all read");
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "booking_confirmed":
      case "appointment_rescheduled":
        return <Calendar className="h-4 w-4 text-[hsl(var(--primary))]" />;
      case "queue_alert":
      case "delay_warning":
        return <Clock className="h-4 w-4 text-[hsl(var(--warning))]" />;
      case "consultation_completed":
      case "consultation_started":
        return <Stethoscope className="h-4 w-4 text-[hsl(var(--success))]" />;
      case "prescription_issued":
        return <FileText className="h-4 w-4 text-[hsl(var(--info))]" />;
      case "payment_success":
      case "refund_processed":
        return <CreditCard className="h-4 w-4 text-[hsl(var(--success))]" />;
      default:
        return <AlertCircle className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />;
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diffSec < 60) return "Just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return `${Math.floor(diffHr / 24)}d ago`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        className="relative flex h-9 w-9 items-center justify-center rounded-[var(--radius-lg)] border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--muted)/0.5)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[hsl(var(--danger))] px-1 text-[10px] font-bold text-white shadow-sm animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Drawer */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-[var(--radius-xl)] border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-[var(--shadow-xl)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-[hsl(var(--foreground))]">Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-[hsl(var(--primary-light))] text-[hsl(var(--primary))] px-2 py-0.5 text-[10px] font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllRead}
                  className="text-[11px] h-7 px-2 text-[hsl(var(--primary))] hover:text-[hsl(var(--primary))]"
                >
                  <CheckCheck className="h-3 w-3 mr-1" />
                  Mark all read
                </Button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                aria-label="Close"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-[hsl(var(--border))]">
            {isLoading && notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-[hsl(var(--muted-foreground))]">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="h-8 w-8 text-[hsl(var(--muted-foreground)/0.4)] mx-auto mb-2" />
                <p className="text-xs font-semibold text-[hsl(var(--foreground))]">No notifications yet</p>
                <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">
                  You&apos;ll be notified about your appointments, queue turns, and prescriptions here.
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-3.5 flex items-start gap-3 transition-colors ${
                    !n.isRead ? "bg-[hsl(var(--primary)/0.04)]" : "hover:bg-[hsl(var(--muted)/0.2)]"
                  }`}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[hsl(var(--muted)/0.5)] mt-0.5">
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className={`text-xs font-bold truncate ${!n.isRead ? "text-[hsl(var(--foreground))]" : "text-[hsl(var(--muted-foreground))]"}`}>
                        {n.title}
                      </p>
                      <span className="text-[10px] text-[hsl(var(--muted-foreground))] shrink-0 font-medium">
                        {formatTimeAgo(n.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-[hsl(var(--foreground)/0.8)] mt-0.5 leading-relaxed line-clamp-2">
                      {n.message}
                    </p>
                  </div>
                  {!n.isRead && (
                    <button
                      onClick={(e) => handleMarkRead(n.id, e)}
                      title="Mark as read"
                      className="shrink-0 p-1 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))]"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
