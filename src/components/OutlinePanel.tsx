"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import type { DemoConfig, DemoScene, DemoSceneType } from "@/types";

type OutlinePanelProps = {
  demoId:      string;
  demoConfig:  DemoConfig | undefined;
  canGenerate: boolean;
};

const SCENE_TYPE_STYLES: Record<DemoSceneType, { label: string; color: string }> = {
  "hook":        { label: "Hook",         color: "border-accent/40 bg-accent/10 text-accent" },
  "code":        { label: "Code",         color: "border-blue-400/40 bg-blue-400/10 text-blue-400" },
  "browser-flow":{ label: "Browser Flow", color: "border-green-400/40 bg-green-400/10 text-green-400" },
  "terminal":    { label: "Terminal",     color: "border-yellow-400/40 bg-yellow-400/10 text-yellow-400" },
  "comparison":  { label: "Comparison",   color: "border-purple-400/40 bg-purple-400/10 text-purple-400" },
  "end-card":    { label: "End Card",     color: "border-pink-400/40 bg-pink-400/10 text-pink-400" },
};

/**
 * Interactive outline panel for the demo detail page.
 * Supports new animated scene types: hook, code, browser-flow, terminal, comparison, end-card.
 * Scenes use durationFrames (at 30fps) instead of durationSeconds.
 */
