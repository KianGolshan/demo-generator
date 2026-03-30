import Link from "next/link";

/**
 * About page — explains what DemoForge is, who it's for, and how it works.
 */
export default function AboutPage() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-border">
        <Link href="/" className="font-display text-xl font-bold tracking-tight text-foreground">
          Demo<span className="text-accent">Forge</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/login" className="btn-ghost text-sm">
            Sign in
          </Link>
          <Link href="/login" className="btn-primary text-sm">
            Get started →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center text-center px-6 py-20 border-b border-border">
        <div className="mb-6 inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent/30 bg-accent/10 text-accent text-xs font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          No video editing. No screen recording.
        </div>
        <h1 className="font-display text-5xl sm:text-6xl font-bold text-foreground leading-[1.05] mb-6 max-w-3xl">
          What is <span className="text-accent">DemoForge?</span>
        </h1>
        <p className="text-muted-fg text-lg max-w-2xl mb-0 leading-relaxed font-mono">
          DemoForge turns your GitHub repo into a polished product demo video — in minutes.
          Claude reads your code, understands what you built, and generates a custom animated
          video that shows it off. No editing timeline, no design skills required.
        </p>
      </section>

      {/* Who it's for */}
      <section className="px-6 py-20 border-b border-border">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-3xl font-bold text-center mb-4">Who it&apos;s for</h2>
          <p className="text-muted-fg text-sm font-mono text-center mb-12">
            Built for builders who ship fast and hate making slides.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 stagger-children">
            {[
              {
                icon: "⚡",
                title: "Indie hackers",
                body: "You shipped something real. Now show it off without spending a weekend making a demo video.",
              },
              {
                icon: "🤖",
                title: "AI-assisted builders",
                body: "Built with Cursor, Claude, or Copilot? DemoForge understands AI-assisted codebases and highlights what makes them different.",
              },
              {
                icon: "🚀",
                title: "Solo founders",
                body: "Launching on Product Hunt, posting to X, or pitching investors — a sharp demo video punches way above your weight.",
              },
            ].map((card) => (
              <div key={card.title} className="glass-card p-6">
                <div className="text-2xl mb-3">{card.icon}</div>
                <h3 className="font-display text-lg font-bold mb-2">{card.title}</h3>
                <p className="text-muted-fg text-sm leading-relaxed font-mono">{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-20 border-b border-border bg-muted/20">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-3xl font-bold text-center mb-4">How it works</h2>
          <p className="text-muted-fg text-sm font-mono text-center mb-12">
            Four steps from repo to MP4.
          </p>
          <div className="space-y-4">
            {[
              {
                step: "01",
                title: "Connect your project",
                body: "Create a project with a name and tagline. Paste your GitHub repo URL (public or private) and optionally upload reference screenshots.",
              },
              {
                step: "02",
                title: "Claude analyzes your code",
                body: "Octokit fetches your top files. Claude extracts your stack, routes, features, and real code snippets — building a deep understanding of what your app actually does.",
              },
              {
                step: "03",
                title: "Claude writes the demo",
                body: "Using your exact field names, column headers, button labels, and UI patterns, Claude generates a custom Remotion component that simulates your real interface — not generic placeholders.",
              },
              {
                step: "04",
                title: "Render & ship",
                body: "One click bundles and renders the component server-side into an MP4 you can download or share via a public link. No installs, no timeline scrubbing.",
              },
            ].map((item) => (
              <div key={item.step} className="glass-card p-6 flex gap-6 items-start">
                <div className="font-mono text-accent text-2xl font-bold shrink-0 w-10">{item.step}</div>
                <div>
                  <h3 className="font-display text-lg font-bold mb-1">{item.title}</h3>
                  <p className="text-muted-fg text-sm leading-relaxed font-mono">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The AI pipeline */}
      <section className="px-6 py-20 border-b border-border">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-3xl font-bold text-center mb-4">The AI pipeline</h2>
          <p className="text-muted-fg text-sm font-mono text-center mb-12">
            Not a template filler. Claude writes code specific to your app.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              {
                label: "Extract",
                color: "border-accent/30 bg-accent/5",
                labelColor: "text-accent",
                body: "Claude reads your actual source files and pulls out real strings — button labels, column headers, API route names, domain terminology. Nothing is made up.",
              },
              {
                label: "Simulate",
                color: "border-accent/30 bg-accent/5",
                labelColor: "text-accent",
                body: "Claude builds custom React components that look like your real UI — a search form with your actual placeholder text, a table with your actual data columns.",
              },
              {
                label: "Animate",
                color: "border-border bg-muted/30",
                labelColor: "text-muted-fg",
                body: "Components are assembled into a Remotion composition with spring animations, typewriter effects, and scene transitions — then rendered server-side to MP4.",
              },
              {
                label: "No screenshots in the video",
                color: "border-border bg-muted/30",
                labelColor: "text-muted-fg",
                body: "Reference screenshots help Claude understand your visual layout. The video itself is pure code — sharper, faster to render, and never blurry.",
              },
            ].map((item) => (
              <div key={item.label} className={`rounded-xl border p-6 ${item.color}`}>
                <div className={`text-xs font-mono font-bold mb-2 uppercase tracking-wider ${item.labelColor}`}>
                  {item.label}
                </div>
                <p className="text-sm font-mono text-muted-fg leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing / BYOK */}
      <section className="px-6 py-20 border-b border-border bg-muted/20">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-3xl font-bold mb-4">No subscription. No markup.</h2>
          <p className="text-muted-fg text-sm font-mono mb-10 leading-relaxed">
            Get one free demo generation on us. After that, bring your own Anthropic API key.
            You pay Anthropic directly — roughly $0.50 per video at current rates.
            DemoForge never marks up your AI costs.
          </p>
          <div className="glass-card p-8 text-left space-y-3 mb-8">
            {[
              "Your API key is encrypted at rest with AES-256-GCM",
              "Only used when you trigger a generation — never in the background",
              "Repo analysis always uses the app key (free for you)",
              "Delete your key anytime from account settings",
            ].map((point) => (
              <div key={point} className="flex items-start gap-3 text-sm font-mono text-muted-fg">
                <span className="text-accent shrink-0 mt-0.5">✓</span>
                <span>{point}</span>
              </div>
            ))}
          </div>
          <Link href="/login" className="btn-primary glow-accent px-8 py-3 text-base inline-block">
            Try it free →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-8 py-6 border-t border-border flex items-center justify-between text-muted-fg text-xs font-mono">
        <Link href="/" className="hover:text-foreground transition-colors">DemoForge</Link>
        <span>Built with Claude + Remotion</span>
      </footer>
    </main>
  );
}
