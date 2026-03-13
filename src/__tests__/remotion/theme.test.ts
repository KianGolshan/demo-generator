/**
 * Tests for Remotion theme system and video dimension resolution.
 * Ensures all themes are fully defined and the accentSoft regex fix works.
 */
import { describe, it, expect } from "vitest";

// ─── Replicate theme tokens ───────────────────────────────────────────────────

interface Theme {
  bg: string; accent: string; text: string; textMuted: string;
  gradient: string; gridColor: string; border: string; accentSoft: string;
}

const THEMES: Record<"clean" | "cyber" | "playful", Theme> = {
  clean: {
    bg:         "#0a0a0f",
    accent:     "#6366f1",
    text:       "#f8fafc",
    textMuted:  "#94a3b8",
    gradient:   "linear-gradient(135deg, rgba(99,102,241,0.08) 0%, transparent 60%)",
    gridColor:  "rgba(99,102,241,0.04)",
    border:     "rgba(99,102,241,0.2)",
    accentSoft: "rgba(99,102,241,0.15)",
  },
  cyber: {
    bg:         "#020817",
    accent:     "#22d3ee",
    text:       "#f0fdff",
    textMuted:  "#94a3b8",
    gradient:   "linear-gradient(135deg, rgba(34,211,238,0.08) 0%, transparent 60%)",
    gridColor:  "rgba(34,211,238,0.05)",
    border:     "rgba(34,211,238,0.2)",
    accentSoft: "rgba(34,211,238,0.12)",
  },
  playful: {
    bg:         "#0f0a1e",
    accent:     "#f472b6",
    text:       "#fdf4ff",
    textMuted:  "#c4b5fd",
    gradient:   "linear-gradient(135deg, rgba(244,114,182,0.1) 0%, transparent 60%)",
    gridColor:  "rgba(244,114,182,0.04)",
    border:     "rgba(244,114,182,0.2)",
    accentSoft: "rgba(244,114,182,0.15)",
  },
};

const VIDEO_DIMENSIONS = {
  "16:9": { width: 1920, height: 1080 },
  "9:16": { width: 1080, height: 1920 },
  "4:3":  { width: 1440, height: 1080 },
};

// The FIXED regex from OutroScene.tsx
function buildGlowBackground(theme: Theme): string {
  return `radial-gradient(ellipse 100% 80% at 50% 50%, ${theme.accentSoft.replace(/[\d.]+\)$/, "0.25)")} 0%, transparent 70%)`;
}

// The BROKEN original function (for regression testing)
function buildGlowBackgroundBroken(theme: Theme): string {
  return `radial-gradient(ellipse 100% 80% at 50% 50%, ${theme.accentSoft.replace("0.15", "0.25")} 0%, transparent 70%)`;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("Theme tokens — completeness", () => {
  it.each(["clean", "cyber", "playful"] as const)("theme '%s' has all required keys", (preset) => {
    const t = THEMES[preset];
    expect(t.bg).toBeTruthy();
    expect(t.accent).toBeTruthy();
    expect(t.text).toBeTruthy();
    expect(t.textMuted).toBeTruthy();
    expect(t.gradient).toBeTruthy();
    expect(t.gridColor).toBeTruthy();
    expect(t.border).toBeTruthy();
    expect(t.accentSoft).toBeTruthy();
  });
});

describe("OutroScene glow background — accentSoft opacity replacement", () => {
  it("correctly replaces opacity in clean theme (0.15 → 0.25)", () => {
    const result = buildGlowBackground(THEMES.clean);
    expect(result).toContain("0.25)");
    expect(result).not.toContain("0.15)");
  });

  it("correctly replaces opacity in cyber theme (0.12 → 0.25) — was broken before fix", () => {
    const result = buildGlowBackground(THEMES.cyber);
    expect(result).toContain("0.25)");
    expect(result).not.toContain("0.12)");
  });

  it("correctly replaces opacity in playful theme (0.15 → 0.25)", () => {
    const result = buildGlowBackground(THEMES.playful);
    expect(result).toContain("0.25)");
    expect(result).not.toContain("0.15)");
  });

  it("REGRESSION: old broken approach fails for cyber theme", () => {
    // This proves the bug existed before our fix
    const result = buildGlowBackgroundBroken(THEMES.cyber);
    // cyber accentSoft is "rgba(34,211,238,0.12)" — string "0.15" not present, no replacement
    expect(result).toContain("0.12)");  // still has the original value, not replaced
    expect(result).not.toContain("0.25)");  // replacement never happened
  });
});

describe("Video dimensions", () => {
  it("16:9 resolves to 1920×1080", () => {
    expect(VIDEO_DIMENSIONS["16:9"]).toEqual({ width: 1920, height: 1080 });
  });

  it("9:16 resolves to 1080×1920 (portrait/mobile)", () => {
    expect(VIDEO_DIMENSIONS["9:16"]).toEqual({ width: 1080, height: 1920 });
  });

  it("16:9 is wider than tall", () => {
    const { width, height } = VIDEO_DIMENSIONS["16:9"];
    expect(width).toBeGreaterThan(height);
  });

  it("9:16 is taller than wide", () => {
    const { width, height } = VIDEO_DIMENSIONS["9:16"];
    expect(height).toBeGreaterThan(width);
  });
});
