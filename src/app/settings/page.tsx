import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Nav } from "@/components/Nav";
import { ApiKeyForm } from "@/components/ApiKeyForm";
import { getUserProfile } from "@/lib/userProfile";

type Props = { searchParams: Promise<{ from?: string }> };

export default async function SettingsPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getUserProfile(user.id);
  const { from } = await searchParams;
  const returnTo = from ? `/demos/${from}` : undefined;

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <main className="flex-1 px-6 py-10 max-w-2xl mx-auto w-full">
        <div className="mb-8 animate-fade-up">
          <h1 className="font-display text-3xl font-bold mb-1">Settings</h1>
          <p className="text-muted-fg text-sm font-mono">Manage your account preferences.</p>
        </div>

        <div className="space-y-4 stagger-children">
          {/* Free tier usage */}
          <section className="glass-card p-6">
            <h2 className="font-display text-lg font-bold mb-1">Free Tier</h2>
            <p className="text-muted-fg text-xs font-mono mb-4">
              You get 1 free demo generation. After that, add your own Anthropic API key.
            </p>
            <div className="flex items-center gap-4">
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all"
                  style={{ width: `${Math.min(100, (profile?.freeGenerationsUsed ?? 0) * 100)}%` }}
                />
              </div>
              <span className="text-xs font-mono text-muted-fg tabular-nums">
                {profile?.freeGenerationsUsed ?? 0} / 1 used
              </span>
            </div>
          </section>

          {/* API key */}
          <section className="glass-card p-6">
            <h2 className="font-display text-lg font-bold mb-1">Anthropic API Key</h2>
            <p className="text-muted-fg text-xs font-mono mb-4">
              Add your own key so you can generate and iterate on unlimited demos.
              Get one at{" "}
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                console.anthropic.com
              </a>
              . Your key is encrypted at rest and never exposed to the browser.
            </p>
            <ApiKeyForm hasApiKey={!!profile?.anthropicApiKey} returnTo={returnTo} />
          </section>
        </div>
      </main>
    </div>
  );
}
