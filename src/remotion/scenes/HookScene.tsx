import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import type { Theme } from "../theme";
import { spring } from "../shared/easing";

interface HookSceneProps {
  lines:       string[];
  accentLine?: number;   // 0-indexed
  theme:       Theme;
}

/**
 * HookScene — full-screen punchy text with spring-physics stagger.
 * Each line spring-animates up with an 8-frame delay between lines.
 * The accentLine is rendered larger and in the theme accent color.
 */
export const HookScene: React.FC<HookSceneProps> = ({ lines, accentLine, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const STAGGER = 8; // frames between each line

  return (
    <AbsoluteFill style={{ background: theme.bg, fontFamily: "sans-serif", overflow: "hidden" }}>

      {/* Background grid */}
      <AbsoluteFill
        style={{
          backgroundImage: `
            linear-gradient(${theme.gridColor} 1px, transparent 1px),
            linear-gradient(90deg, ${theme.gridColor} 1px, transparent 1px)
          `,
          backgroundSize: "80px 80px",
        }}
      />

      {/* Radial gradient glow */}
      <AbsoluteFill style={{ background: theme.gradient }} />

      {/* Lines */}
      <AbsoluteFill
        style={{
          display:        "flex",
          flexDirection:  "column",
          alignItems:     "center",
          justifyContent: "center",
          padding:        "80px 160px",
          gap:            "24px",
        }}
      >
        {lines.map((line, i) => {
          const startFrame = i * STAGGER;
          const s = spring(Math.max(0, frame - startFrame), fps, { damping: 16, stiffness: 140 });
          const translateY = (1 - s) * 40;
          const opacity    = s;

          const isAccent = accentLine !== undefined && accentLine === i;

          return (
            <div
              key={i}
              style={{
                opacity,
                transform:  `translateY(${translateY}px)`,
                textAlign:  "center",
                lineHeight: 1.15,
              }}
            >
              <span
                style={{
                  fontSize:      isAccent ? "88px" : "64px",
                  fontWeight:    isAccent ? 900 : 700,
                  color:         isAccent ? theme.accent : theme.text,
                  letterSpacing: isAccent ? "-0.03em" : "-0.02em",
                  display:       "block",
                }}
              >
                {line}
              </span>
            </div>
          );
        })}
      </AbsoluteFill>

      {/* Bottom accent bar */}
      <div
        style={{
          position:   "absolute",
          bottom:     0,
          left:       0,
          right:      0,
          height:     "3px",
          background: `linear-gradient(90deg, transparent, ${theme.accent}, transparent)`,
        }}
      />
    </AbsoluteFill>
  );
};
