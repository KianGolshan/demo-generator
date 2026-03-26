"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";

export function ApiKeyForm({ hasApiKey, returnTo }: { hasApiKey: boolean; returnTo?: string }) {
  const router = useRouter();
  const toast = useToast();
  const [key, setKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(hasApiKey);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!key.trim()) return;
    setSaving(true);

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anthropicApiKey: key.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      setSaved(true);
      setKey("");
      toast("API key saved — you can now generate unlimited demos.", "success");
      if (returnTo) {
        router.push(returnTo);
      } else {
        router.refresh();
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "Save failed", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-3">
      {saved && (
        <div className="flex items-center gap-2 text-success text-xs font-mono">
          <span>✓</span>
          <span>API key saved — replace it by entering a new one below.</span>
        </div>
      )}
      <div className="flex gap-2">
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="sk-ant-api03-..."
          className="flex-1 px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm font-mono placeholder:text-muted-fg focus:outline-none focus:border-accent transition-colors"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={!key.trim() || saving}
          className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
      <p className="text-muted-fg text-xs font-mono">
        Key must start with <code className="text-accent">sk-ant-</code>
      </p>
    </form>
  );
}
