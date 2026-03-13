"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function DemoDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="text-center space-y-4 max-w-md">
        <div className="text-4xl mb-3">✕</div>
        <h1 className="font-display font-bold text-lg text-foreground">
          Failed to load demo
        </h1>
        <p className="text-muted-fg text-sm font-mono">{error.message}</p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button onClick={reset} className="btn-primary text-sm">
            Try again
          </button>
          <Link href="/demos" className="btn-ghost text-sm">
            ← Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
