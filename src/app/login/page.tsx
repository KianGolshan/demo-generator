/**
 * Login page — Supabase Auth with GitHub OAuth + magic link.
 * TODO (Slice 2): wire up Supabase auth actions
 */
export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="glass-card w-full max-w-md p-8 animate-scale-in">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold mb-2">
            Demo<span className="text-accent">Forge</span>
          </h1>
          <p className="text-muted-fg text-sm font-mono">Sign in to start forging demos</p>
        </div>

        {/* TODO (Slice 2): Replace with real Supabase auth form */}
        <div className="space-y-3">
          <button className="btn-primary w-full py-3" disabled>
            Continue with GitHub
          </button>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-muted-fg text-xs font-mono">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <input
            type="email"
            placeholder="your@email.com"
            className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm font-mono placeholder:text-muted-fg focus:outline-none focus:border-accent"
            disabled
          />
          <button className="btn-ghost w-full py-3" disabled>
            Send magic link
          </button>
        </div>

        <p className="text-muted-fg text-xs text-center mt-6 font-mono">
          Auth coming in Slice 2
        </p>
      </div>
    </main>
  );
}
