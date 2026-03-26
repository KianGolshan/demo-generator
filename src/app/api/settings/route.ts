import { createClient } from "@/lib/supabase/server";
import { getUserProfile, saveUserApiKey } from "@/lib/userProfile";
import type { ApiError } from "@/types";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const PatchSchema = z.object({
  anthropicApiKey: z.string().min(1).startsWith("sk-ant-", {
    message: "API key must start with sk-ant-",
  }),
});

/**
 * GET /api/settings
 * Returns the current user's profile: whether they have an API key (masked) and free gen count.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json<ApiError>({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const profile = await getUserProfile(user.id);

  return NextResponse.json({
    hasApiKey: !!profile?.anthropicApiKey,
    freeGenerationsUsed: profile?.freeGenerationsUsed ?? 0,
    freeGenerationsTotal: 1,
  });
}

/**
 * PATCH /api/settings
 * Saves (or clears) the user's Anthropic API key.
 */
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json<ApiError>({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json<ApiError>(
      { error: parsed.error.issues[0]?.message ?? "Invalid API key", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  await saveUserApiKey(user.id, parsed.data.anthropicApiKey);

  return NextResponse.json({ success: true });
}
