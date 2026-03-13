import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { Theme } from "../theme";

interface OutroSceneProps {
  headline:       string;
  cta?:           string;
  technicalNote?: string;
  body:           string[];
  theme:          Theme;
}

/**
 * Outro scene — centered CTA with animated tech stack chips and a pulsing glow.
 * - Background: deeper gradient version of theme color
 * - Main CTA text: large, centered, fades up
 * - Tagline body bullets: fade in below CTA
 * - Tech note chips: fade in staggered at bottom
 * - Subtle radial glow pulses behind the text
 */
export const OutroScene: React.FC<OutroSceneProps> = ({
  headline,
  cta,
  technicalNote,
  body,
  theme,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Glow pulse
  const glowOpacity = 0.3 + interpolate(
    frame,
    [0, fps * 1.5, fps * 3],
    [0, 0.2, 0],
    { extrapolateRight: "clamp" }
  );

  // CTA entrance
  const ctaOpacity = interpolate(frame, [0, fps * 0.6], [0, 1], { extrapolateRight: "clamp" });
  const ctaY       = interpolate(frame, [0, fps * 0.6], [50, 0], { extrapolateRight: "clamp" });
  const ctaScale   = interpolate(frame, [0, fps * 0.6], [0.9, 1], { extrapolateRight: "clamp" });

  // Headline (secondary)
  const headlineOpacity = interpolate(frame, [fps * 0.5, fps * 0.9], [0, 1], { extrapolateRight: "clamp" });
  const headlineY       = interpolate(frame, [fps * 0.5, fps * 0.9], [20, 0], { extrapolateRight: "clamp" });

  // Body bullets
  // Tech chips at bottom
  const chips = technicalNote
    ? technicalNote.split(/[,+·|]/).map((s) => s.trim()).filter(Boolean)
    : [];

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

      {/* Deep radial gradient background */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 100% 80% at 50% 50%, ${theme.accentSoft.replace("0.15", "0.25")} 0%, transparent 70%)`,
          opacity: glowOpacity * 2,
        }}
      />

      {/* Top gradient */}
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
        {/* CTA — large centered text */}
        {cta && (
          <div
            style={{
              opacity:   ctaOpacity,
              transform: `translateY(${ctaY}px) scale(${ctaScale})`,
              textAlign: "center",
              marginBottom: "40px",
            }}
          >
            <div
              style={{
                fontSize:      "80px",
                fontWeight:    800,
                color:         theme.accent,
                lineHeight:    1.1,
                letterSpacing: "-0.02em",
              }}
            >
              {cta}
            </div>
          </div>
        )}

        {/* Headline */}
        <div
          style={{
            opacity:   headlineOpacity,
            transform: `translateY(${headlineY}px)`,
            textAlign: "center",
          }}
        >
          <h2
            style={{
              fontSize:      cta ? "48px" : "80px",
              fontWeight:    cta ? 600 : 800,
              color:         cta ? theme.text : theme.accent,
              margin:        0,
              lineHeight:    1.15,
              letterSpacing: "-0.02em",
            }}
          >
            {headline}
          </h2>
        </div>

        {/* Body bullets */}
        {body.length > 0 && (
          <div
            style={{
              display:       "flex",
              flexDirection: "column",
              gap:           "12px",
              marginTop:     "32px",
              alignItems:    "center",
            }}
          >
            {body.map((line, i) => {
              const delay = fps * 0.9 + i * (fps * 0.15);
              const op = interpolate(frame, [delay, delay + fps * 0.3], [0, 1], { extrapolateRight: "clamp" });
              const ty = interpolate(frame, [delay, delay + fps * 0.3], [12, 0], { extrapolateRight: "clamp" });
              return (
                <p
                  key={i}
                  style={{
                    opacity:   op,
                    transform: `translateY(${ty}px)`,
                    color:     theme.textMuted,
                    fontSize:  "28px",
                    margin:    0,
                  }}
                >
                  {line}
                </p>
              );
            })}
          </div>
        )}

        {/* Tech stack chips */}
        {chips.length > 0 && (
          <div
            style={{
              display:    "flex",
              flexWrap:   "wrap",
              gap:        "12px",
              marginTop:  "56px",
              justifyContent: "center",
            }}
          >
            {chips.map((chip, i) => {
              const delay = fps * 1.2 + i * (fps * 0.1);
              const op = interpolate(frame, [delay, delay + fps * 0.3], [0, 1], { extrapolateRight: "clamp" });
              const ty = interpolate(frame, [delay, delay + fps * 0.3], [8, 0], { extrapolateRight: "clamp" });
              return (
                <div
                  key={i}
                  style={{
                    opacity:      op,
                    transform:    `translateY(${ty}px)`,
                    background:   theme.accentSoft,
                    border:       `1px solid ${theme.border}`,
                    borderRadius: "8px",
                    padding:      "10px 20px",
                    color:        theme.text,
                    fontSize:     "20px",
                    fontWeight:   500,
                  }}
                >
                  {chip}
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
          height:     "4px",
          background: `linear-gradient(90deg, transparent, ${theme.accent}, transparent)`,
          opacity:    ctaOpacity,
        }}
      />
    </AbsoluteFill>
  );
};
