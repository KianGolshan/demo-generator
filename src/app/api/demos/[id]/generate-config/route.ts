import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { callClaude } from "@/lib/claude";
import type { ApiError, DemoConfig } from "@/types";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// ─── Zod Schema ───────────────────────────────────────────────────────────────

const DemoSceneSchema = z.object({
  type:            z.enum(["intro", "feature", "outro"]),
  durationSeconds: z.number().int().min(1).max(30),
  screenshotId:    z.string().nullable().optional(),
  headline:        z.string().min(1).max(120),
  body:            z.array(z.string().max(80)).max(3),
  cta:             z.string().max(100).nullable().optional(),
  technicalNote:   z.string().max(200).nullable().optional(),
});

const DemoConfigSchema = z.object({
  title:       z.string().min(1).max(100),
  tagline:     z.string().max(200),
  theme:       z.enum(["clean", "cyber", "playful"]),
  aspectRatio: z.enum(["16:9", "9:16"]),
  scenes:      z.array(DemoSceneSchema).min(2).max(8),
});

// ─── System Prompt (exact copy from spec) ─────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert product storyteller and motion designer for developer tools.

You will receive:
- projectSummary: user's description of the app and target audience
- features: array of { title, description } feature objects
- codeSummary: optional JSON describing stack, routes, features, and AI usage
- screenshots: array of { id, label } objects

Design a 45–60 second product demo with:
- 1 intro scene (title + tagline + hook)
- 2–4 feature scenes grounded in real flows from routes and features
- 1 outro scene (CTA + tech stack note)

Rules:
- Prefer concrete outcome-focused headlines ("Generate summaries from any PDF") over vague ones ("AI stuff")
- If codeSummary is present, ground scenes in real routes and features
- technicalNote in outro should list actual stack from codeSummary if available
- Body bullets: max 2 per scene, max 12 words each
- Total durationSeconds across all scenes: 45–60

Output ONLY a JSON object matching the DemoConfig shape:
{
  "title": string,
  "tagline": string,
  "theme": "clean" | "cyber" | "playful",
  "aspectRatio": "16:9" | "9:16",
  "scenes": [{
    "type": "intro" | "feature" | "outro",
    "durationSeconds": number,
    "screenshotId": string | null,
    "headline": string,
    "body": string[],
    "cta": string | null,
    "technicalNote": string | null
  }]
}

Tone: confident indie-hacker. Punchy. No corporate speak.`;

// ─── Route Handler ────────────────────────────────────────────────────────────

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/demos/[id]/generate-config
 * Composes a generation prompt from the DemoProject's data and calls Claude
 * to produce a DemoConfig (scene-by-scene outline). Validates the JSON with
 * Zod and saves it to DB. Updates renderStatus to "config_generated".
 *
 * @returns { demoConfig: DemoConfig }
 */
export async function POST(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;

    // Auth
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json<ApiError>(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    // Fetch demo
    const raw = await prisma.demoProject.findFirst({
      where: { id, userId: user.id },
    });

    if (!raw) {
      return NextResponse.json<ApiError>(
        { error: "Demo not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    const screenshotUrls = (raw.screenshotUrls as unknown as string[]) ?? [];
    const features = (raw.features as unknown as { title: string; description: string }[]) ?? [];
    const codeSummary = raw.codeSummary ?? null;

    // Build screenshots array for the prompt: { id, label }
    // We use the index as the screenshotId since they're positional URLs
    const screenshotsForPrompt = screenshotUrls.map((url, i) => ({
      id: String(i),
      label: `Screenshot ${i + 1} — ${url.split("/").pop() ?? "image"}`,
    }));

    // Compose user prompt
    const userPrompt = buildGenerationPrompt({
      projectName:  raw.projectName,
      tagline:      raw.tagline,
      description:  raw.description,
      stylePreset:  raw.stylePreset,
      features,
      codeSummary,
      screenshots:  screenshotsForPrompt,
    });

    // Call Claude
    let rawJson: string;
    try {
      rawJson = await callClaude({
        system:    SYSTEM_PROMPT,
        user:      userPrompt,
        maxTokens: 2000,
      });
    } catch (err) {
      console.error("[generate-config] Claude API error:", err);
      return NextResponse.json<ApiError>(
        { error: "AI generation failed. Please try again.", code: "CLAUDE_ERROR" },
        { status: 502 }
      );
    }

    // Parse and validate
    let demoConfig: DemoConfig;
    try {
      const jsonMatch = rawJson.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON object found in response");
      const parsed = DemoConfigSchema.parse(JSON.parse(jsonMatch[0]));
      demoConfig = parsed as DemoConfig;
    } catch {
      console.error("[generate-config] JSON parse failed. Raw:", rawJson.slice(0, 500));
      return NextResponse.json<ApiError>(
        { error: "AI returned an invalid outline. Please try again.", code: "PARSE_ERROR" },
        { status: 502 }
      );
    }

    // Save to DB
    await prisma.demoProject.update({
      where: { id },
      data:  {
        demoConfig:   demoConfig as unknown as Prisma.InputJsonValue,
        renderStatus: "config_generated",
      },
    });

    return NextResponse.json({ demoConfig });
  } catch (err) {
    console.error("[POST /api/demos/[id]/generate-config]", err);
    return NextResponse.json<ApiError>(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildGenerationPrompt(args: {
  projectName:  string;
  tagline:      string;
  description:  string;
  stylePreset:  string;
  features:     { title: string; description: string }[];
  codeSummary:  unknown;
  screenshots:  { id: string; label: string }[];
}): string {
  const summary = [args.projectName, args.tagline, args.description]
    .filter(Boolean)
    .join(" — ");

  return JSON.stringify(
    {
      projectSummary: summary || args.projectName,
      preferredTheme: args.stylePreset,
      features:       args.features,
      codeSummary:    args.codeSummary ?? null,
      screenshots:    args.screenshots,
    },
    null,
    2
  );
}
