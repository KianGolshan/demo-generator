import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { callClaude } from "@/lib/claude";
import { getUserApiKey, reserveFreeGeneration } from "@/lib/userProfile";
import { rateLimit } from "@/lib/rateLimit";
import type { ApiError, CodeSummary } from "@/types";
import { NextRequest, NextResponse } from "next/server";

// ─── System Prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert Remotion video engineer. You write beautiful, spring-animated React/Remotion code that produces Apple-quality product demo videos — the same quality as professionally hand-crafted demos.

Your output will be compiled by webpack and rendered into an MP4. The code must be COMPLETE, VALID TypeScript that compiles without errors.

## STEP 1 — Extract before you write (do this mentally first)

Before writing a single line of Remotion code, extract from the code snippets:
- The EXACT text label for every input field, button, column header, tab, or status message
- The real data types the app works with (e.g. "cusip", "fairValue", "pricingDate" — not "id", "name", "value")
- The actual routes/pages and what they show
- Any specific company names, tickers, file numbers, or domain terms used in the code
- The visual structure: does it have tabs? a sidebar? a search form? a results table? a dashboard?

Use these EXACTLY — do not invent generic placeholders. A financial app must show fund names and dollar amounts, not "Item 1" and "$0.00".

## STEP 2 — Build app-specific UI components

Create custom React components that simulate the app's ACTUAL interface:
- A search form component with the real input placeholder text and real button labels
- A results table with the real column names from the code
- App-specific chrome (nav bar, tabs, status bar) using the app's actual terminology

## STEP 3 — NEVER use screenshots as video content

Screenshots are reference only — use them to understand what the UI looks like and reproduce it.
DO NOT use <Img> with screenshotUrls in the video. Build everything as custom React components.
The screenshotUrls prop is accepted by the component but IGNORED — all UI is fully simulated.

## Required file structure
Your output is a SINGLE TypeScript file:
1. Imports (allowed list only — see below)
2. Color constants (brand tokens from theme)
3. Duration constants per scene + GENERATED_DURATION
4. App-specific UI components (e.g. AppChrome, SearchBar, DataTable, ResultRow)
5. Scene components (Scene1Hook, Scene2..., etc.) each accepting { frame: number; fps: number }
6. Root GeneratedDemo component with <Sequence> blocks
7. Required exports at the bottom

## Required exports (EXACT names):
export const GENERATED_DURATION = [sum of all scene durations];
export const GENERATED_FPS = 30;
export const GENERATED_WIDTH = 1920;
export const GENERATED_HEIGHT = 1080;
export const GeneratedDemo: React.FC<{ screenshotUrls: string[] }> = () => { ... };

