import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { callClaude } from "@/lib/claude";
import { getUserApiKey } from "@/lib/userProfile";
import type { ApiError } from "@/types";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const BodySchema = z.object({
  message: z.string().min(1).max(1000),
});

const ITERATE_SYSTEM = `You are an expert Remotion video engineer. You will be given a complete Remotion TSX file and a change request.

Your job: produce an updated version of the file that incorporates the requested change.

Rules:
- Return ONLY the complete updated TypeScript/TSX file. No markdown fences, no explanation.
- Keep all required exports: GENERATED_DURATION, GENERATED_FPS, GENERATED_WIDTH, GENERATED_HEIGHT, GeneratedDemo
- Preserve the overall structure, scene count, and animation quality unless the change explicitly affects them
- The change should be surgical — only modify what the user asked about`;

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/demos/[id]/iterate
 * Takes a plain-language change request and applies it to the existing generated TSX.
 * Requires the user's own Anthropic API key (free tier does not cover iterations).
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json<ApiError>({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json<ApiError>(
        { error: parsed.error.issues[0]?.message ?? "Invalid request", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const demo = await prisma.demoProject.findFirst({
      where: { id, userId: user.id },
      select: { id: true, generatedCode: true },
    });

    if (!demo) {
      return NextResponse.json<ApiError>({ error: "Demo not found", code: "NOT_FOUND" }, { status: 404 });
    }

    if (!demo.generatedCode) {
      return NextResponse.json<ApiError>(
        { error: "Generate a demo first before iterating.", code: "NO_GENERATED_CODE" },
        { status: 422 }
      );
    }

    // Iterations always require the user's own API key
    const userApiKey = await getUserApiKey(user.id);
    if (!userApiKey) {
      return NextResponse.json<ApiError>(
        {
          error: "Add your Anthropic API key in Settings to iterate on demos.",
          code: "API_KEY_REQUIRED",
        },
        { status: 402 }
      );
    }

    const userPrompt = `Here is the current Remotion TSX file:\n\n${demo.generatedCode}\n\n---\n\nChange request: ${parsed.data.message}\n\nReturn the complete updated TSX file.`;

    let updatedCode: string;
    try {
      updatedCode = await callClaude({
        system:    ITERATE_SYSTEM,
        user:      userPrompt,
        maxTokens: 8000,
        apiKey:    userApiKey,
      });
    } catch (err) {
      console.error("[iterate] Claude API error:", err);
      return NextResponse.json<ApiError>(
        { error: "AI iteration failed. Check your API key and try again.", code: "CLAUDE_ERROR" },
        { status: 502 }
      );
    }

    // Strip markdown fences
    const cleaned = updatedCode
      .replace(/^```(?:tsx?|typescript)?\n?/i, "")
      .replace(/\n?```\s*$/i, "")
      .trim();

    if (!cleaned.includes("GeneratedDemo") || !cleaned.includes("GENERATED_DURATION")) {
      return NextResponse.json<ApiError>(
        { error: "AI returned invalid code. Please try again.", code: "PARSE_ERROR" },
        { status: 502 }
      );
    }

    await prisma.demoProject.update({
      where: { id },
      data: { generatedCode: cleaned, renderStatus: "config_generated" },
    });

    return NextResponse.json({ generatedCode: cleaned });
  } catch (err) {
    console.error("[POST /api/demos/[id]/iterate]", err);
    return NextResponse.json<ApiError>({ error: "Internal server error", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
