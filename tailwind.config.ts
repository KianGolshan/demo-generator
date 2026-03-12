import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/remotion/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        accent:     "var(--accent)",
        "accent-bright": "var(--accent-bright)",
        muted:      "var(--muted)",
        "muted-fg": "var(--muted-foreground)",
        border:     "var(--border)",
        card:       "var(--card)",
        success:    "var(--success)",
        warning:    "var(--warning)",
        danger:     "var(--danger)",
      },
      fontFamily: {
        display: ["Syne", "sans-serif"],
        mono:    ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        DEFAULT: "8px",
      },
      animation: {
        "fade-up":  "fadeUp 0.4s ease-out forwards",
        "fade-in":  "fadeIn 0.3s ease-out forwards",
        "scale-in": "scaleIn 0.3s ease-out forwards",
      },
    },
  },
  plugins: [],
};

export default config;
