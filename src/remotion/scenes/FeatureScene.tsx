import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { Theme } from "../theme";

interface FeatureSceneProps {
  headline:      string;
  body:          string[];
  screenshotUrl?: string;
  technicalNote?: string;
  theme:          Theme;
}

/**
 * Feature scene — floating browser mockup on right + animated text overlay on left.
 * - Screenshot shown inside a browser-chrome frame with drop shadow + tilt
 * - Headline slides in from the left
 * - Body bullets stagger in 200ms apart
 * - Optional tech badge fades in at bottom-left
 */
export const FeatureScene: React.FC<FeatureSceneProps> = ({
  headline,
  body,
  screenshotUrl,
  technicalNote,
  theme,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Browser mockup entrance: slides in from right + slight scale
  const mockupDelay = fps * 0.1;
  const mockupOpacity = interpolate(
    frame,
    [mockupDelay, mockupDelay + fps * 0.5],
    [0, 1],
    { extrapolateRight: "clamp" }
  );
  const mockupX = interpolate(
    frame,
    [mockupDelay, mockupDelay + fps * 0.5],
    [80, 0],
    { extrapolateRight: "clamp" }
  );

  // Subtle Ken Burns inside the screenshot
  const zoom = interpolate(frame, [0, durationInFrames], [1.0, 1.05], {
    extrapolateRight: "clamp",
  });

  // Left panel fade in
  const panelOpacity = interpolate(frame, [0, fps * 0.3], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Headline slide in from left
  const headlineDelay = fps * 0.2;
  const headlineOpacity = interpolate(
    frame,
    [headlineDelay, headlineDelay + fps * 0.4],
    [0, 1],
    { extrapolateRight: "clamp" }
  );
  const headlineX = interpolate(
    frame,
    [headlineDelay, headlineDelay + fps * 0.4],
    [-60, 0],
    { extrapolateRight: "clamp" }
  );

  // Accent line
  const lineWidth = interpolate(
    frame,
    [headlineDelay + fps * 0.2, headlineDelay + fps * 0.6],
    [0, 1],
    { extrapolateRight: "clamp" }
  );

  // Tech badge
  const badgeOpacity = interpolate(
    frame,
    [fps * 0.8, fps * 1.1],
    [0, 0.8],
    { extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ background: theme.bg, fontFamily: "sans-serif", overflow: "hidden" }}>

      {/* Subtle background gradient */}
      <AbsoluteFill style={{ background: theme.gradient, opacity: 0.4 }} />

      {/* Background grid */}
      <AbsoluteFill
        style={{
          backgroundImage: `
            linear-gradient(${theme.gridColor} 1px, transparent 1px),
            linear-gradient(90deg, ${theme.gridColor} 1px, transparent 1px)
          `,
          backgroundSize: "80px 80px",
          opacity: 0.5,
        }}
      />

      {/* Browser mockup — right side */}
      {screenshotUrl && (
        <div
          style={{
            position:  "absolute",
            right:     "5%",
            top:       "50%",
            transform: `translateX(${mockupX}px) translateY(-50%) rotate(1.5deg)`,
            width:     "52%",
            opacity:   mockupOpacity,
            zIndex:    2,
            // Drop shadow for floating effect
            filter:    "drop-shadow(0 32px 64px rgba(0,0,0,0.55))",
          }}
        >
          {/* Browser chrome */}
          <div
            style={{
              background:   "#1e1e2e",
              border:       `1px solid ${theme.border}`,
              borderBottom: "none",
              borderRadius: "12px 12px 0 0",
              padding:      "12px 16px",
              display:      "flex",
              alignItems:   "center",
              gap:          "8px",
            }}
          >
            {/* Traffic lights */}
            <div style={{ display: "flex", gap: "6px" }}>
              {["#ff5f57", "#febc2e", "#28c840"].map((c, i) => (
                <div
                  key={i}
                  style={{
                    width:        "12px",
                    height:       "12px",
                    borderRadius: "50%",
                    background:   c,
                    opacity:      0.9,
                  }}
                />
              ))}
            </div>
            {/* Fake URL bar */}
            <div
              style={{
                flex:         1,
                background:   "rgba(255,255,255,0.06)",
                border:       "1px solid rgba(255,255,255,0.08)",
                borderRadius: "6px",
                height:       "22px",
                marginLeft:   "8px",
              }}
            />
          </div>

          {/* Screenshot */}
          <div
            style={{
              overflow:     "hidden",
              border:       `1px solid ${theme.border}`,
              borderTop:    "none",
              borderRadius: "0 0 12px 12px",
              aspectRatio:  "16/10",
            }}
          >
            <Img
              src={screenshotUrl}
              style={{
                width:          "100%",
                height:         "100%",
                objectFit:      "cover",
                objectPosition: "top left",
                transform:      `scale(${zoom})`,
                transformOrigin: "top left",
                display:        "block",
              }}
            />
          </div>
        </div>
      )}

      {/* No screenshot — just gradient bg */}
      {!screenshotUrl && (
        <AbsoluteFill style={{ background: theme.gradient }} />
      )}

      {/* Left content panel */}
      <div
        style={{
          position:      "absolute",
          left:          0,
          top:           0,
          width:         "46%",
          height:        "100%",
          display:       "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding:       "80px 64px 80px 96px",
          opacity:       panelOpacity,
          zIndex:        3,
        }}
      >
        {/* Accent pill */}
        <div
          style={{
            display:      "flex",
            alignItems:   "center",
            gap:          "8px",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              width:        "8px",
              height:       "8px",
              borderRadius: "50%",
              background:   theme.accent,
            }}
          />
          <span
            style={{
              fontSize:      "18px",
              color:         theme.accent,
              fontWeight:    600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Feature
          </span>
        </div>

        {/* Headline */}
        <h2
          style={{
            fontSize:      "54px",
            fontWeight:    800,
            color:         theme.text,
            margin:        0,
            lineHeight:    1.1,
            letterSpacing: "-0.02em",
            opacity:       headlineOpacity,
            transform:     `translateX(${headlineX}px)`,
          }}
        >
          {headline}
        </h2>

        {/* Accent line */}
        <div
          style={{
            width:           "48px",
            height:          "3px",
            background:      theme.accent,
            borderRadius:    "2px",
            marginTop:       "24px",
            marginBottom:    "24px",
            transform:       `scaleX(${lineWidth})`,
            transformOrigin: "left",
          }}
        />

        {/* Body bullets */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {body.map((line, i) => {
            const bulletDelay = headlineDelay + fps * 0.4 + i * (fps * 0.2);
            const bulletOpacity = interpolate(
              frame,
              [bulletDelay, bulletDelay + fps * 0.35],
              [0, 1],
              { extrapolateRight: "clamp" }
            );
            const bulletX = interpolate(
              frame,
              [bulletDelay, bulletDelay + fps * 0.35],
              [-20, 0],
              { extrapolateRight: "clamp" }
            );
            return (
              <div
                key={i}
                style={{
                  display:    "flex",
                  alignItems: "flex-start",
                  gap:        "12px",
                  opacity:    bulletOpacity,
                  transform:  `translateX(${bulletX}px)`,
                }}
              >
                <span
                  style={{
                    color:      theme.accent,
                    fontSize:   "22px",
                    fontWeight: 700,
                    lineHeight: "1.4",
                    flexShrink: 0,
                  }}
                >
                  ›
                </span>
                <span style={{ color: theme.textMuted, fontSize: "22px", lineHeight: 1.4 }}>
                  {line}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tech badge — bottom left */}
      {technicalNote && (
        <div
          style={{
            position:     "absolute",
            bottom:       "48px",
            left:         "96px",
            opacity:      badgeOpacity,
            zIndex:       4,
            background:   theme.accentSoft,
            border:       `1px solid ${theme.border}`,
            borderRadius: "8px",
            padding:      "8px 16px",
          }}
        >
          <span style={{ color: theme.textMuted, fontSize: "18px" }}>
            {technicalNote}
          </span>
        </div>
      )}
    </AbsoluteFill>
  );
};
