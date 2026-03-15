"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";

type Props = {
  demoId:         string;
  hasRepoAnalysis: boolean;
  hasGeneratedCode: boolean;
};

/**
 * Panel for the generated-code demo pipeline.
 * Calls POST /api/demos/[id]/generate-composition which asks Claude to
 * write a complete Remotion TSX file custom-built for this app.
 */
export function GenerateCompositionPanel({ demoId, hasRepoAnalysis, hasGeneratedCode }: Props) {
  const router      = useRouter();
  const toast       = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [done, setDone]       = useState(hasGeneratedCode);

  async function handleGenerate() {
    setLoading(true);
    setError(null);

    try {
      const res  = await fetch(`/api/demos/${demoId}/generate-composition`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");

      setDone(true);
      toast("Demo code generated! Click Render Video to export.", "success");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
      toast(msg, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Status + action row */}
      <div className="flex items-center justify-between">
        <div>
          {done && !loading && (
            <p className="text-success text-xs font-mono">
              ✓ Demo code generated — ready to render
            </p>
          )}
          {!done && !loading && (
            <p className="text-muted-fg text-xs font-mono">
              {hasRepoAnalysis
                ? "Claude will write a custom Remotion video file for your app."
                : "Run Repo Analysis first so Claude understands your codebase."}
            </p>
          )}
          {loading && (
            <p className="text-accent text-xs font-mono animate-pulse">
              Claude is coding your demo video...
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {done && (
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="btn-ghost text-sm py-2 px-3"
            >
              {loading ? <Spinner /> : "↺ Re-generate"}
            </button>
          )}
          {!done && (
            <button
              onClick={handleGenerate}
              disabled={loading || !hasRepoAnalysis}
              className="btn-primary glow-accent disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-2"><Spinner /> Generating...</span>
              ) : (
                "Generate Demo →"
              )}
            </button>
          )}
        </div>
      </div>

      {/* Progress (loading state) */}
      {loading && (
        <div className="animate-fade-in space-y-3">
          <ProgressBar />
          <p className="text-muted-fg text-xs font-mono text-center">
            Reading your codebase · Writing custom Remotion components · Building animations...
          </p>
          <p className="text-muted-fg text-xs font-mono text-center opacity-60">
            This takes 15–30 seconds
          </p>
        </div>
      )}

      {/* Done state — code preview */}
      {done && !loading && (
        <div className="rounded-xl border border-success/20 bg-success/5 p-4 animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="text-success text-lg mt-0.5">✦</div>
            <div>
              <p className="font-display font-bold text-sm text-success mb-1">
                Custom demo code ready
              </p>
              <p className="text-muted-fg text-xs font-mono leading-relaxed">
                Claude wrote a Remotion video composition tailored to your app&apos;s specific UI and features.
                Click <strong className="text-foreground">Render Video</strong> below to export the MP4.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Not started */}
      {!done && !loading && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <div className="text-3xl mb-3">⟡</div>
          <p className="font-display font-bold text-sm mb-1">
            {hasRepoAnalysis ? "Ready to generate" : "Repo analysis required"}
          </p>
          <p className="text-muted-fg text-xs font-mono leading-relaxed max-w-sm mx-auto">
            {hasRepoAnalysis
              ? "Claude will analyze your code and write a custom animated Remotion composition — not templates, real code built for your app."
              : "Connect your GitHub repo and run analysis above. Claude needs to read your code to generate an accurate demo."}
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="px-4 py-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs font-mono animate-fade-in">
          {error}
        </div>
      )}
    </div>
  );
}

// ─── Shared ───────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin inline" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function ProgressBar() {
  return (
    <div className="h-0.5 rounded-full bg-muted overflow-hidden">
      <div
        className="h-full bg-accent rounded-full"
        style={{ animation: "slide-comp 1.8s ease-in-out infinite", width: "30%" }}
      />
      <style jsx>{`
        @keyframes slide-comp {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
    </div>
  );
}
