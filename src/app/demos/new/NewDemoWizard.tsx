"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import type { AspectRatio, SourceType, StylePreset } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WizardState {
  // Step 1
  projectName: string;
  tagline: string;
  description: string;
  sourceType: SourceType;
  // Step 2
  sourceUrl: string;
  screenshots: File[];
  // Step 3
  stylePreset: StylePreset;
  aspectRatio: AspectRatio;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STYLE_PRESETS: { value: StylePreset; label: string; description: string; accent: string }[] = [
  {
    value: "clean",
    label: "Clean",
    description: "Minimal, high-contrast. Lets the product speak.",
    accent: "#6366f1",
  },
  {
    value: "cyber",
    label: "Cyber",
    description: "Dark neon. Grid lines. Hacker aesthetic.",
    accent: "#22d3ee",
  },
  {
    value: "playful",
    label: "Playful",
    description: "Soft gradients, bouncy motion. Consumer-friendly.",
    accent: "#f472b6",
  },
];

const ASPECT_RATIOS: { value: AspectRatio; label: string; icon: string }[] = [
  { value: "16:9", label: "Landscape", icon: "▬" },
  { value: "9:16", label: "Portrait", icon: "▮" },
];

// ─── Main Wizard Component ────────────────────────────────────────────────────

/**
 * Multi-step wizard for creating a new DemoProject.
 * Step 1: Name, tagline, description, source type
 * Step 2: Screenshots upload or URL
 * Step 3: Style preset + aspect ratio
 * Submit: POST /api/demos → upload screenshots → redirect to /demos/[id]
 */
export function NewDemoWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [state, setState] = useState<WizardState>({
    projectName: "",
    tagline: "",
    description: "",
    sourceType: "screenshots",
    sourceUrl: "",
    screenshots: [],
    stylePreset: "clean",
    aspectRatio: "16:9",
  });

  function update(patch: Partial<WizardState>) {
    setState((prev) => ({ ...prev, ...patch }));
  }

  function nextStep() {
    setError(null);
    setStep((s) => Math.min(s + 1, 3));
  }

  function prevStep() {
    setError(null);
    setStep((s) => Math.max(s - 1, 1));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);

    try {
      // 1. Create the demo project
      const res = await fetch("/api/demos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName: state.projectName,
          tagline: state.tagline,
          description: state.description,
          sourceType: state.sourceType,
          sourceUrl: state.sourceUrl || undefined,
          stylePreset: state.stylePreset,
          aspectRatio: state.aspectRatio,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create demo");
      }

      const demo = await res.json();
      const demoId: string = demo.id;

      // 2. Upload screenshots if any
      if (state.screenshots.length > 0) {
        const fd = new FormData();
        state.screenshots.forEach((file) => fd.append("files", file));

        const uploadRes = await fetch(`/api/demos/${demoId}/screenshots`, {
          method: "POST",
          body: fd,
        });

        if (!uploadRes.ok) {
          // Non-fatal: continue to detail page, user can re-upload
          console.warn("Screenshot upload failed — continuing to detail page");
        }
      }

      // 3. Navigate to demo detail
      router.push(`/demos/${demoId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Step indicator */}
      <StepIndicator current={step} total={3} />

      {/* Step panels */}
      <div className="glass-card p-8 mt-6 animate-scale-in">
        {step === 1 && (
          <Step1
            state={state}
            update={update}
            onNext={nextStep}
          />
        )}
        {step === 2 && (
          <Step2
            state={state}
            update={update}
            onNext={nextStep}
            onBack={prevStep}
          />
        )}
        {step === 3 && (
          <Step3
            state={state}
            update={update}
            onBack={prevStep}
            onSubmit={handleSubmit}
            submitting={submitting}
          />
        )}

        {error && (
          <p className="mt-4 text-danger text-xs font-mono text-center animate-fade-in">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-3">
      {Array.from({ length: total }).map((_, i) => {
        const num = i + 1;
        const done = num < current;
        const active = num === current;
        return (
          <div key={num} className="flex items-center gap-3">
            <div
              className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-display font-bold transition-all duration-300
                ${active ? "bg-accent text-white" : done ? "bg-accent/20 text-accent" : "bg-muted text-muted-fg border border-border"}
              `}
            >
              {done ? "✓" : num}
            </div>
            {i < total - 1 && (
              <div
                className={`h-px w-12 transition-all duration-500 ${
                  done ? "bg-accent" : "bg-border"
                }`}
              />
            )}
          </div>
        );
      })}
      <span className="ml-2 text-muted-fg text-xs font-mono">
        Step {current} of {total}
      </span>
    </div>
  );
}

// ─── Step 1: Project Info ─────────────────────────────────────────────────────

