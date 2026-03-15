import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { callClaude } from "@/lib/claude";
import type { ApiError, CodeSummary } from "@/types";
import { NextRequest, NextResponse } from "next/server";

// ─── System Prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert Remotion video engineer specializing in product demo videos. You write beautiful, spring-animated React/Remotion code that produces Apple-quality product demos.

Your output will be compiled by webpack and rendered into an MP4 video file. The code must be COMPLETE, VALID TypeScript that compiles without errors.

## Your task
Write a complete Remotion demo video for the described app. Create custom React components that visually simulate the app's actual interface — using real field names, data types, and UI patterns derived from the code analysis.

## Required file structure
Your output is a SINGLE TypeScript file containing:
1. Imports (only from the allowed list below)
2. Custom React components for the app's specific UI (search forms, tables, dashboards, charts — whatever this app actually has)
3. Individual scene components
4. The main GeneratedDemo component using <Sequence> tags
5. Required exports at the bottom

## Required exports (include these EXACT names — no TypeScript generics on export statements):
export const GENERATED_DURATION = [total frames];
export const GENERATED_FPS = 30;
export const GENERATED_WIDTH = 1920;
export const GENERATED_HEIGHT = 1080;
export const GeneratedDemo = ...

## Allowed imports ONLY:
\`\`\`ts
import React from 'react';
import {
  AbsoluteFill,
  Sequence,
  Img,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from 'remotion';
\`\`\`
DO NOT import anything else. No lodash, no d3, no external libraries.

## Scene structure (5-7 scenes, 1200-2100 total frames at 30fps = 40-70 seconds)

### Scene 1: Hook (75-90 frames)
Full-screen dark background with 2-3 lines of punchy animated text.
- Each line springs in with stagger (delay each by 8 frames)
- Accent line is bigger/bolder
- Background: dark with subtle radial gradient in accent color

### Scene 2-4: Product scenes (150-210 frames each)
Show the app doing its thing. Pick the right scene type for this app:

**Web app with UI**: Simulated browser chrome (macOS traffic lights, URL bar) with app content inside. If screenshotUrls[i] is available, use <Img> to show it with Ken Burns zoom. If no screenshot, render a realistic mock UI with the app's actual data structures.

**Data/search app**: Animated search → results flow. Show typing animation, then results appearing row by row.

**Dashboard app**: Animated stats cards, charts (use CSS shapes/bars), data rows.

**CLI/developer tool**: Terminal window with streaming output, syntax-highlighted code blocks.

### Scene 5: Comparison (120-150 frames)
Two columns: left "The old way" (red ✗ bullets), right "With [AppName]" (green ✓ bullets).
Items spring in with stagger. Bright border on the right column.

### Scene 6: End card (90-120 frames)
- 20 floating particles orbiting the center (using Math.cos/sin + frame)
- App name springs in (large, bold)
- Tagline below (smaller, accent color)
- Subtext (stack info, muted)

## Animation code patterns

### Spring entrance (use for ALL entrances):
\`\`\`ts
const s = spring({ frame, fps, config: { damping: 14, stiffness: 120 } });
const opacity = s;
const translateY = (1 - s) * 40;
\`\`\`

### Staggered list items:
\`\`\`ts
items.map((item, i) => {
  const s = spring(Math.max(0, frame - i * 8), fps, { damping: 16, stiffness: 130 });
  return <div key={i} style={{ opacity: s, transform: \`translateX(\${(1-s)*20}px)\` }}>{item}</div>;
})
\`\`\`

### Ken Burns zoom for screenshots:
\`\`\`ts
const zoom = interpolate(frame, [0, durationInFrames], [1.0, 1.06], { extrapolateRight: 'clamp' });
// Apply as: transform: \`scale(\${zoom})\`, transformOrigin: 'top left'
\`\`\`

### Typing animation:
\`\`\`ts
const chars = Math.floor(frame * 2.5);
const typed = fullText.slice(0, chars);
const cursorVisible = Math.floor(frame / 15) % 2 === 0;
\`\`\`

### Floating particles:
\`\`\`ts
Array.from({ length: 20 }).map((_, i) => {
  const angle = (i / 20) * Math.PI * 2 + frame * 0.01;
  const r = 280 + Math.sin(frame * 0.04 + i) * 60;
  return (
    <div key={i} style={{
      position: 'absolute',
      left: 960 + Math.cos(angle) * r,
      top: 540 + Math.sin(angle) * r,
      width: 4, height: 4, borderRadius: '50%',
      background: accent,
      opacity: 0.3 + Math.sin(frame * 0.06 + i) * 0.2,
    }} />
  );
})
\`\`\`

### Browser chrome wrapper:
\`\`\`tsx
<div style={{ background: '#1a1a2e', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
  <div style={{ height: 36, background: '#0d0d1a', display: 'flex', alignItems: 'center', padding: '0 12px', gap: 6 }}>
    <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f57' }} />
    <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ffbd2e' }} />
    <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#28c940' }} />
    <div style={{ flex: 1, margin: '0 12px', height: 22, background: '#1e1e2e', borderRadius: 6, display: 'flex', alignItems: 'center', paddingLeft: 10 }}>
      <span style={{ color: '#666', fontSize: 11, fontFamily: 'monospace' }}>{url}</span>
    </div>
  </div>
  {/* content here */}
</div>
\`\`\`

## Color schemes by theme:
- clean:   bg='#0a0a0f', secondary='#12121f', accent='#6366f1', text='#f0f0f5', muted='#8888a8', border='rgba(99,102,241,0.2)'
- cyber:   bg='#040d12', secondary='#071520', accent='#22d3ee', text='#e0f8ff', muted='#5a8a99', border='rgba(34,211,238,0.2)'
- playful: bg='#0f0a1e', secondary='#1a1030', accent='#f472b6', text='#fdf0f8', muted='#9a7aaa', border='rgba(244,114,182,0.2)'

## TypeScript rules (strict — no compile errors):
- ALL style objects must be typed: const style: React.CSSProperties = { ... }
- Component props must have explicit interfaces: interface SceneProps { frame: number; fps: number; screenshotUrls: string[]; }
- Use React.FC<Props> for all components
- No implicit any
- Use const for all variables
- Conditional rendering: use ternary or && — no if statements in JSX
- Array methods (.map) must always have explicit types for the callback params
- String concatenation in template literals must not produce type errors

## CRITICAL RULES:
1. Output ONLY TypeScript code — NO markdown fences (\`\`\`), NO explanation, NO comments outside the code
2. The code must compile with zero TypeScript errors
3. GENERATED_DURATION must equal the sum of all Sequence durationInFrames
4. ALL animations driven by frame — NO CSS keyframe animations or transitions
5. Create UI that reflects the ACTUAL APP — use real column names, field labels, data from the snippets
6. NO useState, NO useEffect, NO hooks except useCurrentFrame and useVideoConfig
7. Make it impressive — this is a marketing video, every frame should look polished`;

