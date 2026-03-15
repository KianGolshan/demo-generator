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
  url:          z.string().optional(),
  steps:        z.array(BrowserStepSchema).optional(),
  screenshotId: z.string().nullable().optional(),

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
  scenes:      z.array(DemoSceneSchema).min(3).max(10),
});

// ─── System Prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert product demo director. Your job is to create a compelling video that shows what an app DOES and WHY it's useful — from the user's perspective. Think Apple product demo, not a code review.

CRITICAL RULE: Show the PRODUCT, not the code. The viewer wants to see the app in action — what they'd see on screen, what problem it solves, why it's impressive. Never show source code unless the app is a developer CLI tool.

You will receive:
- projectSummary: app name and description
- features: what the app does
- codeSummary: stack and routes (use to understand the app, NOT to show code)
- screenshots: list of uploaded screenshots with IDs — USE THESE in browser-flow scenes
- codeSnippets: implementation details (use ONLY to understand the app better, do NOT show in video)

You output a DemoConfig JSON for a 45–75 second animated video.

## Scene Types

### "hook" scene — Opening punch
Full-screen animated text. Use for the opening problem statement.
- lines: 2-3 short punchy strings. Make it relatable — the pain the user feels.
- accentLine: index of the biggest/most important line
- durationFrames: 75-90

Example for a financial data app:
{ "type": "hook", "lines": ["Anthropic raised $2B.", "Which funds hold the equity?", "Find out in seconds."], "accentLine": 2, "durationFrames": 80 }

### "browser-flow" scene — THE MONEY SHOT (use 2-3 of these)
Shows the app running in a browser with the real screenshot. This is the most important scene type.
- screenshotId: the ID of the screenshot to show (e.g. "0", "1") — ALWAYS use a screenshot if available
- url: the app's URL shown in the browser chrome
- steps: caption overlays that appear at specific frames as the user "browses":
  - { frame: 0, type: "load", label: "Search for any company or ticker" }
  - { frame: 45, type: "type", fieldValue: "Anthropic", label: "Type a company name..." }
  - { frame: 90, type: "click", buttonLabel: "Search", label: "Instant results" }
  - { frame: 120, type: "result", label: "13 institutional funds exposed" }
- overlayText: optional bold caption underneath the browser (the "so what")
- durationFrames: 150-210

### "comparison" scene — Before vs. After
Show the painful old way vs. the easy new way.
- headline: e.g. "The old way vs. yours"
- leftTitle / leftItems: 3-5 steps of the painful manual process
- rightTitle / rightItems: 3-5 outcomes with your app (much shorter list)
- durationFrames: 120-150

### "end-card" scene — Close strong
- title: app name
- tagline: one punchy line about the value
- subtext: e.g. "Powered by SEC EDGAR · Built with Python + Streamlit"
- durationFrames: 90-120

## Composition Rules
1. ALWAYS start with "hook"
2. Use 2-3 "browser-flow" scenes with different screenshots showing different features
3. Use 1 "comparison" scene to show the before/after contrast
4. ALWAYS end with "end-card"
5. DO NOT use "code" scenes for web apps, dashboards, data tools, or any app that has a UI
6. Total durationFrames: 1500-2250 (50-75 seconds). Use 5-8 scenes total.
7. Be SPECIFIC. "Find which 13 mutual funds hold Anthropic equity" beats "search for investments"
8. Screenshots make browser-flow scenes look real — always use screenshotId when screenshots exist

## Output format
Output ONLY a valid JSON object. No markdown, no explanation, no code fences:
{
  "title": string,
  "tagline": string,
  "theme": "clean" | "cyber" | "playful",
  "aspectRatio": "16:9" | "9:16",
  "scenes": [...]
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

    const features       = (raw.features       as unknown as { title: string; description: string }[]) ?? [];
    const codeSummary    = (raw.codeSummary    as unknown as CodeSummary | null) ?? null;
    const screenshotUrls = (raw.screenshotUrls as unknown as string[]) ?? [];

    // Compose user prompt
    const userPrompt = buildGenerationPrompt({
      projectName:  raw.projectName,
      tagline:      raw.tagline,
      description:  raw.description,
      stylePreset:  raw.stylePreset,
      aspectRatio:  raw.aspectRatio,
      features,
      codeSummary,
      screenshots: screenshotUrls.map((url, i) => ({
        id:    String(i),
        label: `Screenshot ${i + 1} — ${url.split("/").pop()?.split("?")[0] ?? "image"}`,
      })),
    });

    // Call Claude
    let rawJson: string;
    try {
      rawJson = await callClaude({
        system:    SYSTEM_PROMPT,
        user:      userPrompt,
        maxTokens: 4000,
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
    } catch (parseErr) {
      console.error("[generate-config] JSON parse failed. Raw:", rawJson.slice(0, 800));
      console.error("[generate-config] Parse error:", parseErr);
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
  screenshots:  { id: string; label: string }[];
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
      screenshots:          args.screenshots,
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
