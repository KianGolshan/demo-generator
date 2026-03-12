/**
 * /demos/new — 3-step wizard to create a new demo project.
 * TODO (Slice 2): Build full wizard UI (name/tagline, screenshots, style preset).
 */
export default function NewDemoPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="glass-card w-full max-w-2xl p-10 animate-scale-in">
        <h1 className="font-display text-3xl font-bold mb-2">New Demo</h1>
        <p className="text-muted-fg text-sm font-mono mb-8">
          3-step wizard — coming in Slice 2
        </p>
        {/* TODO (Slice 2): Step indicator + wizard steps */}
        <div className="h-32 rounded-lg border border-dashed border-border flex items-center justify-center">
          <span className="text-muted-fg text-xs font-mono">Wizard placeholder</span>
        </div>
      </div>
    </main>
  );
}
