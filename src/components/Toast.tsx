"use client";

import { createContext, useCallback, useContext, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastType = "success" | "error" | "info";

export interface Toast {
  id:      string;
  message: string;
  type:    ToastType;
}

interface ToastContextValue {
  toasts: Toast[];
  toast:  (message: string, type?: ToastType, durationMs?: number) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue>({
  toasts: [],
  toast:  () => {},
});

/**
 * Provides the toast system to all client components in the tree.
 * Wrap the root layout's children with this.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback(
    (message: string, type: ToastType = "info", durationMs = 4000) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(
        () => setToasts((prev) => prev.filter((t) => t.id !== id)),
        durationMs
      );
    },
    []
  );

  return (
    <ToastContext.Provider value={{ toasts, toast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={(id) =>
        setToasts((prev) => prev.filter((t) => t.id !== id))
      } />
    </ToastContext.Provider>
  );
}

/**
 * Returns the `toast(message, type?)` function for triggering notifications.
 */
export function useToast() {
  return useContext(ToastContext).toast;
}

// ─── Container ────────────────────────────────────────────────────────────────

const TYPE_STYLES: Record<ToastType, { bar: string; icon: string }> = {
  success: { bar: "bg-success",  icon: "✓" },
  error:   { bar: "bg-danger",   icon: "✕" },
  info:    { bar: "bg-accent",   icon: "·" },
};

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts:    Toast[];
  onDismiss: (id: string) => void;
}) {
  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => {
        const s = TYPE_STYLES[t.type];
        return (
          <div
            key={t.id}
            className="pointer-events-auto flex items-center gap-3 glass-card px-4 py-3 shadow-xl min-w-64 max-w-sm animate-fade-up"
            style={{ animationFillMode: "both" }}
          >
            {/* Color bar */}
            <div className={`w-1 self-stretch rounded-full shrink-0 ${s.bar}`} />
            {/* Icon */}
            <span className={`text-sm font-bold shrink-0 ${
              t.type === "success" ? "text-success" :
              t.type === "error"   ? "text-danger"  : "text-accent"
            }`}>
              {s.icon}
            </span>
            {/* Message */}
            <p className="text-sm font-mono text-foreground flex-1 leading-snug">
              {t.message}
            </p>
            {/* Dismiss */}
            <button
              onClick={() => onDismiss(t.id)}
              className="text-muted-fg hover:text-foreground transition-colors text-xs shrink-0"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
