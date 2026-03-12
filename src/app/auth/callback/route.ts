import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * Supabase Auth callback handler.
 * After GitHub OAuth or magic link, Supabase redirects here with a `code` param.
 * We exchange it for a session, then redirect to the dashboard.
 *
 * @param request - Incoming GET request with `code` and optional `next` query params.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/demos";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // If anything goes wrong, redirect to login with an error flag
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
