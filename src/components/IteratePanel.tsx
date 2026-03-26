"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import Link from "next/link";

type Props = {
  demoId: string;
  hasGeneratedCode: boolean;
};

const QUICK_PROMPTS = [
  "Make the hook scene faster and more energetic",
  "Change the accent color to green",
  "Add a comparison scene showing before vs. after",
  "Make the animations smoother and slower",
  "Shorten the video to under 40 seconds",
];

/**
 * Iterate panel — lets users apply plain-language changes to the generated TSX.
 * Requires the user's own Anthropic API key (free tier covers first generation only).
 */
export function IteratePanel({ demoId, hasGeneratedCode }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiKeyRequired, setApiKeyRequired] = useState(false);
  const [justIterated, setJustIterated] = useState(false);

  async function handleIterate(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim() || loading) return;
    setLoading(true);
    setApiKeyRequired(false);

    try {
      const res = await fetch(`/api/demos/${demoId}/iterate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim() }),
      });
      const data = await res.json();

      if (res.status === 402) {
        setApiKeyRequired(true);
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "Iteration failed");

      setMessage("");
      setJustIterated(true);
      toast("Demo updated! Scroll down and click Render Video to export.", "success");
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Something went wrong", "error");
    } finally {
      setLoading(false);
    }
  }

  if (!hasGeneratedCode) return null;

  return (
    <section className="glass-card p-6">
      <div className="flex items-center gap-2 mb-1">
        <h2 className="font-display text-lg font-bold">Iterate</h2>
        <span className="status-badge border border-border text-muted-fg text-xs font-mono">uses your API key</span>
      </div>
      <p className="text-muted-fg text-xs font-mono mb-4">
        Describe a change and Claude will update the video code. Re-render after each iteration.
      </p>

      {apiKeyRequired ? (
        <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 animate-fade-in">
          <p className="font-display font-bold text-sm mb-1">API key required</p>
          <p className="text-muted-fg text-xs font-mono mb-3">
            Iterations use your own Anthropic API key. Add it in Settings to continue.
          </p>
          <Link href="/settings" className="btn-primary text-sm py-2 px-4">
            Go to Settings →
          </Link>
        </div>
      ) : (
        <form onSubmit={handleIterate} className="space-y-3">
          {/* Quick prompts */}
          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setMessage(p)}
                className="px-2.5 py-1 rounded-full border border-border text-muted-fg text-xs font-mono hover:border-accent/50 hover:text-foreground transition-colors"
              >
                {p}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. Make the hook more punchy, add a terminal scene..."
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm font-mono placeholder:text-muted-fg focus:outline-none focus:border-accent transition-colors disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!message.trim() || loading}
              className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Spinner /> Updating...
                </span>
              ) : (
                "Apply →"
              )}
            </button>
          </div>

          {loading && (
            <p className="text-accent text-xs font-mono animate-pulse">
              Claude is rewriting your demo...
            </p>
          )}
        </form>
      )}
      {justIterated && (
        <div className="rounded-xl border border-accent/30 bg-accent/5 p-3 flex items-center justify-between animate-fade-in">
          <p className="text-xs font-mono text-accent">
            ✓ Demo updated — scroll down and click <strong>Render Video</strong> to export the new version.
          </p>
          <button onClick={() => setJustIterated(false)} className="text-muted-fg text-xs ml-3 hover:text-foreground">✕</button>
        </div>
      )}
    </section>
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
