import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LoginForm } from "./LoginForm";

/**
 * Login page — GitHub OAuth + magic link.
 * Redirects to /demos if already authenticated.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // Redirect authenticated users straight to dashboard
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/demos");

  const { error } = await searchParams;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      {/* Background grid */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <a href="/" className="font-display text-2xl font-bold text-foreground hover:text-accent transition-colors">
            Demo<span className="text-accent">Forge</span>
          </a>
          <p className="text-muted-fg text-sm font-mono mt-2">
            Sign in to start forging demos
          </p>
        </div>

        {/* Card */}
        <div className="glass-card p-8 animate-scale-in">
          {error && (
            <div className="mb-4 px-4 py-2.5 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs font-mono">
              {error === "auth_failed"
                ? "Authentication failed. Please try again."
                : "Something went wrong. Please try again."}
            </div>
          )}
          <LoginForm />
        </div>

        <p className="text-center text-muted-fg text-xs font-mono mt-6">
          By signing in, you agree to our terms of service.
        </p>
      </div>
    </main>
  );
}
