"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
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
    <html lang="en" className="dark">
      <body className="antialiased">
        <div className="min-h-screen flex items-center justify-center px-6">
          <div className="text-center space-y-4 max-w-md">
            <div className="text-5xl mb-4">⚠</div>
            <h1 className="font-display font-bold text-xl text-foreground">
              Something went wrong
            </h1>
            <p className="text-muted-fg text-sm font-mono">{error.message}</p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button onClick={reset} className="btn-primary text-sm">
                Try again
              </button>
              <Link href="/demos" className="btn-ghost text-sm">
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