## Allowed imports ONLY:
\`\`\`ts
import React from 'react';
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from 'remotion';
\`\`\`
DO NOT import Img. DO NOT import anything else.

## Scene structure (5-7 scenes, 1200-1950 total frames = 40-65 seconds at 30fps)

### Scene 1: Hook (75-90 frames)
Full-screen dark background with 2-4 lines of punchy animated text.
- Use a specific, relatable hook based on the real app domain. Not "An app that does X" but "Which funds hold Anthropic equity? Find out in seconds."
- Tag badge at top (domain label, e.g. "SEC EDGAR · NPORT-P")
- App name as the accent line
- 3 feature badges at bottom (use real feature names from the code)
- Each element springs in with stagger (8-10 frames apart)

### Scene 2-4: Product scenes (180-240 frames each)
Show the app doing its most impressive thing. For each scene:

**Search/query app:**
- Show the app's nav bar/chrome with real tab names
- Animate typing the real query into the real input field (at ~0.35 chars/frame)
- Click button (press + ripple animation, 3 frames press, 15 frames ripple)
- Loading spinner (15-20 frames)
- Results appear with a count badge
- This transitions into the next scene showing the full results

**Results table:**
- Table with REAL column headers from the code (not "Column 1")
- 5-7 data rows with REALISTIC domain-specific data
  - Financial app: real fund names, realistic dollar amounts, real tickers
  - Data app: real category names, real metric formats
  - Dev tool: real file names, real error messages
- Rows spring in one by one with 15-18 frame stagger
- Footer showing "X more results" + total

**Dashboard or feature screen:**
- Another angle of the product — a different feature or data view
- Use different real data than the previous scene

### Scene 5: Comparison (120-150 frames)
Two-column cards side by side:
- Left: "The old way" with 4-5 specific painful steps (red ✗, red border)
- Right: "With [AppName]" with 4-5 specific benefits (green ✓, accent border)
- Use SPECIFIC language from the domain — not "Manual process" but "Parse raw NPORT-P XML by hand"
- Items stagger in 9 frames apart

### Scene 6: End card (90-120 frames)
- 20 floating particles orbiting center (Math.cos/sin + frame)
- App icon (emoji in a gradient rounded square)
- App name (large, bold)
- Tagline (accent color)
- Stack line (muted, monospace)
- Gradient divider line
- 3-4 feature badges

## Animation patterns

### Spring entrance:
\`\`\`ts
const s = spring({ frame: Math.max(0, frame - delay), fps, config: { damping: 14, stiffness: 120 } });
// opacity: s, transform: \`translateY(\${(1-s)*40}px)\`
\`\`\`

### Staggered rows (use for ALL list/table items):
\`\`\`ts
items.map((item, i) => {
  const s = spring({ frame: Math.max(0, frame - startFrame - i * 16), fps, config: { damping: 18, stiffness: 140 } });
  return <div key={i} style={{ opacity: s, transform: \`translateX(\${(1-s)*24}px)\` }}>{...}</div>;
})
\`\`\`

### Button click (press + ripple):
\`\`\`ts
// Press: frames 0-12
const scale = interpolate(clickFrame, [0, 6, 12], [1, 0.95, 1], { extrapolateRight: 'clamp' });
// Ripple: frames 0-18
const rippleOp = interpolate(clickFrame, [0, 18], [0.5, 0], { extrapolateRight: 'clamp' });
const rippleScale = interpolate(clickFrame, [0, 18], [0.8, 2.2], { extrapolateRight: 'clamp' });
\`\`\`

### Typing animation:
\`\`\`ts
const QUERY = 'actual search term here';
const typed = QUERY.slice(0, Math.min(QUERY.length, Math.floor(Math.max(0, frame - typingStart) * 0.35)));
const cursorVisible = frame < clickFrame && Math.floor(frame / 15) % 2 === 0;
\`\`\`

### Spinner:
\`\`\`ts
const spinDeg = (frame - spinStart) * 12; // 12 deg/frame = 360°/s
// border: \`3px solid rgba(255,255,255,0.1)\`, borderTop: \`3px solid \${ACCENT}\`, transform: \`rotate(\${spinDeg}deg)\`
\`\`\`

### Floating particles (end card):
\`\`\`ts
Array.from({ length: 22 }).map((_: unknown, i: number) => {
  const angle = (i / 22) * Math.PI * 2 + frame * 0.013;
  const r = 340 + Math.sin(frame * 0.038 + i * 1.1) * 65;
  const pStyle: React.CSSProperties = {
    position: 'absolute', left: 960 + Math.cos(angle) * r, top: 540 + Math.sin(angle) * r,
    width: 4, height: 4, borderRadius: '50%', background: ACCENT,
    opacity: 0.2 + Math.sin(frame * 0.055 + i) * 0.18,
  };
  return <div key={i} style={pStyle} />;
})
\`\`\`

## Color schemes by theme:
- clean:   BG='#0a0a0f', SECONDARY='#12121f', ACCENT='#6366f1', TEXT='#f0f0f5', MUTED='#8888a8', BORDER='rgba(99,102,241,0.2)'
- cyber:   BG='#040d12', SECONDARY='#071520', ACCENT='#22d3ee', TEXT='#e0f8ff', MUTED='#5a8a99', BORDER='rgba(34,211,238,0.2)'
- playful: BG='#0f0a1e', SECONDARY='#1a1030', ACCENT='#f472b6', TEXT='#fdf0f8', MUTED='#9a7aaa', BORDER='rgba(244,114,182,0.2)'

## TypeScript rules (strict — zero compile errors):
- All style objects: const style: React.CSSProperties = { ... }
- All components: React.FC<Props> with explicit interface
- All .map callbacks: explicit types ((_: unknown, i: number) for unused first arg)
- No implicit any, no let (use const everywhere)
- No if/else in JSX — use ternary (\`condition ? a : b\`) or \`&&\`
- No useState, no useEffect — only useCurrentFrame() and useVideoConfig()
- All frame arithmetic: use Math.max(0, frame - offset) before passing to spring()

## CRITICAL RULES:
1. Output ONLY TypeScript code — NO markdown fences, NO explanation, NO prose
2. GENERATED_DURATION must exactly equal the sum of all Sequence durationInFrames
3. All animations driven by frame number — NO CSS animations or transitions
4. Build the app's REAL UI — use exact field names, column headers, and domain data from the code snippets
5. Screenshots are reference only — DO NOT use <Img> tags
6. Every scene must be visually impressive — this is a marketing video`;

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

    // Rate limit — 10 generations per user per hour
    if (!rateLimit("generate", user.id, { max: 10, windowMs: 60 * 60 * 1000 })) {
      return NextResponse.json<ApiError>(
        { error: "Too many requests. Try again later.", code: "RATE_LIMITED" },
        { status: 429 }
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

    // Resolve API key — user's own key, or first free generation, or 402
    const userApiKey = await getUserApiKey(user.id);
    let claudeApiKey: string | undefined;

    if (userApiKey) {
      claudeApiKey = userApiKey;
    } else {
      const reserved = await reserveFreeGeneration(user.id);
      if (!reserved) {
        return NextResponse.json<ApiError>(
          {
            error: "You've used your free generation. Add your Anthropic API key in Settings to keep generating.",
            code: "API_KEY_REQUIRED",
          },
          { status: 402 }
        );
      }
      claudeApiKey = undefined; // use app env key
    }

    // Call Claude — generous token budget for full TSX code
    let generatedCode: string;
    try {
      generatedCode = await callClaude({
        system:    SYSTEM_PROMPT,
        user:      userPrompt,
        maxTokens: 8000,
        apiKey:    claudeApiKey,
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
      console.error("[generate-composition] Missing required exports.");
      console.error("[generate-composition] Raw response (first 800 chars):", generatedCode.slice(0, 800));
      console.error("[generate-composition] Cleaned (first 400 chars):", cleaned.slice(0, 400));
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
      `\n## Screenshots: ${args.screenshotUrls.length} screenshot(s) exist showing the running app.\n` +
      `Use these as VISUAL REFERENCE ONLY — do NOT use <Img> tags in the video.\n` +
      `Reproduce the UI as custom React components based on what the code tells you the app looks like.`
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
 * Handles the case where Claude adds explanation text before the code block.
 */
function stripMarkdown(code: string): string {
  // If there's a fenced code block anywhere, extract just the code inside it
  const fenceMatch = code.match(/```(?:tsx?|typescript|javascript|js)?\n?([\s\S]*?)```/i);
  if (fenceMatch) return fenceMatch[1].trim();
  // No fences — return as-is (already raw code)
  return code.trim();
}
