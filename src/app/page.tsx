import Link from "next/link";

/**
 * Landing page — marketing hero with CTA to sign up or go to dashboard.
 * Unauthenticated users see the full landing page.
 * Authenticated users are better served by /demos — middleware handles redirect there.
 */
export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-border">
        <span className="font-display text-xl font-bold tracking-tight text-foreground">
          Demo<span className="text-accent">Forge</span>
        </span>
        <div className="flex items-center gap-3">
          <Link href="/about" className="btn-ghost text-sm">
            About
          </Link>
          <Link href="/login" className="btn-ghost text-sm">
            Sign in
          </Link>
          <Link href="/login" className="btn-primary text-sm">
            Get started →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24 stagger-children">
        {/* Badge */}
        <div className="mb-6 inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent/30 bg-accent/10 text-accent text-xs font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          Powered by Claude AI + Remotion
        </div>

        <h1 className="font-display text-5xl sm:text-7xl font-bold text-foreground leading-[1.05] mb-6 max-w-3xl">
          Ship demos that{" "}
          <span className="text-accent">hit different.</span>
        </h1>

        <p className="text-muted-fg text-lg sm:text-xl max-w-xl mb-10 leading-relaxed font-mono">
          Drop in your screenshots or GitHub repo. Get a polished 60-second
          product demo video — in minutes.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/login" className="btn-primary glow-accent px-8 py-3 text-base">
            Start building for free
          </Link>
          <Link href="#how-it-works" className="btn-ghost px-8 py-3 text-base">
            See how it works
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="px-6 py-20 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-3xl font-bold text-center mb-16">
            From vibe to video in 3 steps
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 stagger-children">
            {[
              {
                step: "01",
                title: "Drop your project",
                body: "Upload screenshots or connect your GitHub repo. Add a name and tagline.",
              },
              {
                step: "02",
                title: "Claude builds the story",
                body: "AI analyzes your code and screenshots, then generates a scene-by-scene outline.",
              },
              {
                step: "03",
                title: "Render & ship",
                body: "One click renders an MP4 you can post anywhere. Edit scenes inline before rendering.",
              },
            ].map((item) => (
              <div key={item.step} className="glass-card p-6">
                <div className="font-mono text-accent text-sm mb-3">{item.step}</div>
                <h3 className="font-display text-lg font-bold mb-2">{item.title}</h3>
                <p className="text-muted-fg text-sm leading-relaxed font-mono">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="px-6 py-20 border-t border-border bg-muted/20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-3xl font-bold mb-4">Simple pricing</h2>
          <p className="text-muted-fg text-sm font-mono mb-12">
            No subscriptions. Bring your own Anthropic key and pay only for what you use.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-left">
            {/* Free tier */}
            <div className="glass-card p-8">
              <div className="font-mono text-accent text-xs mb-4">FREE</div>
              <div className="font-display text-3xl font-bold mb-1">$0</div>
              <p className="text-muted-fg text-sm font-mono mb-6">to get started</p>
              <ul className="space-y-3 text-sm font-mono text-muted-fg">
                {[
                  "1 free demo generation",
                  "Full repo analysis",
                  "MP4 download",
                  "Public share link",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <span className="text-accent">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/login" className="btn-primary w-full text-center mt-8 block">
                Start for free →
              </Link>
            </div>

            {/* BYOK tier */}
            <div className="glass-card p-8 border-accent/30">
              <div className="font-mono text-accent text-xs mb-4">BYOK</div>
              <div className="font-display text-3xl font-bold mb-1">~$0.50</div>
              <p className="text-muted-fg text-sm font-mono mb-6">per video with your Anthropic key</p>
              <ul className="space-y-3 text-sm font-mono text-muted-fg">
                {[
                  "Unlimited generations",
                  "Unlimited iterations",
                  "Your key, your cost",
                  "No markup, no subscription",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <span className="text-accent">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost w-full text-center mt-8 block text-sm"
              >
                Get an Anthropic key →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-8 py-6 border-t border-border flex items-center justify-between text-muted-fg text-xs font-mono">
        <span>DemoForge</span>
        <span>Built with Claude + Remotion</span>
      </footer>
    </main>
  );
}