function Step1({
  state,
  update,
  onNext,
}: {
  state: WizardState;
  update: (p: Partial<WizardState>) => void;
  onNext: () => void;
}) {
  function handleNext(e: React.FormEvent) {
    e.preventDefault();
    if (!state.projectName.trim()) return;
    onNext();
  }

  return (
    <form onSubmit={handleNext} className="space-y-5 stagger-children">
      <div>
        <h2 className="font-display text-2xl font-bold mb-1">Tell us about your project</h2>
        <p className="text-muted-fg text-sm font-mono">
          This becomes the foundation of your demo script.
        </p>
      </div>

      <Field label="Project name *" hint="Short and punchy">
        <input
          type="text"
          value={state.projectName}
          onChange={(e) => update({ projectName: e.target.value })}
          placeholder="e.g. Valuation Dashboard"
          required
          maxLength={100}
          className={inputClass}
        />
      </Field>

      <Field label="Tagline" hint="One sentence that captures the value">
        <input
          type="text"
          value={state.tagline}
          onChange={(e) => update({ tagline: e.target.value })}
          placeholder="e.g. Instant equity analysis for any company"
          maxLength={200}
          className={inputClass}
        />
      </Field>

      <Field label="Description" hint="Who is this for? What does it do? What problem does it solve?">
        <textarea
          value={state.description}
          onChange={(e) => update({ description: e.target.value })}
          placeholder="e.g. A dashboard that lets VCs and analysts pull live financials, run DCF models, and generate one-page tearsheets in seconds..."
          rows={4}
          maxLength={2000}
          className={inputClass + " resize-none"}
        />
      </Field>

      <Field label="What are you providing?" hint="Choose how you'll show the app">
        <div className="grid grid-cols-2 gap-3 mt-1">
          {(
            [
              { value: "screenshots", label: "Screenshots", icon: "🖼️", desc: "Upload up to 6 images" },
              { value: "url",         label: "Live URL",    icon: "🔗", desc: "Paste your app URL" },
              { value: "repo+screenshots", label: "Repo + Screenshots", icon: "⚡", desc: "Best results" },
              { value: "repo+url",    label: "Repo + URL",  icon: "🚀", desc: "Full analysis" },
            ] as { value: SourceType; label: string; icon: string; desc: string }[]
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => update({ sourceType: opt.value })}
              className={`
                p-3 rounded-lg border text-left transition-all duration-200
                ${state.sourceType === opt.value
                  ? "border-accent bg-accent/10 text-foreground"
                  : "border-border bg-muted/50 text-muted-fg hover:border-accent/50"}
              `}
            >
              <div className="text-lg mb-1">{opt.icon}</div>
              <div className="font-display text-sm font-bold">{opt.label}</div>
              <div className="text-xs font-mono opacity-70">{opt.desc}</div>
            </button>
          ))}
        </div>
      </Field>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={!state.projectName.trim()}
          className="btn-primary disabled:opacity-40"
        >
          Continue →
        </button>
      </div>
    </form>
  );
}

// ─── Step 2: Source (Screenshots or URL) ──────────────────────────────────────

