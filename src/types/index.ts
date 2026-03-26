/**
 * Core TypeScript interfaces for DemoForge.
 * All JSON blobs stored in the DB must conform to these shapes exactly.
 */

// ─── Code Summary ─────────────────────────────────────────────────────────────

export interface CodeSummary {
  stack: {
    frontend?:   string;
    backend?:    string;
    aiProviders?: string[];
    databases?:  string[];
  };
  /** Primary routes/pages and what they appear to do */
  routes: { path: string; description: string }[];
  /** 3–7 user-friendly feature descriptions */
  features: string[];
  /** e.g. ["Uses OpenAI to summarize PDFs"] */
  aiUsage: string[];
  /** Top 3 interesting file snippets from the repo (saved by analyze-repo) */
  codeSnippets?: { filename: string; content: string }[];
}

// ─── Scene types ──────────────────────────────────────────────────────────────

export type DemoSceneType =
  | "hook"
  | "code"
  | "browser-flow"
  | "terminal"
  | "comparison"
  | "end-card";

export interface CodeLine {
  content: string;
  indent?: number;
}

export interface BrowserStep {
  /** Scene-relative frame when this step activates */
  frame:        number;
  type:         "load" | "type" | "click" | "result";
  label:        string;
  fieldName?:   string;
  fieldValue?:  string;
  buttonLabel?: string;
  /** Newline-separated result rows, max 6 */
  resultText?:  string;
}

export interface DemoScene {
  type:           DemoSceneType;
  /** Duration in frames at 30fps (replaces durationSeconds) */
  durationFrames: number;

  // ── hook ──
  lines?:       string[];
  accentLine?:  number;

  // ── code ──
  filename?:       string;
  codeLines?:      CodeLine[];
  highlightLines?: number[];
  errorLines?:     number[];
  animateTyping?:  boolean;

  // ── browser-flow ──
  url?:   string;
  steps?:        BrowserStep[];
  screenshotId?: string | null;

  // ── terminal ──
  terminalLines?: { text: string; isError?: boolean }[];

  // ── comparison ──
  leftTitle?:  string;
  leftItems?:  string[];
  rightTitle?: string;
  rightItems?: string[];

  // ── end-card ──
  title?:   string;
  subtext?: string;

  // ── shared / overlay ──
  headline?:    string;
  overlayText?: string;
  overlaySub?:  string;
  tagline?:     string;
}

// ─── Demo Config ─────────────────────────────────────────────────────────────

export interface DemoConfig {
  title:       string;
  tagline:     string;
  theme:       StylePreset;
  aspectRatio: AspectRatio;
  scenes:      DemoScene[];
}

// ─── Shared enums / types ────────────────────────────────────────────────────

export type StylePreset = "clean" | "cyber" | "playful";
export type AspectRatio = "16:9" | "9:16";
export type SourceType  = "url" | "screenshots" | "repo" | "repo+url" | "repo+screenshots";
export type RenderStatus = "draft" | "config_generated" | "rendering" | "ready" | "failed";

export interface ProjectFeature {
  title:       string;
  description: string;
}

// ─── Demo Project ─────────────────────────────────────────────────────────────

export interface DemoProject {
  id:            string;
  userId:        string;
  projectName:   string;
  tagline:       string;
  description:   string;
  sourceType:    SourceType;
  sourceUrl?:    string;
  screenshotUrls: string[];
  stylePreset:   StylePreset;
  features:      ProjectFeature[];
  codeSummary?:  CodeSummary;
  demoConfig?:     DemoConfig;
  generatedCode?:  string;
  renderStatus:  RenderStatus;
  videoUrl?:     string;
  createdAt:     string;
  updatedAt:     string;
}

/** Standard error response shape returned by all API routes */
export interface ApiError {
  error: string;
  code:  string;
}
