"use client";

import { signInWithGitHub, signInWithMagicLink } from "./actions";
import { useState } from "react";

/**
 * Client component for the login form.
 * Handles GitHub OAuth button and magic link email form with loading + feedback states.
 */
export function LoginForm() {
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<"github" | "magic" | null>(null);
  const [includePrivate, setIncludePrivate] = useState(false);

  async function handleMagicLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading("magic");

    const fd = new FormData(e.currentTarget);
    const result = await signInWithMagicLink(fd);

    setLoading(null);
    if (result?.error) {
      setError(result.error);
    } else {
      setEmailSent(true);
    }
  }

  if (emailSent) {
    return (
      <div className="text-center space-y-3 animate-fade-in">
        <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">✉️</span>
        </div>
        <h2 className="font-display text-xl font-bold">Check your inbox</h2>
        <p className="text-muted-fg text-sm font-mono">
          We sent a magic link to your email. Click it to sign in.
        </p>
        <button
          onClick={() => setEmailSent(false)}
          className="text-accent text-xs font-mono hover:underline"
        >
          Try a different email
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* GitHub OAuth */}
      <form action={signInWithGitHub} onSubmit={() => setLoading("github")}>
        <input type="hidden" name="includePrivate" value={includePrivate ? "true" : "false"} />
        <button
          type="submit"
          disabled={loading !== null}
          className="btn-primary w-full py-3 gap-3"
        >
          {loading === "github" ? <Spinner /> : <GitHubIcon />}
          Continue with GitHub
        </button>
      </form>

      {/* Private repo toggle */}
      <label className="flex items-start gap-2.5 cursor-pointer group">
        <input
          type="checkbox"
          checked={includePrivate}
          onChange={(e) => setIncludePrivate(e.target.checked)}
          className="mt-0.5 accent-indigo-500 cursor-pointer"
        />
        <div>
          <span className="text-xs font-mono text-muted-fg group-hover:text-foreground transition-colors">
            Include private repositories
          </span>
          {includePrivate && (
            <p className="text-xs font-mono text-warning mt-1">
              This grants read + write access to all your GitHub repos. DemoForge only reads file contents — it never writes to your code.
            </p>
          )}
        </div>
      </label>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-muted-fg text-xs font-mono">or</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Magic link */}
      <form onSubmit={handleMagicLink} className="space-y-3">
        <input
          type="email"
          name="email"
          required
          placeholder="your@email.com"
          disabled={loading !== null}
          className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm font-mono placeholder:text-muted-fg focus:outline-none focus:border-accent transition-colors disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading !== null}
          className="btn-ghost w-full py-2.5 gap-2"
        >
          {loading === "magic" && <Spinner />}
          Send magic link
        </button>
      </form>

      {/* Error */}
      {error && (
        <p className="text-danger text-xs text-center font-mono animate-fade-in">
          {error}
        </p>
      )}
    </div>
  );
}

function GitHubIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      className="w-4 h-4 animate-spin"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
