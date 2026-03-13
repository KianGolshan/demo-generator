import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Nav } from "@/components/Nav";
import { StatusBadge } from "@/components/StatusBadge";
import { DeleteDemoButton } from "@/components/DeleteDemoButton";
import type { RenderStatus } from "@/types";
import Link from "next/link";

/**
 * /demos — Dashboard listing all of the user's demo projects.
 * Server component — fetches the user's demos sorted by most recent.
 */
export default async function DemosDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const demos = await prisma.demoProject.findMany({
    where:   { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id:             true,
      projectName:    true,
      tagline:        true,
      stylePreset:    true,
      renderStatus:   true,
      screenshotUrls: true,
      createdAt:      true,
    },
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <main className="flex-1 px-6 py-10 max-w-5xl mx-auto w-full">

        {/* Header */}
        <div className="flex items-center justify-between mb-10 animate-fade-up">
          <div>
            <h1 className="font-display text-3xl font-bold">Your Demos</h1>
            <p className="text-muted-fg text-sm font-mono mt-1">
              {demos.length === 0
                ? "No demos yet — create your first one."
                : `${demos.length} demo${demos.length === 1 ? "" : "s"}`}
            </p>
          </div>
          <Link href="/demos/new" className="btn-primary glow-accent">
            + New Demo
          </Link>
        </div>

        {demos.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
            {demos.map((demo) => (
              <DemoCard key={demo.id} demo={demo} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Demo Card ────────────────────────────────────────────────────────────────

type DemoCardProps = {
  demo: {
    id: string;
    projectName: string;
    tagline: string;
    stylePreset: string;
    renderStatus: string;
    screenshotUrls: unknown;
    createdAt: Date;
  };
};

function DemoCard({ demo }: DemoCardProps) {
  const urls = (demo.screenshotUrls as string[]) ?? [];
  const thumb = urls[0];

  return (
    <div className="group glass-card overflow-hidden hover:border-accent/40 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/10 flex flex-col">
      <Link href={`/demos/${demo.id}`} className="flex-1 flex flex-col">
        {/* Thumbnail */}
        <div className="aspect-video bg-muted relative overflow-hidden">
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumb}
              alt={demo.projectName}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-3xl opacity-20">🎬</span>
            </div>
          )}
          {/* Style badge overlay */}
          <div className="absolute top-2 right-2">
            <span className="px-1.5 py-0.5 rounded text-xs font-mono bg-black/60 text-white capitalize">
              {demo.stylePreset}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 flex-1">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-display font-bold text-sm leading-tight group-hover:text-accent transition-colors">
              {demo.projectName}
            </h3>
            <StatusBadge status={demo.renderStatus as RenderStatus} />
          </div>
          {demo.tagline && (
            <p className="text-muted-fg text-xs font-mono leading-relaxed line-clamp-2">
              {demo.tagline}
            </p>
          )}
        </div>
      </Link>

      {/* Footer: date + delete */}
      <div className="px-4 pb-4 flex items-center justify-between">
        <p className="text-muted-fg text-xs font-mono opacity-60">
          {new Date(demo.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>
        <DeleteDemoButton demoId={demo.id} />
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="glass-card p-16 text-center animate-scale-in">
      <div className="text-5xl mb-4">🎬</div>
      <h2 className="font-display text-xl font-bold mb-2">No demos yet</h2>
      <p className="text-muted-fg text-sm font-mono mb-6 max-w-sm mx-auto">
        Create your first demo by uploading screenshots or connecting a GitHub repo.
      </p>
      <Link href="/demos/new" className="btn-primary glow-accent">
        Create your first demo →
      </Link>
    </div>
  );
}
