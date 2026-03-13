export default function DemoDetailLoading() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
      {/* Back link */}
      <div className="h-4 w-24 rounded bg-muted animate-pulse" />

      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-8 w-56 rounded-lg bg-muted animate-pulse" />
          <div className="h-6 w-20 rounded-full bg-muted animate-pulse" />
        </div>
        <div className="h-4 w-80 rounded bg-muted animate-pulse" />
      </div>

      {/* Panels */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="h-5 w-32 rounded bg-muted animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 w-full rounded bg-muted animate-pulse" />
            <div className="h-4 w-5/6 rounded bg-muted animate-pulse" />
            <div className="h-4 w-4/6 rounded bg-muted animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