function Step2({
  state,
  update,
  onNext,
  onBack,
}: {
  state: WizardState;
  update: (p: Partial<WizardState>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const needsScreenshots = state.sourceType.includes("screenshots");
  const needsUrl = state.sourceType.includes("url");

  function handleNext(e: React.FormEvent) {
    e.preventDefault();
    onNext();
  }

  return (
    <form onSubmit={handleNext} className="space-y-5 stagger-children">
      <div>
        <h2 className="font-display text-2xl font-bold mb-1">Add your source</h2>
        <p className="text-muted-fg text-sm font-mono">
          {needsScreenshots && needsUrl
            ? "Upload screenshots and paste your app URL."
            : needsScreenshots
            ? "Upload up to 6 screenshots of your app in action."
            : "Paste your app URL so Claude can reference it."}
        </p>
      </div>

      {needsScreenshots && (
        <ScreenshotUploader
          files={state.screenshots}
          onChange={(files) => update({ screenshots: files })}
        />
      )}

      {needsUrl && (
        <Field label="App URL" hint="The live URL of your project">
          <input
            type="url"
            value={state.sourceUrl}
            onChange={(e) => update({ sourceUrl: e.target.value })}
            placeholder="https://your-app.vercel.app"
            className={inputClass}
          />
        </Field>
      )}

      <div className="flex justify-between pt-2">
        <button type="button" onClick={onBack} className="btn-ghost">
          ← Back
        </button>
        <button
          type="submit"
          className="btn-primary"
          disabled={
            (needsScreenshots && state.screenshots.length === 0 && !needsUrl) ||
            (needsUrl && !state.sourceUrl && !needsScreenshots)
          }
        >
          Continue →
        </button>
      </div>
    </form>
  );
}

// ─── Screenshot Uploader ──────────────────────────────────────────────────────

function ScreenshotUploader({
  files,
  onChange,
}: {
  files: File[];
  onChange: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const addFiles = useCallback(
    (incoming: FileList | null) => {
      if (!incoming) return;
      const valid = Array.from(incoming).filter((f) =>
        f.type.startsWith("image/")
      );
      const merged = [...files, ...valid].slice(0, 6);
      onChange(merged);
    },
    [files, onChange]
  );

  function removeFile(idx: number) {
    onChange(files.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        className={`
          relative cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200
          ${dragging
            ? "border-accent bg-accent/10 scale-[1.01]"
            : files.length > 0
            ? "border-accent/40 bg-accent/5"
            : "border-border bg-muted/30 hover:border-accent/50 hover:bg-muted/50"}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
        <div className="text-3xl mb-2">{files.length > 0 ? "✓" : "📸"}</div>
        <p className="font-display font-bold text-sm">
          {files.length === 0
            ? "Drop screenshots here or click to upload"
            : `${files.length} / 6 screenshots added`}
        </p>
        <p className="text-muted-fg text-xs font-mono mt-1">
          PNG, JPG, WebP · Max 6 images
        </p>
      </div>

      {/* Previews */}
      {files.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {files.map((file, idx) => (
            <div key={idx} className="relative group rounded-lg overflow-hidden aspect-video bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={URL.createObjectURL(file)}
                alt={file.name}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeFile(idx)}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-danger text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1.5 py-0.5 text-xs font-mono text-white truncate opacity-0 group-hover:opacity-100 transition-opacity">
                {file.name}
              </div>
            </div>
          ))}
          {files.length < 6 && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="aspect-video rounded-lg border-2 border-dashed border-border hover:border-accent/50 flex items-center justify-center text-muted-fg hover:text-accent transition-colors"
            >
              <span className="text-2xl">+</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Step 3: Style + Aspect Ratio ─────────────────────────────────────────────

function Step3({
  state,
  update,
  onBack,
  onSubmit,
  submitting,
}: {
  state: WizardState;
  update: (p: Partial<WizardState>) => void;
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  return (
    <div className="space-y-6 stagger-children">
      <div>
        <h2 className="font-display text-2xl font-bold mb-1">Set the vibe</h2>
        <p className="text-muted-fg text-sm font-mono">
          Choose a visual style and format for your video.
        </p>
      </div>

      {/* Style presets */}
      <div>
        <label className="block text-sm font-mono text-muted-fg mb-2">
          Style preset
        </label>
        <div className="grid grid-cols-3 gap-3">
          {STYLE_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => update({ stylePreset: preset.value })}
              className={`
                p-4 rounded-xl border text-left transition-all duration-200
                ${state.stylePreset === preset.value
                  ? "border-accent bg-accent/10"
                  : "border-border bg-muted/50 hover:border-accent/40"}
              `}
            >
              {/* Color swatch */}
              <div
                className="w-6 h-6 rounded-full mb-3 border-2 border-white/20"
                style={{ background: preset.accent }}
              />
              <div className="font-display font-bold text-sm mb-1">{preset.label}</div>
              <div className="text-muted-fg text-xs font-mono leading-relaxed">
                {preset.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Aspect ratio */}
      <div>
        <label className="block text-sm font-mono text-muted-fg mb-2">
          Aspect ratio
        </label>
        <div className="flex gap-3">
          {ASPECT_RATIOS.map((ar) => (
            <button
              key={ar.value}
              type="button"
              onClick={() => update({ aspectRatio: ar.value })}
              className={`
                flex-1 flex items-center justify-center gap-3 py-3 rounded-lg border transition-all duration-200 font-mono text-sm
                ${state.aspectRatio === ar.value
                  ? "border-accent bg-accent/10 text-foreground"
                  : "border-border bg-muted/50 text-muted-fg hover:border-accent/40"}
              `}
            >
              <span className="text-xl">{ar.icon}</span>
              <div className="text-left">
                <div className="font-display font-bold text-sm">{ar.label}</div>
                <div className="text-xs opacity-60">{ar.value}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="rounded-lg bg-muted/50 border border-border p-4 text-sm font-mono space-y-1">
        <div className="text-muted-fg text-xs mb-2">Summary</div>
        <div><span className="text-muted-fg">Name: </span>{state.projectName}</div>
        {state.tagline && <div><span className="text-muted-fg">Tagline: </span>{state.tagline}</div>}
        <div><span className="text-muted-fg">Source: </span>{state.sourceType}</div>
        {state.screenshots.length > 0 && (
          <div><span className="text-muted-fg">Screenshots: </span>{state.screenshots.length}</div>
        )}
        <div><span className="text-muted-fg">Style: </span>{state.stylePreset}</div>
        <div><span className="text-muted-fg">Format: </span>{state.aspectRatio}</div>
      </div>

      <div className="flex justify-between pt-2">
        <button type="button" onClick={onBack} disabled={submitting} className="btn-ghost">
          ← Back
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className="btn-primary glow-accent min-w-36"
        >
          {submitting ? (
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Creating...
            </span>
          ) : (
            "Create Demo →"
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Shared ───────────────────────────────────────────────────────────────────

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-mono text-foreground">{label}</label>
      {hint && <p className="text-muted-fg text-xs font-mono">{hint}</p>}
      {children}
    </div>
  );
}

const inputClass =
  "w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm font-mono placeholder:text-muted-fg focus:outline-none focus:border-accent transition-colors";
