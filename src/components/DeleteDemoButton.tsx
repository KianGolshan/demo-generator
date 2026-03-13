"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";

export function DeleteDemoButton({ demoId }: { demoId: string }) {
  const router = useRouter();
  const toast  = useToast();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting]     = useState(false);

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDeleting(true);
    try {
      const res = await fetch(`/api/demos/${demoId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Delete failed");
      }
      toast("Demo deleted", "success");
      setDeleting(false);
      setConfirming(false);
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Delete failed", "error");
      setDeleting(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div
        className="flex items-center gap-1"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
      >
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-danger text-xs font-mono hover:text-danger/80 transition-colors"
        >
          {deleting ? "…" : "Confirm"}
        </button>
        <span className="text-muted-fg text-xs">/</span>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirming(false); }}
          className="text-muted-fg text-xs font-mono hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirming(true); }}
      className="text-muted-fg text-xs font-mono hover:text-danger transition-colors opacity-0 group-hover:opacity-100"
      aria-label="Delete demo"
    >
      Delete
    </button>
  );
}
