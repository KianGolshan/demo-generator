/**
 * Tests for all Zod validation schemas used in API routes.
 * Simulates valid and invalid payloads for each of the 3 user personas.
 */
import { describe, it, expect } from "vitest";
import { z } from "zod";

// ─── Replicate schemas from API routes ───────────────────────────────────────

const CreateDemoSchema = z.object({
  projectName: z.string().min(1).max(100),
  tagline:     z.string().max(200).default(""),
  description: z.string().max(2000).default(""),
  sourceType:  z.enum(["url", "screenshots", "repo+url", "repo+screenshots"]),
  sourceUrl:   z.string().url().optional(),
  stylePreset: z.enum(["clean", "cyber", "playful"]).default("clean"),
  aspectRatio: z.enum(["16:9", "9:16"]).default("16:9"),
});

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

const AnalyzeRepoSchema = z.object({
  repoFullName: z.string().regex(/^[\w.-]+\/[\w.-]+$/, "Must be in owner/repo format"),
});

const CodeSummarySchema = z.object({
  stack: z.object({
    frontend:    z.string().optional(),
    backend:     z.string().optional(),
    aiProviders: z.array(z.string()).optional().default([]),
    databases:   z.array(z.string()).optional().default([]),
  }),
  routes:   z.array(z.object({ path: z.string(), description: z.string() })),
  features: z.array(z.string()).max(7),
  aiUsage:  z.array(z.string()),
});

// ─── CreateDemo ───────────────────────────────────────────────────────────────

