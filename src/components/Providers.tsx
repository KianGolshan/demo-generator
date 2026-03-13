"use client";

import { ToastProvider } from "./Toast";

/**
 * Client-side providers wrapper for the root layout.
 * Add any future context providers here (e.g. theme, auth state).
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
