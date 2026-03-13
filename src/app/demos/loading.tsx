export default function DemosLoading() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-40 rounded-lg bg-muted animate-pulse" />
        <div className="h-10 w-32 rounded-lg bg-muted animate-pulse" />
      </div>

      {/* Cards grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 rounded bg-muted animate-pulse" />
              <div className="h-5 w-16 rounded-full bg-muted animate-pulse" />
            </div>
            <div className="h-5 w-3/4 rounded bg-muted animate-pulse" />
            <div className="h-4 w-full rounded bg-muted animate-pulse" />
            <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
            <div className="pt-2 h-8 w-full rounded-lg bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
