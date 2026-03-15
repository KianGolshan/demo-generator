"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RenderStatus } from "@/types";

type RenderPanelProps = {
  demoId:       string;
  initialStatus: RenderStatus;
  initialVideoUrl?: string;
};

const POLL_INTERVAL_MS = 2000;

/**
 * Interactive render panel on the demo detail page.
 * - "Render Video" button → POST /api/demos/[id]/render → 202
 * - Polls GET /api/demos/[id]/render/status every 2s while rendering
 * - Shows indeterminate progress bar with elapsed time
 * - On "ready": embedded video player + download button
 * - On "failed": error state with retry button
 *
 * @param demoId        - The demo project ID.
 * @param initialStatus - Server-side renderStatus at page load time.
 * @param initialVideoUrl - Server-side videoUrl if already rendered.
 */
export function RenderPanel({ demoId, initialStatus, initialVideoUrl }: RenderPanelProps) {
  const [status, setStatus]   = useState<RenderStatus>(initialStatus);
  const [videoUrl, setVideoUrl] = useState<string | undefined>(initialVideoUrl);
  const [error, setError]     = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAt  = useRef<number | null>(null);

  // ── Polling ─────────────────────────────────────────────────────────────────

  const stopPolling = useCallback(() => {
    if (pollRef.current)  clearInterval(pollRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    pollRef.current  = null;
    timerRef.current = null;
  }, []);

  const startPolling = useCallback(() => {
    startedAt.current = Date.now();
    setElapsed(0);

    // Elapsed timer — updates every second for UX
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - (startedAt.current ?? Date.now())) / 1000));
    }, 1000);

    // Status poll
    pollRef.current = setInterval(async () => {
      try {
        const res  = await fetch(`/api/demos/${demoId}/render/status`);
        const data = await res.json() as { renderStatus: RenderStatus; videoUrl?: string };

        setStatus(data.renderStatus);

        if (data.renderStatus === "ready") {
          setVideoUrl(data.videoUrl);
          stopPolling();
        } else if (data.renderStatus === "failed") {
          stopPolling();
        }
      } catch {
        // Network hiccup — keep polling
      }
    }, POLL_INTERVAL_MS);
  }, [demoId, stopPolling]);

  // Sync status when server re-renders with updated props (e.g. after router.refresh())
  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  // Start polling automatically if we're already rendering (e.g. page reload mid-render)
  useEffect(() => {
    if (initialStatus === "rendering") startPolling();
    return stopPolling;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Trigger render ────────────────────────────────────────────────────────────

  async function handleRender() {
    setError(null);
    setStatus("rendering");

    try {
      const res = await fetch(`/api/demos/${demoId}/render`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Render failed to start");
      }
      startPolling();
    } catch (err) {
      setStatus("failed");
      setError(err instanceof Error ? err.message : "Failed to start render");
    }
  }

  // ── Render states ────────────────────────────────────────────────────────────

  const canRender  = status === "config_generated";
  const isRendering = status === "rendering";
  const isReady    = status === "ready";
  const isFailed   = status === "failed";

  return (
    <div className="space-y-4">
      {/* Main action */}
      <div className="flex items-center justify-between">
        <div>
          {isRendering && (
            <p className="text-muted-fg text-xs font-mono">
              Rendering... {elapsed > 0 && <span className="tabular-nums">{elapsed}s elapsed</span>}
            </p>
          )}
          {isReady && (
            <p className="text-success text-xs font-mono">✓ Render complete</p>
          )}
          {isFailed && (
            <p className="text-danger text-xs font-mono">Render failed</p>
          )}
          {canRender && (
            <p className="text-muted-fg text-xs font-mono">
              Outline is ready — render your MP4.
            </p>
          )}
          {status === "draft" && (
            <p className="text-muted-fg text-xs font-mono">
              Generate an outline first.
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {(isFailed || isReady) && (
            <button
              onClick={handleRender}
              className="btn-ghost text-sm py-2 px-3"
            >
              ↺ Re-render
            </button>
          )}
          {isReady && videoUrl && (
            <a
              href={videoUrl}
              download={`demo.mp4`}
              className="btn-ghost text-sm py-2 px-3"
            >
              ↓ Download MP4
            </a>
          )}
          <button
            onClick={handleRender}
            disabled={!canRender || isRendering}
            className="btn-primary glow-accent disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isRendering ? (
              <span className="flex items-center gap-2">
                <Spinner /> Rendering...
              </span>
            ) : (
              "Render Video →"
            )}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {isRendering && (
        <div className="animate-fade-in space-y-2">
          <IndeterminateBar />
          <div className="flex justify-between text-xs font-mono text-muted-fg">
            <span>Bundling + encoding with Remotion</span>
            <span className="tabular-nums">{elapsed}s</span>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="px-4 py-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs font-mono animate-fade-in">
          {error}
        </div>
      )}

      {/* Video player */}
      {isReady && videoUrl && (
        <div className="animate-fade-in space-y-3">
          <video
            src={videoUrl}
            controls
            className="w-full rounded-xl border border-border bg-muted"
            style={{ maxHeight: "480px" }}
          />
          <div className="flex gap-2">
            <a
              href={videoUrl}
              download="demo.mp4"
              className="btn-primary text-sm py-2 px-4"
            >
              ↓ Download MP4
            </a>
            <button
              onClick={() => navigator.clipboard.writeText(videoUrl)}
              className="btn-ghost text-sm py-2 px-3"
            >
              Copy link
            </button>
          </div>
        </div>
      )}

      {/* Failed state */}
      {isFailed && !error && (
        <div className="rounded-lg border border-dashed border-danger/40 p-6 text-center animate-fade-in">
          <p className="text-danger text-sm font-mono mb-1">Render failed</p>
          <p className="text-muted-fg text-xs font-mono">
            Check server logs for details. Common causes: missing env vars, Supabase Storage bucket not created.
          </p>
        </div>
      )}

      {/* Not started yet */}
      {!isRendering && !isReady && !isFailed && (
        <div className="rounded-lg border border-dashed border-border p-6 text-center">
          <p className="text-muted-fg text-sm font-mono">
            {canRender
              ? "Click \"Render Video\" to generate your MP4."
              : "Complete the outline step to unlock rendering."}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Shared ───────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function IndeterminateBar() {
  return (
    <div className="h-1 rounded-full bg-muted overflow-hidden">
      <div
        className="h-full bg-accent rounded-full"
        style={{
          width:     "30%",
          animation: "slide-bar 1.6s ease-in-out infinite",
        }}
      />
      <style jsx>{`
        @keyframes slide-bar {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
    </div>
  );
}
