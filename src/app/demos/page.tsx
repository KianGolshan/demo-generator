/**
 * /demos — Dashboard listing all of the user's demo projects.
 * TODO (Slice 7): Build full dashboard grid with cards, status badges, actions.
 */
export default function DemosDashboard() {
  return (
    <main className="min-h-screen px-8 py-12">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <h1 className="font-display text-3xl font-bold">Your Demos</h1>
          {/* TODO (Slice 2): Link to /demos/new */}
          <button className="btn-primary" disabled>
            + New Demo
          </button>
        </div>

        {/* TODO (Slice 7): Demo cards grid */}
        <div className="glass-card p-12 text-center">
          <p className="text-muted-fg font-mono text-sm">Dashboard — coming in Slice 7</p>
        </div>
      </div>
    </main>
  );
}
