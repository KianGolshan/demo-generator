import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";
import Link from "next/link";

/**
 * Global navigation bar — server component.
 * Shows logo, dashboard link, and auth state (user avatar + sign out).
 */
export async function Nav() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const avatarUrl =
    user?.user_metadata?.avatar_url as string | undefined;
  const name =
    (user?.user_metadata?.name ?? user?.email ?? "User") as string;

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between px-6 py-4 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="flex items-center gap-6">
        <Link
          href="/demos"
          className="font-display text-lg font-bold text-foreground hover:text-accent transition-colors"
        >
          Demo<span className="text-accent">Forge</span>
        </Link>
        <nav className="hidden sm:flex items-center gap-1">
          <Link
            href="/demos"
            className="px-3 py-1.5 rounded-md text-muted-fg text-sm font-mono hover:text-foreground hover:bg-muted transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/settings"
            className="px-3 py-1.5 rounded-md text-muted-fg text-sm font-mono hover:text-foreground hover:bg-muted transition-colors"
          >
            Settings
          </Link>
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/demos/new"
          className="btn-primary text-sm py-2 px-4"
        >
          + New Demo
        </Link>

        {user && (
          <div className="flex items-center gap-2">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={name}
                className="w-8 h-8 rounded-full border border-border"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xs font-display font-bold">
                {name.charAt(0).toUpperCase()}
              </div>
            )}
            <form action={signOut}>
              <button
                type="submit"
                className="text-muted-fg text-xs font-mono hover:text-foreground transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
