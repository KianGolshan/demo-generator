import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { CopyLinkButton } from "./ShareActions";

type RouteProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { id } = await params;
  const demo = await prisma.demoProject.findUnique({
    where: { id },
    select: { projectName: true, tagline: true },
  });
  if (!demo) return { title: "Demo" };

  const title = `${demo.projectName} — Demo`;
  const description = demo.tagline || "Watch this product demo built with DemoForge.";
  const ogImageUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/og?title=${encodeURIComponent(demo.projectName)}&sub=${encodeURIComponent(demo.tagline ?? "")}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: ogImageUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

/**
 * /share/[id] — Public shareable demo page. No auth required.
 * Shows the rendered video (if ready) and project info.
 */
export default async function SharePage({ params }: RouteProps) {
  const { id } = await params;

  const demo = await prisma.demoProject.findUnique({
    where: { id },
    select: {
      projectName: true,
      tagline:     true,
      description: true,
      stylePreset: true,
      renderStatus: true,
      videoUrl:    true,
    },
  });

  if (!demo) notFound();

  const isReady = demo.renderStatus === "ready" && demo.videoUrl;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Minimal header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border">
        <Link
          href="/demos"
          className="font-display text-lg font-bold text-foreground hover:text-accent transition-colors"
        >
          Demo<span className="text-accent">Forge</span>
        </Link>
        <Link href="/demos/new" className="btn-primary text-sm py-2 px-4">
          Build yours →
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 max-w-4xl mx-auto w-full">
        {/* Project title */}
        <div className="text-center mb-8 animate-fade-up">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border text-muted-fg text-xs font-mono mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" />
            {demo.stylePreset} theme
          </div>
          <h1 className="font-display text-4xl font-bold mb-2">{demo.projectName}</h1>
          {demo.tagline && (
            <p className="text-muted-fg text-lg font-mono">{demo.tagline}</p>
          )}
        </div>

        {/* Video or placeholder */}
        <div className="w-full animate-scale-in">
          {isReady ? (
            <div className="space-y-4">
              <video
                src={demo.videoUrl!}
                controls
                autoPlay
                className="w-full rounded-2xl border border-border shadow-2xl shadow-accent/10 bg-muted"
                style={{ maxHeight: "540px" }}
              />
              <div className="flex justify-center gap-3">
                <a
                  href={demo.videoUrl!}
                  download="demo.mp4"
                  className="btn-primary text-sm py-2 px-4"
                >
                  ↓ Download MP4
                </a>
                <CopyLinkButton />
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border p-16 text-center bg-muted/30">
              <div className="text-5xl mb-4">🎬</div>
              <p className="font-display text-xl font-bold mb-2">Video coming soon</p>
              <p className="text-muted-fg text-sm font-mono">
                This demo is still being generated. Check back shortly.
              </p>
            </div>
          )}
        </div>

        {demo.description && (
          <div className="mt-8 max-w-xl text-center">
            <p className="text-muted-fg text-sm font-mono leading-relaxed">{demo.description}</p>
          </div>
        )}

        {/* Made with DemoForge */}
        <div className="mt-12 text-center">
          <p className="text-muted-fg text-xs font-mono mb-2">Made with</p>
          <Link
            href="/demos/new"
            className="font-display text-sm font-bold text-foreground hover:text-accent transition-colors"
          >
            Demo<span className="text-accent">Forge</span>
          </Link>
          <p className="text-muted-fg text-xs font-mono mt-1">
            Generate a polished product demo video from your GitHub repo in minutes.
          </p>
          <Link href="/demos/new" className="btn-primary text-sm py-2 px-4 mt-3 inline-block">
            Try it free →
          </Link>
        </div>
      </main>
    </div>
  );
}