export function OutlinePanel({ demoId, demoConfig, canGenerate }: OutlinePanelProps) {
  const router = useRouter();
  const toast  = useToast();
  const [config, setConfig]     = useState<DemoConfig | undefined>(demoConfig);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [dirty, setDirty]       = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  // ── Generate ────────────────────────────────────────────────────────────────

  async function handleGenerate() {
    setGenerating(true);
    setError(null);

    try {
      const res  = await fetch(`/api/demos/${demoId}/generate-config`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");

      setConfig(data.demoConfig as DemoConfig);
      setDirty(false);
      toast("Outline generated!", "success");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
      toast(msg, "error");
    } finally {
      setGenerating(false);
    }
  }

  // ── Save ────────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!config) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/demos/${demoId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ demoConfig: config }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Save failed");
      }
      setDirty(false);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
      toast("Changes saved", "success");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed";
      setError(msg);
      toast(msg, "error");
    } finally {
      setSaving(false);
    }
  }

  // ── Scene mutation helpers ───────────────────────────────────────────────────

  function updateScene(idx: number, patch: Partial<DemoScene>) {
    if (!config) return;
    const scenes = config.scenes.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    setConfig({ ...config, scenes });
    setDirty(true);
  }

  function moveScene(from: number, to: number) {
    if (!config) return;
    const scenes = [...config.scenes];
    const [moved] = scenes.splice(from, 1);
    scenes.splice(to, 0, moved);
    setConfig({ ...config, scenes });
    setDirty(true);
  }

  // ── Drag-and-drop state ──────────────────────────────────────────────────────

  const dragIdx = useRef<number | null>(null);

  const onDragStart = useCallback((idx: number) => {
    dragIdx.current = idx;
  }, []);

  const onDrop = useCallback(
    (toIdx: number) => {
      if (dragIdx.current !== null && dragIdx.current !== toIdx) {
        moveScene(dragIdx.current, toIdx);
      }
      dragIdx.current = null;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config]
  );

  // ── Render ───────────────────────────────────────────────────────────────────

  const totalSeconds = config
    ? Math.round(config.scenes.reduce((s, sc) => s + sc.durationFrames, 0) / 30)
    : 0;

  return (
    <div className="space-y-4">
      {/* Header controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {config && dirty && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary text-sm py-2 px-4"
            >
              {saving ? <Spinner /> : savedFlash ? "✓ Saved" : "Save Changes"}
            </button>
          )}
          {config && savedFlash && !dirty && (
            <span className="text-success text-xs font-mono animate-fade-in">✓ Changes saved</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {config && (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="btn-ghost text-sm py-2 px-3"
            >
              {generating ? <Spinner /> : "↺ Re-generate"}
            </button>
          )}
          {!config && (
            <button
              onClick={handleGenerate}
              disabled={generating || !canGenerate}
              className="btn-primary glow-accent disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {generating ? (
                <span className="flex items-center gap-2"><Spinner />Generating...</span>
              ) : (
                "Generate Outline"
              )}
            </button>
          )}
        </div>
      </div>

      {/* Generating state */}
      {generating && (
        <div className="animate-fade-in space-y-3">
          <ProgressBar />
          <p className="text-muted-fg text-xs font-mono text-center">
            Claude is designing your demo story...
          </p>
        </div>
      )}

      {/* No config yet */}
      {!config && !generating && (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <div className="text-4xl mb-3">✦</div>
          <p className="font-display font-bold text-sm mb-1">No outline yet</p>
          <p className="text-muted-fg text-xs font-mono">
            {canGenerate
              ? "Click \"Generate Outline\" to let Claude write your demo story."
              : "Add screenshots, a URL, or run repo analysis first."}
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="px-4 py-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs font-mono animate-fade-in">
          {error}
        </div>
      )}

      {/* Scene list */}
      {config && !generating && (
        <div className="space-y-3">
          {/* Config meta */}
          <div className="flex items-center gap-3 text-xs font-mono text-muted-fg">
            <span>{config.scenes.length} scenes</span>
            <span>·</span>
            <span>~{totalSeconds}s total</span>
            <span>·</span>
            <span className="capitalize">{config.theme} theme</span>
            <span>·</span>
            <span>{config.aspectRatio}</span>
          </div>

          {/* Scene cards */}
          {config.scenes.map((scene, idx) => (
            <SceneCard
              key={idx}
              scene={scene}
              index={idx}
              total={config.scenes.length}
              onUpdate={(patch) => updateScene(idx, patch)}
              onMove={(dir) => moveScene(idx, idx + dir)}
              onDragStart={() => onDragStart(idx)}
              onDrop={() => onDrop(idx)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Scene Card ───────────────────────────────────────────────────────────────

type SceneCardProps = {
  scene:       DemoScene;
  index:       number;
  total:       number;
  onUpdate:    (patch: Partial<DemoScene>) => void;
  onMove:      (dir: -1 | 1) => void;
  onDragStart: () => void;
  onDrop:      () => void;
};

function SceneCard({
  scene,
  index,
  total,
  onUpdate,
  onMove,
  onDragStart,
  onDrop,
}: SceneCardProps) {
  const [dragOver, setDragOver] = useState(false);
  const typeStyle = SCENE_TYPE_STYLES[scene.type] ?? SCENE_TYPE_STYLES["hook"];

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={() => { setDragOver(false); onDrop(); }}
      className={`
        group relative rounded-xl border bg-card p-5 transition-all duration-200 cursor-grab active:cursor-grabbing
        ${dragOver ? "border-accent scale-[1.01] shadow-lg shadow-accent/10" : "border-border hover:border-border/80"}
      `}
    >
      {/* Drag handle */}
      <div className="absolute left-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-40 transition-opacity text-muted-fg select-none">
        ⠿
      </div>

      <div className="pl-4">
        {/* Top row: type badge + duration + reorder */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={`status-badge border text-xs ${typeStyle.color}`}>
              {typeStyle.label}
            </span>
            <DurationEditor
              frames={scene.durationFrames}
              onChange={(v) => onUpdate({ durationFrames: v })}
            />
          </div>

          {/* Up/down reorder buttons */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onMove(-1)}
              disabled={index === 0}
              className="w-6 h-6 rounded flex items-center justify-center text-muted-fg hover:text-foreground hover:bg-muted disabled:opacity-20 transition-colors"
              aria-label="Move up"
            >
              ↑
            </button>
            <button
              onClick={() => onMove(1)}
              disabled={index === total - 1}
              className="w-6 h-6 rounded flex items-center justify-center text-muted-fg hover:text-foreground hover:bg-muted disabled:opacity-20 transition-colors"
              aria-label="Move down"
            >
              ↓
            </button>
          </div>
        </div>

        {/* Scene summary — read-only, showing the most relevant fields */}
        <SceneSummary scene={scene} onUpdate={onUpdate} />
      </div>
    </div>
  );
}

// ─── Scene Summary ────────────────────────────────────────────────────────────

/**
 * Shows the most relevant editable fields for each scene type.
 * Headline and overlayText are inline-editable across all types.
 */
function SceneSummary({
  scene,
  onUpdate,
}: {
  scene:    DemoScene;
  onUpdate: (patch: Partial<DemoScene>) => void;
}) {
  // The "primary label" for each type
  const primaryLabel =
    scene.headline ??
    scene.title ??
    (scene.lines ? scene.lines.join(" / ") : undefined) ??
    "";

  return (
    <div className="space-y-2">
      {/* Primary label — editable */}
      <InlineEdit
        value={primaryLabel}
        onChange={(v) => {
          if (scene.type === "hook") {
            // Update first line
            const lines = [...(scene.lines ?? [])];
            lines[0] = v;
            onUpdate({ lines });
          } else if (scene.type === "end-card") {
            onUpdate({ title: v });
          } else {
            onUpdate({ headline: v });
          }
        }}
        placeholder={
          scene.type === "hook" ? "Opening line"
          : scene.type === "end-card" ? "App name"
          : "Scene headline"
        }
        className="font-display font-bold text-base text-foreground w-full"
      />

      {/* Type-specific secondary info */}
      {scene.type === "hook" && scene.lines && scene.lines.length > 1 && (
        <div className="space-y-1">
          {scene.lines.slice(1).map((line, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-accent mt-0.5 shrink-0 text-xs">›</span>
              <InlineEdit
                value={line}
                onChange={(v) => {
                  const lines = [...(scene.lines ?? [])];
                  lines[i + 1] = v;
                  onUpdate({ lines });
                }}
                placeholder="Line"
                className="text-sm text-muted-fg font-mono flex-1"
              />
            </div>
          ))}
        </div>
      )}

      {scene.type === "browser-flow" && scene.url && (
        <p className="text-xs font-mono text-muted-fg truncate">{scene.url}</p>
      )}

      {scene.type === "code" && scene.filename && (
        <p className="text-xs font-mono text-blue-400/70">{scene.filename}</p>
      )}

      {scene.type === "terminal" && scene.terminalLines && (
        <p className="text-xs font-mono text-muted-fg">
          {scene.terminalLines.length} terminal line{scene.terminalLines.length !== 1 ? "s" : ""}
        </p>
      )}

      {scene.type === "comparison" && (
        <p className="text-xs font-mono text-muted-fg">
          {scene.leftTitle} vs {scene.rightTitle}
        </p>
      )}

      {scene.type === "end-card" && scene.tagline && (
        <InlineEdit
          value={scene.tagline}
          onChange={(v) => onUpdate({ tagline: v })}
          placeholder="Tagline"
          className="text-sm text-muted-fg font-mono w-full"
        />
      )}

      {/* Overlay text (shown for most types) */}
      {scene.overlayText !== undefined && (
        <div className="flex items-center gap-2 mt-1">
          <span className="text-muted-fg text-xs font-mono shrink-0">overlay:</span>
          <InlineEdit
            value={scene.overlayText ?? ""}
            onChange={(v) => onUpdate({ overlayText: v })}
            placeholder="Overlay caption"
            className="text-xs font-mono text-muted-fg flex-1"
          />
        </div>
      )}
    </div>
  );
}

// ─── Inline Edit ──────────────────────────────────────────────────────────────

function InlineEdit({
  value,
  onChange,
  placeholder,
  className,
}: {
  value:       string;
  onChange:    (v: string) => void;
  placeholder: string;
  className:   string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(value);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  function commit() {
    onChange(draft.trim() || value);
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter")  commit();
          if (e.key === "Escape") { setDraft(value); setEditing(false); }
        }}
        placeholder={placeholder}
        className={`bg-muted/50 border border-accent/50 rounded px-2 py-0.5 focus:outline-none ${className}`}
      />
    );
  }

  return (
    <span
      onClick={() => { setDraft(value); setEditing(true); }}
      title="Click to edit"
      className={`cursor-text hover:text-foreground transition-colors rounded px-1 py-0.5 hover:bg-muted/50 ${className} ${
        !value ? "opacity-40 italic" : ""
      }`}
    >
      {value || placeholder}
    </span>
  );
}

// ─── Duration Editor ──────────────────────────────────────────────────────────

function DurationEditor({
  frames,
  onChange,
}: {
  frames:   number;
  onChange: (v: number) => void;
}) {
  const seconds = Math.round(frames / 30);

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onChange(Math.max(60, frames - 30))}
        className="w-4 h-4 text-muted-fg hover:text-foreground text-xs transition-colors"
      >
        −
      </button>
      <span className="text-xs font-mono text-muted-fg tabular-nums w-10 text-center">
        {seconds}s
      </span>
      <button
        onClick={() => onChange(Math.min(300, frames + 30))}
        className="w-4 h-4 text-muted-fg hover:text-foreground text-xs transition-colors"
      >
        +
      </button>
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
        style={{ animation: "slide 1.4s ease-in-out infinite", width: "35%" }}
      />
      <style jsx>{`
        @keyframes slide {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(340%); }
        }
      `}</style>
    </div>
  );
}