// ─── Route Handler ────────────────────────────────────────────────────────────

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/demos/[id]/generate-composition
 * Calls Claude to write a complete Remotion TSX file for this app.
 * Saves the generated code to DB; render route writes it to disk + bundles it.
 *
 * @returns { generatedCode: string }
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
    const userPrompt = buildCodeGenPrompt({
      projectName:   raw.projectName,
      tagline:       raw.tagline,
      description:   raw.description,
      stylePreset:   raw.stylePreset,
      aspectRatio:   raw.aspectRatio,
      features,
      codeSummary,
      screenshotUrls,
    });

    // Call Claude — generous token budget for full TSX code
    let generatedCode: string;
    try {
      generatedCode = await callClaude({
        system:    SYSTEM_PROMPT,
        user:      userPrompt,
        maxTokens: 8000,
      });
    } catch (err) {
      console.error("[generate-composition] Claude API error:", err);
      return NextResponse.json<ApiError>(
        { error: "AI generation failed. Please try again.", code: "CLAUDE_ERROR" },
        { status: 502 }
      );
    }

    // Strip any accidental markdown fences Claude might have added
    const cleaned = stripMarkdown(generatedCode);

    // Basic sanity check — must export GeneratedDemo and GENERATED_DURATION
    if (!cleaned.includes("GeneratedDemo") || !cleaned.includes("GENERATED_DURATION")) {
      console.error("[generate-composition] Missing required exports. Raw:", cleaned.slice(0, 400));
      return NextResponse.json<ApiError>(
        { error: "AI returned invalid code. Please try again.", code: "PARSE_ERROR" },
        { status: 502 }
      );
    }

    // Save to DB and mark as config_generated so the render button enables
    await prisma.demoProject.update({
      where: { id },
      data:  {
        generatedCode,
        renderStatus: "config_generated",
      },
    });

    return NextResponse.json({ generatedCode: cleaned });
  } catch (err) {
    console.error("[POST /api/demos/[id]/generate-composition]", err);
    return NextResponse.json<ApiError>(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildCodeGenPrompt(args: {
  projectName:   string;
  tagline:       string;
  description:   string;
  stylePreset:   string;
  aspectRatio:   string;
  features:      { title: string; description: string }[];
  codeSummary:   CodeSummary | null;
  screenshotUrls: string[];
}): string {
  const sections: string[] = [];

  sections.push(`## App: ${args.projectName}`);
  if (args.tagline)     sections.push(`Tagline: ${args.tagline}`);
  if (args.description) sections.push(`Description: ${args.description}`);

  sections.push(`\n## Style\ntheme: ${args.stylePreset}\naspectRatio: ${args.aspectRatio}`);

  if (args.features.length > 0) {
    sections.push(
      `\n## Features\n${args.features.map((f) => `- ${f.title}: ${f.description}`).join("\n")}`
    );
  }

  if (args.screenshotUrls.length > 0) {
    sections.push(
      `\n## Screenshots (use these in <Img> tags as screenshotUrls[i]):\n${
        args.screenshotUrls.map((url, i) => `screenshotUrls[${i}] = "${url}"`).join("\n")
      }`
    );
  } else {
    sections.push(
      `\n## Screenshots: none — simulate the UI using React components based on the code snippets`
    );
  }

  if (args.codeSummary) {
    const cs = args.codeSummary;
    sections.push(`\n## Tech Stack\n${JSON.stringify(cs.stack, null, 2)}`);

    if (cs.routes.length > 0) {
      sections.push(
        `\n## Routes/Pages\n${cs.routes.map((r) => `${r.path}: ${r.description}`).join("\n")}`
      );
    }

    if (cs.features.length > 0) {
      sections.push(`\n## App Features (user-friendly)\n${cs.features.map((f) => `- ${f}`).join("\n")}`);
    }

    if (cs.aiUsage?.length > 0) {
      sections.push(`\n## AI/LLM Usage\n${cs.aiUsage.map((u) => `- ${u}`).join("\n")}`);
    }

    if (cs.codeSnippets && cs.codeSnippets.length > 0) {
      sections.push(`\n## Key Code Snippets (use these to understand real data structures and UI):`);
      for (const snippet of cs.codeSnippets) {
        sections.push(`\n### ${snippet.filename}\n\`\`\`\n${snippet.content}\n\`\`\``);
      }
    }
  }

  sections.push(
    `\n## Instructions\nNow write the complete Remotion TSX file for this app. Remember:\n- The UI components must simulate THIS app's actual interface (use field names from the code)\n- If screenshots are provided, show them prominently in browser chrome with Img tags\n- If no screenshots, create detailed mock UI that looks like this app would actually look\n- Make every scene visually impressive with smooth spring animations\n- Total runtime: 40-65 seconds (1200-1950 frames at 30fps)`
  );

  return sections.join("\n");
}

/**
 * Strips markdown code fences from Claude's response if it added them.
 */
function stripMarkdown(code: string): string {
  // Remove ```typescript ... ``` or ```tsx ... ``` or ``` ... ```
  return code
    .replace(/^```(?:tsx?|typescript|javascript|js)?\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();
}
