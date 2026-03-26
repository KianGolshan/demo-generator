import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import dynamic from "next/dynamic";
import { Nav } from "@/components/Nav";
import { StatusBadge } from "@/components/StatusBadge";
import { RepoPanel } from "@/components/RepoPanel";
import { OutlinePanel } from "@/components/OutlinePanel";
import { RenderPanel } from "@/components/RenderPanel";
import { GenerateCompositionPanel } from "@/components/GenerateCompositionPanel";
import { IteratePanel } from "@/components/IteratePanel";
import type { DemoProject, RenderStatus } from "@/types";
import Link from "next/link";

// Dynamically import the player to avoid SSR — Remotion uses browser APIs
const DemoPlayer = dynamic(
  () => import("@/components/DemoPlayer").then((m) => m.DemoPlayer),
  { ssr: false, loading: () => <PlayerSkeleton /> }
);

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
    demoConfig:     raw.demoConfig     != null ? (raw.demoConfig     as unknown as DemoProject["demoConfig"])     : undefined,
    generatedCode:  raw.generatedCode  != null ? (raw.generatedCode  as string)                                  : undefined,
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

          {/* Generate Demo (code-gen pipeline) — primary path when repo is analyzed */}
          <GenerateCompositionSection demo={demo} />

          {/* Iterate on the generated demo */}
          <IteratePanel demoId={demo.id} hasGeneratedCode={!!demo.generatedCode} />

          {/* Generate outline (JSON config pipeline) — alternative / screenshot-only path */}
          <OutlinePanelSection demo={demo} />

          {/* In-browser preview — shown once a JSON config exists */}
          {demo.demoConfig && (
            <section className="glass-card p-6">
              <h2 className="font-display text-lg font-bold mb-1">Preview</h2>
              <p className="text-muted-fg text-xs font-mono mb-4">
                In-browser preview of your demo. Click to play.
              </p>
              <DemoPlayer
                config={demo.demoConfig}
                screenshotUrls={demo.screenshotUrls}
              />
            </section>
          )}

          {/* Render */}
          <RenderPanelSection demo={demo} />

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
  const hasRepo = demo.sourceType === "repo" || demo.sourceType.includes("repo");
  if (!hasRepo) return null;

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

// ─── Generate Composition Section ────────────────────────────────────────────

function GenerateCompositionSection({ demo }: { demo: DemoProject }) {
  // Show for any source type that includes repo analysis
  const hasRepo = demo.sourceType === "repo" || demo.sourceType.includes("repo");
  if (!hasRepo) return null;

  return (
    <section className="glass-card p-6 border-accent/20">
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <h2 className="font-display text-lg font-bold">Generate Demo</h2>
          <span className="status-badge border border-accent/40 bg-accent/10 text-accent text-xs font-mono">
            AI code gen
          </span>
        </div>
        <p className="text-muted-fg text-xs font-mono">
          {demo.generatedCode
            ? "Claude wrote a custom Remotion video for your app — ready to render."
            : "Claude reads your codebase and writes a custom animated video. No templates."}
        </p>
      </div>
      <GenerateCompositionPanel
        demoId={demo.id}
        hasRepoAnalysis={!!demo.codeSummary}
        hasGeneratedCode={!!demo.generatedCode}
        generatedCode={demo.generatedCode}
      />
    </section>
  );
}

// ─── Outline Panel (wired to OutlinePanel client component) ──────────────────

function OutlinePanelSection({ demo }: { demo: DemoProject }) {
  const canGenerate = Boolean(
    demo.screenshotUrls.length > 0 || demo.sourceUrl || demo.codeSummary
  );

  // When code-gen is active and no JSON config exists, collapse this section
  const hasCodeGen = demo.sourceType.includes("repo");
  if (hasCodeGen && !demo.demoConfig) return null;

  return (
    <section className="glass-card p-6">
      <div className="mb-4">
        <h2 className="font-display text-lg font-bold">
          Demo Outline
          {hasCodeGen && (
            <span className="ml-2 text-muted-fg text-xs font-mono font-normal">(alternative)</span>
          )}
        </h2>
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

// ─── Render Panel (wired to RenderPanel client component) ────────────────────

function RenderPanelSection({ demo }: { demo: DemoProject }) {
  return (
    <section className="glass-card p-6">
      <h2 className="font-display text-lg font-bold mb-1">Render Video</h2>
      <p className="text-muted-fg text-xs font-mono mb-4">
        Export a polished MP4 from your demo outline.
      </p>
      <RenderPanel
        demoId={demo.id}
        initialStatus={demo.renderStatus}
        initialVideoUrl={demo.videoUrl}
      />
    </section>
  );
}

// ─── Player Skeleton ──────────────────────────────────────────────────────────

function PlayerSkeleton() {
  return (
    <div className="w-full aspect-video rounded-xl bg-muted animate-pulse flex items-center justify-center">
      <span className="text-muted-fg text-xs font-mono">Loading player...</span>
    </div>
  );
}
