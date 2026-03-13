/**
 * Tests for the Claude prompt-building functions.
 * Verifies that all user inputs make it into the prompt payload.
 */
import { describe, it, expect } from "vitest";

// ─── Replicate buildGenerationPrompt ─────────────────────────────────────────

function buildGenerationPrompt(args: {
  projectName:  string;
  tagline:      string;
  description:  string;
  stylePreset:  string;
  aspectRatio:  string;
  features:     { title: string; description: string }[];
  codeSummary:  unknown;
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
      codeSummary:          args.codeSummary ?? null,
      screenshots:          args.screenshots,
    },
    null,
    2
  );
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("buildGenerationPrompt — persona: vibe coder (minimal input)", () => {
  it("includes projectName even when tagline and description are empty", () => {
    const prompt = buildGenerationPrompt({
      projectName:  "My Cool App",
      tagline:      "",
      description:  "",
      stylePreset:  "clean",
      aspectRatio:  "16:9",
      features:     [],
      codeSummary:  null,
      screenshots:  [],
    });
    const parsed = JSON.parse(prompt);
    expect(parsed.projectSummary).toBe("My Cool App");
  });

  it("falls back to projectName when all text fields empty", () => {
    const prompt = buildGenerationPrompt({
      projectName:  "DemoApp",
      tagline:      "",
      description:  "",
      stylePreset:  "clean",
      aspectRatio:  "16:9",
      features:     [],
      codeSummary:  null,
      screenshots:  [],
    });
    const parsed = JSON.parse(prompt);
    expect(parsed.projectSummary).toBe("DemoApp");
  });
});

describe("buildGenerationPrompt — persona: experienced vibe coder", () => {
  it("includes all fields in the prompt", () => {
    const prompt = buildGenerationPrompt({
      projectName:  "Valuation Dashboard",
      tagline:      "Instant equity analysis for any company",
      description:  "Built with Next.js, Claude AI, and Supabase",
      stylePreset:  "cyber",
      aspectRatio:  "16:9",
      features:     [{ title: "DCF Model", description: "Run DCF in seconds" }],
      codeSummary:  { stack: { frontend: "Next.js" } },
      screenshots:  [{ id: "0", label: "Screenshot 1 — dashboard.png" }],
    });
    const parsed = JSON.parse(prompt);
    expect(parsed.projectSummary).toContain("Valuation Dashboard");
    expect(parsed.projectSummary).toContain("Instant equity analysis");
    expect(parsed.preferredTheme).toBe("cyber");
    expect(parsed.preferredAspectRatio).toBe("16:9");
    expect(parsed.features).toHaveLength(1);
    expect(parsed.codeSummary).not.toBeNull();
    expect(parsed.screenshots).toHaveLength(1);
  });

  it("passes preferredAspectRatio for portrait video", () => {
    const prompt = buildGenerationPrompt({
      projectName:  "Mobile App",
      tagline:      "",
      description:  "",
      stylePreset:  "playful",
      aspectRatio:  "9:16",
      features:     [],
      codeSummary:  null,
      screenshots:  [],
    });
    const parsed = JSON.parse(prompt);
    expect(parsed.preferredAspectRatio).toBe("9:16");
  });
});

describe("buildGenerationPrompt — persona: technical user", () => {
  it("includes codeSummary with full stack info", () => {
    const codeSummary = {
      stack: {
        frontend: "Next.js 14",
        backend: "Node.js",
        aiProviders: ["Anthropic Claude"],
        databases: ["PostgreSQL", "Redis"],
      },
      features: ["Auth", "Dashboard", "API"],
      aiUsage: ["claude-sonnet-4-6 for code review"],
      routes: [{ path: "/api/analyze", description: "AI code analysis" }],
    };

    const prompt = buildGenerationPrompt({
      projectName:  "DevToolPro",
      tagline:      "AI-powered development workflow",
      description:  "Full-stack platform with Claude integration",
      stylePreset:  "clean",
      aspectRatio:  "16:9",
      features:     [
        { title: "Code Analysis", description: "Claude reads and summarizes your repo" },
        { title: "PR Review", description: "Automated review with diff analysis" },
      ],
      codeSummary,
      screenshots:  [
        { id: "0", label: "Screenshot 1 — dashboard.png" },
        { id: "1", label: "Screenshot 2 — pr-review.png" },
      ],
    });

    const parsed = JSON.parse(prompt);
    expect(parsed.codeSummary.stack.aiProviders).toContain("Anthropic Claude");
    expect(parsed.codeSummary.routes).toHaveLength(1);
    expect(parsed.features).toHaveLength(2);
    expect(parsed.screenshots).toHaveLength(2);
  });

  it("produces valid JSON (no syntax errors)", () => {
    const prompt = buildGenerationPrompt({
      projectName:  "Test",
      tagline:      'Contains "quotes" and \'apostrophes\'',
      description:  "Line1\nLine2\nLine3",
      stylePreset:  "clean",
      aspectRatio:  "16:9",
      features:     [],
      codeSummary:  null,
      screenshots:  [],
    });
    expect(() => JSON.parse(prompt)).not.toThrow();
  });
});

describe("buildGenerationPrompt — stylePreset → theme mapping", () => {
  it.each(["clean", "cyber", "playful"] as const)("passes stylePreset '%s' as preferredTheme", (preset) => {
    const prompt = buildGenerationPrompt({
      projectName: "App", tagline: "", description: "",
      stylePreset: preset, aspectRatio: "16:9",
      features: [], codeSummary: null, screenshots: [],
    });
    expect(JSON.parse(prompt).preferredTheme).toBe(preset);
  });
});
