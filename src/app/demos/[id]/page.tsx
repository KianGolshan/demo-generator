/**
 * /demos/[id] — Demo detail page: shows project info, repo analysis,
 * generated outline, and render controls.
 * TODO (Slice 2): Build status-aware layout shell.
 */
export default async function DemoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="min-h-screen px-8 py-12">
      <div className="max-w-4xl mx-auto">
        <p className="text-muted-fg font-mono text-xs mb-4">demo / {id}</p>
        <h1 className="font-display text-3xl font-bold mb-8">Demo Detail</h1>

        {/* TODO (Slice 2): Project info panel */}
        {/* TODO (Slice 3): Repo analysis panel */}
        {/* TODO (Slice 4): Generate config panel */}
        {/* TODO (Slice 5): Remotion player preview */}
        {/* TODO (Slice 6): Render controls + video player */}

        <div className="glass-card p-12 text-center">
          <p className="text-muted-fg font-mono text-sm">
            Detail page shell — coming in Slice 2
          </p>
        </div>
      </div>
    </main>
  );
}
