"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { upgradeToPrivateRepos } from "@/app/login/actions";
import type { CodeSummary } from "@/types";

type RepoPanelProps = {
  demoId: string;
  codeSummary: CodeSummary | undefined;
  hasRepoSourceType: boolean;
};

/**
 * "Connect Repo" interactive panel on the demo detail page.
 * Lets users paste a GitHub repo name, kicks off analysis, and displays the
 * resulting CodeSummary (stack chips, features, AI usage) once complete.
 *
 * @param demoId          - The demo project ID (for the API call).
 * @param codeSummary     - Existing CodeSummary if already analyzed.
 * @param hasRepoSourceType - Whether the demo's sourceType includes "repo".
 */
export function RepoPanel({ demoId, codeSummary, hasRepoSourceType }: RepoPanelProps) {
  const router = useRouter();
  const toast  = useToast();
  const [repoInput, setRepoInput] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<CodeSummary | undefined>(codeSummary);

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    if (!repoInput.trim()) return;

    setStatus("loading");
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/demos/${demoId}/analyze-repo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoFullName: repoInput.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Analysis failed");
      }

      setResult(data.codeSummary as CodeSummary);
      setStatus("done");
      toast("Repo analyzed!", "success");
      // Soft-refresh the server component so other panels reflect the new codeSummary
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setErrorMsg(msg);
      setStatus("error");
      toast(msg, "error");
    }
  }

  // ── Already has a result ───────────────────────────────────────────────────
  if (result) {
    return (
      <div className="space-y-4 animate-fade-in">
        <CodeSummaryDisplay summary={result} />
        <button
          onClick={() => { setResult(undefined); setStatus("idle"); }}
          className="text-muted-fg text-xs font-mono hover:text-foreground transition-colors"
        >
          ↺ Re-analyze a different repo
        </button>
      </div>
    );
  }

  // ── Input form ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {!hasRepoSourceType && (
        <div className="px-3 py-2 rounded-lg bg-warning/10 border border-warning/30 text-warning text-xs font-mono">
          Tip: update your project&apos;s source type to include &quot;repo&quot; for best results.
        </div>
      )}

      <form onSubmit={handleAnalyze} className="flex gap-2">
        <input
          type="text"
          value={repoInput}
          onChange={(e) => setRepoInput(e.target.value)}
          placeholder="owner/repo  e.g. KianGolshan/Valuation-Dashboard"
          disabled={status === "loading"}
          className="flex-1 px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm font-mono placeholder:text-muted-fg focus:outline-none focus:border-accent transition-colors disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={status === "loading" || !repoInput.trim()}
          className="btn-primary shrink-0 min-w-24"
        >
          {status === "loading" ? <Spinner /> : "Analyze"}
        </button>
      </form>

      {/* Loading state */}
      {status === "loading" && (
        <div className="animate-fade-in space-y-2">
          <ProgressBar />
          <p className="text-muted-fg text-xs font-mono text-center">
            Fetching file tree and analyzing with Claude...
          </p>
        </div>
      )}

      {/* Error state */}
      {status === "error" && errorMsg && (
        <div className="px-4 py-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs font-mono animate-fade-in">
          {errorMsg}
        </div>
      )}

      {/* Private repo access */}
      <div className="pt-1 border-t border-border">
        <p className="text-muted-fg text-xs font-mono mb-2">
          Need to analyze a private repo?
        </p>
        <form action={upgradeToPrivateRepos}>
          <button
            type="submit"
            className="text-xs font-mono text-accent hover:underline flex items-center gap-1"
          >
            <LockIcon />
            Grant private repo access
          </button>
        </form>
        <p className="text-muted-fg text-xs font-mono mt-1 opacity-60">
          Re-authenticates with GitHub&apos;s <code>repo</code> scope. DemoForge only reads file contents — never writes.
        </p>
      </div>
    </div>
  );
}

// ─── Code Summary Display ─────────────────────────────────────────────────────

function CodeSummaryDisplay({ summary }: { summary: CodeSummary }) {
  return (
    <div className="space-y-4 animate-fade-in stagger-children">
      {/* Stack chips */}
      <div>
        <div className="text-muted-fg text-xs font-mono mb-2">Stack detected</div>
        <div className="flex flex-wrap gap-2">
          {summary.stack.frontend && (
            <Chip label="Frontend" value={summary.stack.frontend} />
          )}
          {summary.stack.backend && (
            <Chip label="Backend" value={summary.stack.backend} />
          )}
          {summary.stack.databases?.map((db) => (
            <Chip key={db} label="DB" value={db} />
          ))}
          {summary.stack.aiProviders?.map((ai) => (
            <Chip key={ai} label="AI" value={ai} color="accent" />
          ))}
        </div>
      </div>

      {/* Features */}
      {summary.features.length > 0 && (
        <div>
          <div className="text-muted-fg text-xs font-mono mb-2">Features detected</div>
          <ul className="space-y-1.5">
            {summary.features.map((f, i) => (
              <li key={i} className="flex gap-2 items-start text-sm font-mono">
                <span className="text-accent mt-0.5 shrink-0">›</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* AI usage */}
      {summary.aiUsage.length > 0 && (
        <div>
          <div className="text-muted-fg text-xs font-mono mb-2">AI usage</div>
          <ul className="space-y-1">
            {summary.aiUsage.map((u, i) => (
              <li key={i} className="flex gap-2 items-start text-xs font-mono text-muted-fg">
                <span className="text-warning mt-0.5 shrink-0">⚡</span>
                <span>{u}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Routes */}
      {summary.routes.length > 0 && (
        <details className="group">
          <summary className="text-muted-fg text-xs font-mono cursor-pointer hover:text-foreground transition-colors list-none flex items-center gap-1">
            <span className="group-open:rotate-90 transition-transform inline-block">›</span>
            {summary.routes.length} routes detected
          </summary>
          <div className="mt-2 space-y-1 pl-3 border-l border-border">
            {summary.routes.map((r, i) => (
              <div key={i} className="text-xs font-mono">
                <span className="text-accent">{r.path}</span>
                <span className="text-muted-fg"> — {r.description}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

// ─── Shared ───────────────────────────────────────────────────────────────────

function Chip({
  label,
  value,
  color = "default",
}: {
  label: string;
  value: string;
  color?: "default" | "accent";
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-xs font-mono
        ${color === "accent"
          ? "border-accent/30 bg-accent/10 text-accent"
          : "border-border bg-muted text-muted-fg"}`}
    >
      <span className="opacity-60">{label}:</span>
      <span className="text-foreground">{value}</span>
    </span>
  );
}

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
  );
}

function ProgressBar() {
  return (
    <div className="h-1 rounded-full bg-muted overflow-hidden">
      <div
        className="h-full bg-accent rounded-full"
        style={{
          animation: "progress-indeterminate 1.5s ease-in-out infinite",
          width: "40%",
        }}
      />
      <style jsx>{`
        @keyframes progress-indeterminate {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(350%); }
        }
      `}</style>
    </div>
  );
}
