import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Nav } from "@/components/Nav";
import { NewDemoWizard } from "./NewDemoWizard";

/**
 * /demos/new — 3-step wizard to create a new DemoProject.
 * Redirects unauthenticated users to /login.
 */
export default async function NewDemoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <main className="flex-1 px-6 py-12">
        <div className="max-w-2xl mx-auto mb-8">
          <h1 className="font-display text-3xl font-bold mb-1">New Demo</h1>
          <p className="text-muted-fg text-sm font-mono">
            Turn your project into a polished video demo.
          </p>
        </div>
        <NewDemoWizard />
      </main>
    </div>
  );
}
