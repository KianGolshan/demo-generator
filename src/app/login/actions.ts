"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

/**
 * Initiates GitHub OAuth flow via Supabase Auth.
 * Redirects the user to GitHub's authorization page.
 */
export async function signInWithGitHub() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      scopes: "read:user user:email read:org",
    },
  });

  if (error || !data.url) {
    redirect("/login?error=oauth_failed");
  }

  redirect(data.url);
}

/**
 * Sends a magic link to the provided email address.
 *
 * @param formData - Must contain an `email` field.
 * @returns An object with an error message if the request failed, or null on success.
 */
export async function signInWithMagicLink(
  formData: FormData
): Promise<{ error: string } | null> {
  const email = formData.get("email");

  if (typeof email !== "string" || !email.includes("@")) {
    return { error: "Please enter a valid email address." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return null;
}

/**
 * Signs the current user out and redirects to the landing page.
 */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
