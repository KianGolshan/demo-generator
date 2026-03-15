import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { callClaude } from "@/lib/claude";
import type { ApiError, CodeSummary, DemoConfig } from "@/types";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const BrowserStepSchema = z.object({
  frame:       z.number().int().min(0),
  type:        z.enum(["load", "type", "click", "result"]),
  label:       z.string(),
  fieldName:   z.string().optional(),
  fieldValue:  z.string().optional(),
  buttonLabel: z.string().optional(),
  resultText:  z.string().optional(),
});

const DemoSceneSchema = z.object({
  type:           z.enum(["hook", "code", "browser-flow", "terminal", "comparison", "end-card"]),
  durationFrames: z.number().int().min(60).max(300),

  // hook
  lines:      z.array(z.string()).optional(),
  accentLine: z.number().optional(),

  // code
  filename:       z.string().optional(),
  codeLines:      z.array(z.object({ content: z.string(), indent: z.number().optional() })).optional(),
  highlightLines: z.array(z.number()).optional(),
  errorLines:     z.array(z.number()).optional(),
  animateTyping:  z.boolean().optional(),

  // browser-flow
  url:   z.string().optional(),
  steps: z.array(BrowserStepSchema).optional(),

  // terminal
  terminalLines: z.array(z.object({ text: z.string(), isError: z.boolean().optional() })).optional(),

  // comparison
  leftTitle:  z.string().optional(),
  leftItems:  z.array(z.string()).optional(),
  rightTitle: z.string().optional(),
  rightItems: z.array(z.string()).optional(),

  // end-card / shared
  title:       z.string().optional(),
  headline:    z.string().optional(),
  overlayText: z.string().optional(),
  overlaySub:  z.string().optional(),
  tagline:     z.string().optional(),
  subtext:     z.string().optional(),
});

const DemoConfigSchema = z.object({
  title:       z.string().min(1).max(100),
  tagline:     z.string().max(200),
  theme:       z.enum(["clean", "cyber", "playful"]),
  aspectRatio: z.enum(["16:9", "9:16"]),
  scenes:      z.array(DemoSceneSchema).min(3).max(7),
});

// ─── System Prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert product video director for developer tools. You create Remotion video compositions that look like polished marketing demos — NOT slideshows with text over screenshots.

You will receive:
- projectSummary: app name, description, and target audience
- features: what the app does
- codeSummary: stack, routes, AI usage
- codeSnippets: actual code from the repo (use real code in "code" scenes!)

You output a DemoConfig JSON that drives a 45–70 second animated video with these scene types:

## Scene Types

### "hook" scene
Full-screen text. Use for opening problem statements and closing punchy lines.
- lines: 2-3 short punchy strings (stagger-animate with spring physics)
- accentLine: index of the most important line (larger, accent color)
- durationFrames: 60-90 (2-3 seconds)

### "code" scene
Shows actual code from the repo with syntax highlighting.
- filename: real filename from codeSnippets
- codeLines: array of { content, indent } — use REAL code from codeSnippets, shortened to 12-18 lines
- highlightLines: line numbers (1-indexed) of the most interesting lines
- animateTyping: true if you want text to type in
- overlayText: caption below the code (e.g. "Parses 500k+ filings with 3 API calls")
- durationFrames: 120-180 (4-6 seconds)

### "browser-flow" scene
Simulates a user doing something in the app. This is the HERO scene — use it to show the main value prop.
- url: the app domain/path shown in the browser bar
- steps: array of user actions, each with a frame offset when they trigger:
  - { frame: 0, type: "load", label: "App loads" }
  - { frame: 30, type: "type", fieldName: "Search ticker", fieldValue: "NVDA", label: "User searches..." }
  - { frame: 75, type: "click", buttonLabel: "Search", label: "Searching..." }
  - { frame: 90, type: "result", resultText: "13 funds\\nFidelity Select\\nVanguard Growth\\n...", label: "Results in 1.2s" }
- durationFrames: 150-240 (5-8 seconds)

### "terminal" scene
Shows CLI/API output streaming. Great for backend tools, APIs, AI pipelines.
- terminalLines: array of { text, isError? } — simulate real output your app would produce
- overlayText: what this demonstrates (e.g. "Zero config. Just works.")
- durationFrames: 120-180 (4-6 seconds)

### "comparison" scene
Side-by-side: old painful way vs. your app.
- headline: "Before vs. After" or similar
- leftTitle: "The old way" / leftItems: 3-5 painful manual steps
- rightTitle: "With [AppName]" / rightItems: 3-5 simple outcomes
- durationFrames: 120-150 (4-5 seconds)

### "end-card" scene
Final branded card. Always end with this.
- title: app name
- tagline: punchy one-liner
- subtext: e.g. "Built with Next.js + OpenAI"
- durationFrames: 90-120 (3-4 seconds)

## Composition Rules
1. Always start with a "hook" scene (the problem or the big claim)
2. Include at least one "browser-flow" scene — this is the money shot
3. Use "code" scene if the codeSnippets show interesting technical implementation
4. End with "end-card"
5. Total durationFrames across all scenes: 1350-2100 (45-70 seconds at 30fps)
6. Use REAL code from codeSnippets in "code" scenes, not placeholder code
7. Use REAL feature details — not generic buzzwords
8. For browser-flow steps, "result" resultText should be realistic data the app would return
9. Be specific and concrete. "Query 847 SEC filings" beats "fast search"

## Output format
Output ONLY a valid JSON object (no markdown, no explanation):
{
  "title": string,
  "tagline": string,
  "theme": "clean" | "cyber" | "playful",
  "aspectRatio": "16:9" | "9:16",
  "scenes": [DemoScene, ...]
}`;

// ─── Route Handler ─────────────────────────────────────────────────────────────

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/demos/[id]/generate-config
 * Composes a generation prompt from the DemoProject's data and calls Claude
 * to produce a DemoConfig using the new animated scene types.
 * Validates the JSON with Zod and saves it to DB.
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

    const features    = (raw.features    as unknown as { title: string; description: string }[]) ?? [];
    const codeSummary = (raw.codeSummary as unknown as CodeSummary | null) ?? null;

    // Compose user prompt
    const userPrompt = buildGenerationPrompt({
      projectName:  raw.projectName,
      tagline:      raw.tagline,
      description:  raw.description,
      stylePreset:  raw.stylePreset,
      aspectRatio:  raw.aspectRatio,
      features,
      codeSummary,
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
  aspectRatio:  string;
  features:     { title: string; description: string }[];
  codeSummary:  CodeSummary | null;
}): string {
  const summary = [args.projectName, args.tagline, args.description]
    .filter(Boolean)
    .join(" — ");

  return JSON.stringify(
    {
      projectSummary:       summary || args.projectName,
      preferredTheme:       args.stylePreset,
      preferredAspectRatio: args.aspectRatio,
      features:             args.features,
      codeSummary: args.codeSummary
        ? {
            stack:    args.codeSummary.stack,
            routes:   args.codeSummary.routes,
            features: args.codeSummary.features,
            aiUsage:  args.codeSummary.aiUsage,
          }
        : null,
      codeSnippets: args.codeSummary?.codeSnippets ?? [],
    },
    null,
    2
  );
}
