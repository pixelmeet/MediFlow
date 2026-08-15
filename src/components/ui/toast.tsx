"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react";

// ─── Toast Types ─────────────────────────────────────────

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

// ─── Toast Context ───────────────────────────────────────

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

// ─── Toast Provider ──────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const addToast = React.useCallback((toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);

    // Auto-remove after duration
    const duration = toast.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

// ─── Toast Container ─────────────────────────────────────

function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: Toast[];
  onRemove: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full font-sans"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

// ─── Toast Item ──────────────────────────────────────────

const toastIcons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="h-4 w-4" />,
  error: <AlertCircle className="h-4 w-4" />,
  warning: <AlertTriangle className="h-4 w-4" />,
  info: <Info className="h-4 w-4" />,
};

const toastStyles: Record<ToastType, string> = {
  success: "border-[hsl(var(--success)/0.3)] bg-[hsl(var(--success-light))] text-[hsl(var(--success))]",
  error: "border-[hsl(var(--danger)/0.3)] bg-[hsl(var(--danger-light))] text-[hsl(var(--danger))]",
  warning: "border-[hsl(var(--warning)/0.3)] bg-[hsl(var(--warning-light))] text-[hsl(var(--warning))]",
  info: "border-[hsl(var(--info)/0.3)] bg-[hsl(var(--info-light))] text-[hsl(var(--info))]",
};

function ToastItem({
  toast,
  onRemove,
}: {
  toast: Toast;
  onRemove: (id: string) => void;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-[var(--radius-lg)] border p-4 shadow-[var(--shadow-md)] bg-[hsl(var(--card))]",
        toastStyles[toast.type]
      )}
      role="alert"
    >
      <div className="shrink-0 mt-0.5">{toastIcons[toast.type]}</div>
      <div className="flex-1 min-w-0">
        <p className="font-serif text-sm font-normal text-[hsl(var(--foreground))]">{toast.title}</p>
        {toast.description && (
          <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">{toast.description}</p>
        )}
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className="shrink-0 rounded-full p-0.5 hover:bg-black/10 transition-colors text-[hsl(var(--muted-foreground))]"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
