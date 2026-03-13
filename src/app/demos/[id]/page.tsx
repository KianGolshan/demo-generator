import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { Nav } from "@/components/Nav";
import { StatusBadge } from "@/components/StatusBadge";
import { RepoPanel } from "@/components/RepoPanel";
import { OutlinePanel } from "@/components/OutlinePanel";
import type { DemoProject, RenderStatus } from "@/types";
import Link from "next/link";

type RouteProps = { params: Promise<{ id: string }> };

/**
 * /demos/[id] — Demo detail page.
 * Server component that fetches the DemoProject and renders a status-aware layout.
 * Each section (repo analysis, outline, render) is progressively revealed as the project advances.
 */
export default async function DemoDetailPage({ params }: RouteProps) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const raw = await prisma.demoProject.findFirst({
    where: { id, userId: user.id },
  });

  if (!raw) notFound();

  // Cast the Prisma record to our typed interface
  const demo: DemoProject = {
    id:             raw.id,
    userId:         raw.userId,
    projectName:    raw.projectName,
    tagline:        raw.tagline,
    description:    raw.description,
    sourceType:     raw.sourceType as DemoProject["sourceType"],
    sourceUrl:      raw.sourceUrl ?? undefined,
    screenshotUrls: (raw.screenshotUrls as unknown as string[]) ?? [],
    stylePreset:    raw.stylePreset as DemoProject["stylePreset"],
    features:       (raw.features as unknown as DemoProject["features"]) ?? [],
    codeSummary:    raw.codeSummary != null ? (raw.codeSummary as unknown as DemoProject["codeSummary"]) : undefined,
    demoConfig:     raw.demoConfig != null ? (raw.demoConfig as unknown as DemoProject["demoConfig"]) : undefined,
    renderStatus:   raw.renderStatus as RenderStatus,
    videoUrl:       raw.videoUrl ?? undefined,
    createdAt:      raw.createdAt.toISOString(),
    updatedAt:      raw.updatedAt.toISOString(),
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <main className="flex-1 px-6 py-10 max-w-4xl mx-auto w-full">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-muted-fg text-xs font-mono mb-6">
          <Link href="/demos" className="hover:text-foreground transition-colors">demos</Link>
          <span>/</span>
          <span className="text-foreground">{demo.projectName}</span>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8 animate-fade-up">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="font-display text-3xl font-bold">{demo.projectName}</h1>
              <StatusBadge status={demo.renderStatus} />
            </div>
            {demo.tagline && (
              <p className="text-muted-fg font-mono text-sm">{demo.tagline}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="status-badge border border-border text-muted-fg font-mono text-xs">
              {demo.stylePreset}
            </span>
            <span className="status-badge border border-border text-muted-fg font-mono text-xs">
              {demo.demoConfig?.aspectRatio ?? "16:9"}
            </span>
          </div>
        </div>

        <div className="space-y-4 stagger-children">

          {/* Project info panel */}
          <ProjectInfoPanel demo={demo} />

          {/* Screenshots */}
          {demo.screenshotUrls.length > 0 && (
            <ScreenshotsPanel urls={demo.screenshotUrls} />
          )}

          {/* Repo analysis */}
          <RepoPanelSection demo={demo} />

          {/* Generate outline */}
          <OutlinePanelSection demo={demo} />

          {/* Render — Slice 6 */}
          <RenderPanel demo={demo} />

        </div>
      </main>
    </div>
  );
}

// ─── Project Info Panel ───────────────────────────────────────────────────────

function ProjectInfoPanel({ demo }: { demo: DemoProject }) {
  return (
    <section className="glass-card p-6">
      <h2 className="font-display text-lg font-bold mb-4">Project Info</h2>
      <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm font-mono">
        {demo.description && (
          <div className="col-span-2">
            <dt className="text-muted-fg text-xs mb-1">Description</dt>
            <dd className="text-foreground leading-relaxed">{demo.description}</dd>
          </div>
        )}
        <div>
          <dt className="text-muted-fg text-xs mb-1">Source type</dt>
          <dd>{demo.sourceType}</dd>
        </div>
        {demo.sourceUrl && (
          <div>
            <dt className="text-muted-fg text-xs mb-1">URL</dt>
            <dd>
              <a
                href={demo.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline truncate block max-w-xs"
              >
                {demo.sourceUrl}
              </a>
            </dd>
          </div>
        )}
        <div>
          <dt className="text-muted-fg text-xs mb-1">Style</dt>
          <dd className="capitalize">{demo.stylePreset}</dd>
        </div>
        <div>
          <dt className="text-muted-fg text-xs mb-1">Created</dt>
          <dd>{new Date(demo.createdAt).toLocaleDateString()}</dd>
        </div>
      </dl>
    </section>
  );
}

// ─── Screenshots Panel ────────────────────────────────────────────────────────

function ScreenshotsPanel({ urls }: { urls: string[] }) {
  return (
    <section className="glass-card p-6">
      <h2 className="font-display text-lg font-bold mb-4">
        Screenshots
        <span className="ml-2 text-muted-fg text-sm font-mono font-normal">
          {urls.length} / 6
        </span>
      </h2>
      <div className="grid grid-cols-3 gap-3">
        {urls.map((url, i) => (
          <a key={i} href={url} target="_blank" rel="noopener noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`Screenshot ${i + 1}`}
              className="w-full aspect-video object-cover rounded-lg border border-border hover:border-accent transition-colors"
            />
          </a>
        ))}
      </div>
    </section>
  );
}

// ─── Repo Panel (wired to RepoPanel client component) ────────────────────────

function RepoPanelSection({ demo }: { demo: DemoProject }) {
  const hasAnalysis = !!demo.codeSummary;

  return (
    <section className="glass-card p-6">
      <h2 className="font-display text-lg font-bold mb-1">Repo Analysis</h2>
      <p className="text-muted-fg text-xs font-mono mb-4">
        {hasAnalysis
          ? "Analysis complete — Claude read your codebase."
          : "Paste a GitHub repo to let Claude analyze your stack, routes, and features."}
      </p>
      <RepoPanel
        demoId={demo.id}
        codeSummary={demo.codeSummary}
        hasRepoSourceType={demo.sourceType.includes("repo")}
      />
    </section>
  );
}

// ─── Outline Panel (wired to OutlinePanel client component) ──────────────────

function OutlinePanelSection({ demo }: { demo: DemoProject }) {
  const canGenerate = Boolean(
    demo.screenshotUrls.length > 0 || demo.sourceUrl || demo.codeSummary
  );

  return (
    <section className="glass-card p-6">
      <div className="mb-4">
        <h2 className="font-display text-lg font-bold">Demo Outline</h2>
        <p className="text-muted-fg text-xs font-mono">
          {demo.demoConfig
            ? "Scene-by-scene outline — click any text to edit, drag to reorder."
            : "Claude will write a scene plan from your project info."}
        </p>
      </div>
      <OutlinePanel
        demoId={demo.id}
        demoConfig={demo.demoConfig}
        canGenerate={canGenerate}
      />
    </section>
  );
}

// ─── Render Panel (Slice 6 placeholder) ──────────────────────────────────────

function RenderPanel({ demo }: { demo: DemoProject }) {
  const canRender = demo.renderStatus === "config_generated" || demo.renderStatus === "ready";

  return (
    <section className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display text-lg font-bold">Render Video</h2>
          <p className="text-muted-fg text-xs font-mono">
            {demo.renderStatus === "ready"
              ? "Your video is ready to download."
              : demo.renderStatus === "rendering"
              ? "Rendering in progress..."
              : "Generate an outline first, then render your MP4."}
          </p>
        </div>
        <button
          className="btn-primary text-sm opacity-50 cursor-not-allowed"
          disabled
          title="Coming in Slice 6"
        >
          Render →
        </button>
      </div>

      {demo.videoUrl ? (
        <video
          src={demo.videoUrl}
          controls
          className="w-full rounded-lg border border-border"
        />
      ) : (
        <div className="rounded-lg border border-dashed border-border p-6 text-center">
          <p className="text-muted-fg text-sm font-mono">
            {/* TODO (Slice 6): Render controls + video player */}
            Render engine — coming in Slice 6
          </p>
          {!canRender && (
            <p className="text-muted-fg text-xs font-mono mt-1 opacity-60">
              Complete the outline step first
            </p>
          )}
        </div>
      )}
    </section>
  );
}
