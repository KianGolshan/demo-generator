/**
 * Core TypeScript interfaces for DemoForge.
 * All JSON blobs stored in the DB must conform to these shapes exactly.
 */

export interface CodeSummary {
  stack: {
    frontend?: string;
    backend?: string;
    aiProviders?: string[];
    databases?: string[];
  };
  /** Primary routes/pages and what they appear to do */
  routes: { path: string; description: string }[];
  /** 3–7 user-friendly feature descriptions */
  features: string[];
  /** e.g. ["Uses OpenAI to summarize PDFs"] */
  aiUsage: string[];
}

export type DemoSceneType = "intro" | "feature" | "outro";
export type StylePreset = "clean" | "cyber" | "playful";
export type AspectRatio = "16:9" | "9:16";
export type SourceType = "url" | "screenshots" | "repo+url" | "repo+screenshots";
export type RenderStatus = "draft" | "config_generated" | "rendering" | "ready" | "failed";

export interface DemoScene {
  type: DemoSceneType;
  durationSeconds: number;
  /** References an uploaded screenshot by its storage filename/id */
  screenshotId?: string;
  headline: string;
  /** 1–3 bullet lines, max 12 words each */
  body: string[];
  /** Outro only */
  cta?: string;
  /** e.g. "Built with Next.js + OpenAI" */
  technicalNote?: string;
}

export interface DemoConfig {
  title: string;
  tagline: string;
  theme: StylePreset;
  aspectRatio: AspectRatio;
  scenes: DemoScene[];
}

export interface ProjectFeature {
  title: string;
  description: string;
}

export interface DemoProject {
  id: string;
  userId: string;
  projectName: string;
  tagline: string;
  description: string;
  sourceType: SourceType;
  sourceUrl?: string;
  screenshotUrls: string[];
  stylePreset: StylePreset;
  features: ProjectFeature[];
  codeSummary?: CodeSummary;
  demoConfig?: DemoConfig;
  renderStatus: RenderStatus;
  videoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

/** Standard error response shape returned by all API routes */
export interface ApiError {
  error: string;
  code: string;
}