describe("CreateDemoSchema — Persona: Vibe Coder (minimal input)", () => {
  it("accepts minimal valid payload with only required fields", () => {
    const result = CreateDemoSchema.safeParse({
      projectName: "My App",
      sourceType: "screenshots",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.stylePreset).toBe("clean");
      expect(result.data.aspectRatio).toBe("16:9");
      expect(result.data.tagline).toBe("");
      expect(result.data.description).toBe("");
    }
  });

  it("rejects empty projectName", () => {
    const result = CreateDemoSchema.safeParse({ projectName: "", sourceType: "screenshots" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid sourceType", () => {
    const result = CreateDemoSchema.safeParse({ projectName: "App", sourceType: "magic" });
    expect(result.success).toBe(false);
  });
});

describe("CreateDemoSchema — Persona: Experienced Vibe Coder", () => {
  it("accepts full payload with all optional fields", () => {
    const result = CreateDemoSchema.safeParse({
      projectName: "Valuation Dashboard",
      tagline: "Instant equity analysis",
      description: "Built with Next.js and Claude",
      sourceType: "repo+screenshots",
      stylePreset: "cyber",
      aspectRatio: "16:9",
    });
    expect(result.success).toBe(true);
  });

  it("accepts portrait aspect ratio for mobile-first projects", () => {
    const result = CreateDemoSchema.safeParse({
      projectName: "Mobile App",
      sourceType: "screenshots",
      aspectRatio: "9:16",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.aspectRatio).toBe("9:16");
  });

  it("rejects unknown stylePreset", () => {
    const result = CreateDemoSchema.safeParse({
      projectName: "App",
      sourceType: "screenshots",
      stylePreset: "dark-mode",
    });
    expect(result.success).toBe(false);
  });
});

describe("CreateDemoSchema — Persona: Technical User", () => {
  it("accepts repo+url source type with valid URL", () => {
    const result = CreateDemoSchema.safeParse({
      projectName: "DevToolPro",
      tagline: "AI development workflow",
      description: "Full-stack with Claude",
      sourceType: "repo+url",
      sourceUrl: "https://devtool.pro",
      stylePreset: "clean",
      aspectRatio: "16:9",
    });
    expect(result.success).toBe(true);
  });

  it("rejects malformed sourceUrl", () => {
    const result = CreateDemoSchema.safeParse({
      projectName: "App",
      sourceType: "url",
      sourceUrl: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("rejects projectName over 100 characters", () => {
    const result = CreateDemoSchema.safeParse({
      projectName: "A".repeat(101),
      sourceType: "screenshots",
    });
    expect(result.success).toBe(false);
  });
});

// ─── DemoConfigSchema ────────────────────────────────────────────────────────

describe("DemoConfigSchema — Claude output validation", () => {
  const validConfig = {
    title: "DemoApp",
    tagline: "Ship faster",
    theme: "clean",
    aspectRatio: "16:9",
    scenes: [
      { type: "intro", durationSeconds: 8, headline: "Welcome", body: ["Get started fast"], screenshotId: null, cta: null, technicalNote: null },
      { type: "feature", durationSeconds: 10, headline: "Core Feature", body: ["Does things quickly"], screenshotId: "0", cta: null, technicalNote: null },
      { type: "outro", durationSeconds: 7, headline: "Try it now", body: [], screenshotId: null, cta: "Get Started", technicalNote: "Next.js, Supabase" },
    ],
  };

  it("accepts a valid complete DemoConfig", () => {
    expect(DemoConfigSchema.safeParse(validConfig).success).toBe(true);
  });

  it("rejects config with only 1 scene (minimum is 2)", () => {
    const result = DemoConfigSchema.safeParse({
      ...validConfig,
      scenes: [validConfig.scenes[0]],
    });
    expect(result.success).toBe(false);
  });

  it("rejects scene with durationSeconds > 30", () => {
    const result = DemoConfigSchema.safeParse({
      ...validConfig,
      scenes: [
        { ...validConfig.scenes[0], durationSeconds: 31 },
        validConfig.scenes[1],
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects scene with more than 3 body bullets", () => {
    const result = DemoConfigSchema.safeParse({
      ...validConfig,
      scenes: [
        { ...validConfig.scenes[0], body: ["a", "b", "c", "d"] },
        validConfig.scenes[1],
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid theme", () => {
    const result = DemoConfigSchema.safeParse({ ...validConfig, theme: "matrix" });
    expect(result.success).toBe(false);
  });

  it("accepts 9:16 aspect ratio for portrait videos", () => {
    const result = DemoConfigSchema.safeParse({ ...validConfig, aspectRatio: "9:16" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid aspectRatio", () => {
    const result = DemoConfigSchema.safeParse({ ...validConfig, aspectRatio: "4:3" });
    expect(result.success).toBe(false);
  });
});

// ─── AnalyzeRepoSchema ───────────────────────────────────────────────────────

describe("AnalyzeRepoSchema — repo format validation", () => {
  it("accepts valid owner/repo format", () => {
    expect(AnalyzeRepoSchema.safeParse({ repoFullName: "KianGolshan/demo-generator" }).success).toBe(true);
    expect(AnalyzeRepoSchema.safeParse({ repoFullName: "vercel/next.js" }).success).toBe(true);
    expect(AnalyzeRepoSchema.safeParse({ repoFullName: "org-name/my-repo.v2" }).success).toBe(true);
  });

  it("rejects single-segment repo names (missing owner)", () => {
    expect(AnalyzeRepoSchema.safeParse({ repoFullName: "my-repo" }).success).toBe(false);
  });

  it("rejects full GitHub URLs (not owner/repo)", () => {
    expect(AnalyzeRepoSchema.safeParse({ repoFullName: "https://github.com/owner/repo" }).success).toBe(false);
  });

  it("rejects empty string", () => {
    expect(AnalyzeRepoSchema.safeParse({ repoFullName: "" }).success).toBe(false);
  });

  it("rejects too many slashes", () => {
    expect(AnalyzeRepoSchema.safeParse({ repoFullName: "a/b/c" }).success).toBe(false);
  });
});

// ─── CodeSummarySchema ───────────────────────────────────────────────────────

describe("CodeSummarySchema — Claude repo analysis output", () => {
  it("accepts minimal valid summary", () => {
    const result = CodeSummarySchema.safeParse({
      stack: {},
      routes: [],
      features: [],
      aiUsage: [],
    });
    expect(result.success).toBe(true);
  });

  it("accepts full stack including AI providers and databases", () => {
    const result = CodeSummarySchema.safeParse({
      stack: {
        frontend: "Next.js 14",
        backend: "Node.js",
        aiProviders: ["Anthropic Claude", "OpenAI"],
        databases: ["PostgreSQL", "Redis"],
      },
      routes: [{ path: "/api/analyze", description: "AI code analysis" }],
      features: ["Auth", "Dashboard", "AI Analysis"],
      aiUsage: ["Uses claude-sonnet-4-6 for code summarization"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects more than 7 features (Claude prompt enforces max 7)", () => {
    const result = CodeSummarySchema.safeParse({
      stack: {},
      routes: [],
      features: ["1", "2", "3", "4", "5", "6", "7", "8"],
      aiUsage: [],
    });
    expect(result.success).toBe(false);
  });

  it("defaults aiProviders and databases to [] when omitted", () => {
    const result = CodeSummarySchema.safeParse({
      stack: { frontend: "React" },
      routes: [],
      features: [],
      aiUsage: [],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.stack.aiProviders).toEqual([]);
      expect(result.data.stack.databases).toEqual([]);
    }
  });
});
