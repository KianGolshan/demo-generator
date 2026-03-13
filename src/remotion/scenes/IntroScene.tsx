import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { Theme } from "../theme";

interface IntroSceneProps {
  headline:    string;
  tagline:     string;
  body:        string[];
  theme:       Theme;
}

/**
 * Intro scene — full-bleed dark background with animated title entrance.
 * - Title: fade up + scale in from frame 0
 * - Tagline: fades in at frame 20
 * - Body bullets: stagger in from frame 30
 * - Radial gradient glow at top + subtle grid overlay
 */
export const IntroScene: React.FC<IntroSceneProps> = ({
  headline,
  tagline,
  body,
  theme,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Title entrance
  const titleOpacity = interpolate(frame, [0, fps * 0.5], [0, 1], { extrapolateRight: "clamp" });
  const titleY      = interpolate(frame, [0, fps * 0.5], [40, 0],  { extrapolateRight: "clamp" });
  const titleScale  = interpolate(frame, [0, fps * 0.5], [0.92, 1], { extrapolateRight: "clamp" });

  // Tagline entrance (delayed)
  const taglineOpacity = interpolate(frame, [fps * 0.5, fps * 0.9], [0, 1], { extrapolateRight: "clamp" });
  const taglineY       = interpolate(frame, [fps * 0.5, fps * 0.9], [20, 0], { extrapolateRight: "clamp" });

  // Accent line under title
  const lineWidth = interpolate(frame, [fps * 0.4, fps * 0.9], [0, 1], { extrapolateRight: "clamp" });

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

      {/* Radial glow */}
      <AbsoluteFill style={{ background: theme.gradient }} />

      {/* Content */}
      <AbsoluteFill
        style={{
          display:        "flex",
          flexDirection:  "column",
          alignItems:     "center",
          justifyContent: "center",
          padding:        "80px 120px",
          gap:            0,
        }}
      >
        {/* Title */}
        <div
          style={{
            opacity:   titleOpacity,
            transform: `translateY(${titleY}px) scale(${titleScale})`,
            textAlign: "center",
          }}
        >
          <h1
            style={{
              fontSize:      "96px",
              fontWeight:    800,
              color:         theme.text,
              margin:        0,
              lineHeight:    1.05,
              letterSpacing: "-0.03em",
            }}
          >
            {headline}
          </h1>
        </div>

        {/* Accent underline */}
        <div
          style={{
            width:        "80px",
            height:       "4px",
            background:   theme.accent,
            borderRadius: "2px",
            marginTop:    "28px",
            marginBottom: "28px",
            transform:    `scaleX(${lineWidth})`,
            transformOrigin: "left",
          }}
        />

        {/* Tagline */}
        <div
          style={{
            opacity:   taglineOpacity,
            transform: `translateY(${taglineY}px)`,
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize:   "36px",
              color:      theme.textMuted,
              margin:     0,
              fontWeight: 400,
              lineHeight: 1.4,
              maxWidth:   "900px",
            }}
          >
            {tagline}
          </p>
        </div>

        {/* Body bullets */}
        {body.length > 0 && (
          <div
            style={{
              display:       "flex",
              flexDirection: "column",
              gap:           "16px",
              marginTop:     "48px",
              alignItems:    "center",
            }}
          >
            {body.map((line, i) => {
              const bulletDelay = fps * 0.9 + i * (fps * 0.2);
              const bulletOpacity = interpolate(
                frame,
                [bulletDelay, bulletDelay + fps * 0.3],
                [0, 1],
                { extrapolateRight: "clamp" }
              );
              const bulletY = interpolate(
                frame,
                [bulletDelay, bulletDelay + fps * 0.3],
                [12, 0],
                { extrapolateRight: "clamp" }
              );
              return (
                <div
                  key={i}
                  style={{
                    opacity:   bulletOpacity,
                    transform: `translateY(${bulletY}px)`,
                    display:   "flex",
                    alignItems: "center",
                    gap:       "12px",
                  }}
                >
                  <span style={{ color: theme.accent, fontSize: "24px", fontWeight: 700 }}>›</span>
                  <span style={{ color: theme.textMuted, fontSize: "24px" }}>{line}</span>
                </div>
              );
            })}
          </div>
        )}
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
          opacity:    titleOpacity,
        }}
      />
    </AbsoluteFill>
  );
};
