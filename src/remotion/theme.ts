import type { StylePreset } from "@/types";

/**
 * Visual theme tokens for each style preset.
 * All Remotion components consume these — no Tailwind inside Remotion context.
 */
export interface Theme {
  bg:           string;
  bgSecondary:  string;
  accent:       string;
  accentSoft:   string;
  text:         string;
  textMuted:    string;
  border:       string;
  gradient:     string;
  gridColor:    string;
}

export const THEMES: Record<StylePreset, Theme> = {
  clean: {
    bg:          "#0a0a0f",
    bgSecondary: "#12121f",
    accent:      "#6366f1",
    accentSoft:  "rgba(99,102,241,0.15)",
    text:        "#f0f0f5",
    textMuted:   "#8888a8",
    border:      "#2a2a3e",
    gradient:    "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(99,102,241,0.18) 0%, transparent 70%)",
    gridColor:   "rgba(99,102,241,0.06)",
  },
  cyber: {
    bg:          "#040d12",
    bgSecondary: "#071520",
    accent:      "#22d3ee",
    accentSoft:  "rgba(34,211,238,0.12)",
    text:        "#e0f8ff",
    textMuted:   "#5a8a99",
    border:      "#0e2a35",
    gradient:    "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(34,211,238,0.15) 0%, transparent 70%)",
    gridColor:   "rgba(34,211,238,0.07)",
  },
  playful: {
    bg:          "#0f0a1e",
    bgSecondary: "#1a1030",
    accent:      "#f472b6",
    accentSoft:  "rgba(244,114,182,0.15)",
    text:        "#fdf0f8",
    textMuted:   "#9a7aaa",
    border:      "#2e1a3e",
    gradient:    "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(244,114,182,0.2) 0%, transparent 70%)",
    gridColor:   "rgba(244,114,182,0.06)",
  },
};

/** Returns theme tokens for a given style preset. */
export function getTheme(preset: StylePreset): Theme {
  return THEMES[preset] ?? THEMES.clean;
}

/** Video dimensions for each aspect ratio at 30fps. */
export const VIDEO_DIMENSIONS = {
  "16:9": { width: 1920, height: 1080 },
  "9:16": { width: 1080, height: 1920 },
} as const;

export const FPS = 30;
