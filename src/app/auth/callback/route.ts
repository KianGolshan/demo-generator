import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "/demos";

  // Prevent open redirect: only allow relative paths starting with /
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/demos";

  // Use NEXT_PUBLIC_APP_URL rather than request.url origin.
  // Behind Railway's reverse proxy, request.url resolves to localhost internally,
  // which causes the post-auth redirect to land on localhost:3000 instead of production.
  const base = process.env.NEXT_PUBLIC_APP_URL!.replace(/\/$/, "");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${base}${next}`);
    }
  }

  return NextResponse.redirect(`${base}/login?error=auth_failed`);
}
