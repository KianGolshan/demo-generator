/**
 * Tests for the repo file scoring/ranking logic in analyze-repo.
 * Extracted and tested in isolation without needing a real GitHub token or DB.
 */
import { describe, it, expect } from "vitest";

// ─── Replicate the scoring logic locally so it's testable ────────────────────

const ROUTE_PATTERNS = [
  /^(src\/)?(app|pages|routes?)\//i,
  /router\.(js|ts|jsx|tsx)$/i,
  /routes?\.(js|ts|jsx|tsx)$/i,
  /index\.(js|ts|jsx|tsx)$/i,
];

const AI_FILENAME_PATTERNS = [
  /\b(openai|anthropic|claude|gpt|llm|langchain|pinecone|cohere|replicate|huggingface)\b/i,
  /\bai[_-]?(lib|helper|client|service|utils?)\b/i,
  /\b(chat|embed|vector|rag)\b/i,
];

const AI_IMPORT_PATTERNS = [
  /from ['"]openai['"]/,
  /from ['"]@anthropic-ai/,
  /from ['"]anthropic['"]/,
  /from ['"]langchain/,
  /require\(['"]openai['"]\)/,
];

function scoreFile(p: string, size: number = 2000): number {
  let score = 0;
  const pl = p.toLowerCase();

  if (ROUTE_PATTERNS.some((r) => r.test(pl))) score += 10;
  if (!pl.includes("/")) score += 5;
  if (pl.includes("/api/")) score += 8;
  if (AI_FILENAME_PATTERNS.some((r) => r.test(pl))) score += 12;
  if (pl.includes("/component")) score += 4;
  if (/package\.json|tsconfig|next\.config|vite\.config/.test(pl)) score += 6;
  if (/\.(test|spec|stories)\.|\.css$|\.scss$|\.svg$/.test(pl)) score -= 20;
  if (size < 5000) score += 2;

  return score;
}

function hasAIImport(content: string): boolean {
  return AI_IMPORT_PATTERNS.some((r) => r.test(content));
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("File scoring — route files", () => {
  it("scores app/ route files high", () => {
    expect(scoreFile("src/app/demos/page.tsx")).toBeGreaterThanOrEqual(10);
  });

  it("scores pages/ files high", () => {
    expect(scoreFile("pages/index.tsx")).toBeGreaterThanOrEqual(10);
  });

  it("scores API routes high", () => {
    expect(scoreFile("src/app/api/demos/route.ts")).toBeGreaterThanOrEqual(10);
  });

  it("scores root-level files higher (no slash)", () => {
    expect(scoreFile("package.json")).toBeGreaterThanOrEqual(5);
  });
});

describe("File scoring — AI files", () => {
  it("boosts files with AI library names in filename", () => {
    expect(scoreFile("src/lib/claude.ts")).toBeGreaterThanOrEqual(12);
    expect(scoreFile("src/lib/openai.ts")).toBeGreaterThanOrEqual(12);
    expect(scoreFile("src/lib/langchain.ts")).toBeGreaterThanOrEqual(12);
  });

  it("boosts files with AI helper naming patterns", () => {
    expect(scoreFile("src/lib/ai-client.ts")).toBeGreaterThanOrEqual(12);
    expect(scoreFile("src/utils/ai_helper.ts")).toBeGreaterThanOrEqual(12);
  });

  it("does NOT boost generic files as AI files", () => {
    expect(scoreFile("src/lib/prisma.ts")).toBeLessThan(12);
    expect(scoreFile("src/lib/supabase.ts")).toBeLessThan(12);
  });
});

describe("File scoring — penalties", () => {
  it("penalizes test files heavily", () => {
    expect(scoreFile("src/lib/foo.test.ts")).toBeLessThan(0);
    expect(scoreFile("src/lib/foo.spec.ts")).toBeLessThan(0);
  });

  it("penalizes CSS files", () => {
    expect(scoreFile("src/styles/globals.css")).toBeLessThan(0);
  });

  it("penalizes SVG files", () => {
    expect(scoreFile("public/logo.svg")).toBeLessThan(0);
  });
});

describe("File scoring — size bonus", () => {
  it("gives bonus to small files under 5000 bytes", () => {
    const small = scoreFile("src/lib/utils.ts", 1000);
    const large = scoreFile("src/lib/utils.ts", 10000);
    expect(small).toBeGreaterThan(large);
  });
});

describe("Content-level AI import detection", () => {
  it("detects openai imports", () => {
    expect(hasAIImport(`import OpenAI from 'openai'`)).toBe(true);
    expect(hasAIImport(`const openai = require('openai')`)).toBe(true);
  });

  it("detects anthropic imports", () => {
    expect(hasAIImport(`import Anthropic from '@anthropic-ai/sdk'`)).toBe(true);
    expect(hasAIImport(`import { anthropic } from 'anthropic'`)).toBe(true);
  });

  it("detects langchain imports", () => {
    expect(hasAIImport(`import { ChatOpenAI } from 'langchain/chat_models'`)).toBe(true);
  });

  it("does NOT flag non-AI files", () => {
    expect(hasAIImport(`import { prisma } from './prisma'`)).toBe(false);
    expect(hasAIImport(`import React from 'react'`)).toBe(false);
  });

  it("does NOT false-positive on file paths containing 'openai'", () => {
    // This was the original bug — path matching import patterns
    const filePath = "src/lib/openai.ts";
    // The pattern tests against the path string as if it were code — should NOT match
    expect(AI_IMPORT_PATTERNS[0].test(filePath)).toBe(false);
  });
});
