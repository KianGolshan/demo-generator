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
 * Feature scene — screenshot with Ken Burns pan + animated text overlay.
 * - Screenshot fills right 55% of frame with a slow Ken Burns zoom
 * - Headline slides in from the left
 * - Body bullets stagger in 200ms (6 frames) apart
 * - Optional tech badge fades in at bottom-left
 * - Left panel: dark gradient with content
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

  // Ken Burns: slow zoom + subtle pan over the full scene duration
  const zoom = interpolate(frame, [0, durationInFrames], [1.0, 1.08], {
    extrapolateRight: "clamp",
  });
  const panX = interpolate(frame, [0, durationInFrames], [0, -24], {
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

  const LEFT_PANEL_WIDTH = "42%";

  return (
    <AbsoluteFill style={{ background: theme.bg, fontFamily: "sans-serif", overflow: "hidden" }}>

      {/* Screenshot — right side with Ken Burns */}
      {screenshotUrl && (
        <div
          style={{
            position: "absolute",
            right:    0,
            top:      0,
            width:    "62%",
            height:   "100%",
            overflow: "hidden",
          }}
        >
          {/* Fade-in gradient overlay on left edge (blends with panel) */}
          <div
            style={{
              position:   "absolute",
              left:       0,
              top:        0,
              width:      "35%",
              height:     "100%",
              background: `linear-gradient(90deg, ${theme.bg}, transparent)`,
              zIndex:     2,
            }}
          />
          <Img
            src={screenshotUrl}
            style={{
              width:          "100%",
              height:         "100%",
              objectFit:      "cover",
              objectPosition: "top left",
              transform:      `scale(${zoom}) translateX(${panX}px)`,
              transformOrigin: "center center",
            }}
          />
          {/* Vignette */}
          <div
            style={{
              position:   "absolute",
              inset:      0,
              background: `linear-gradient(to bottom, transparent 60%, ${theme.bg}80)`,
              zIndex:     1,
            }}
          />
        </div>
      )}

      {/* No screenshot — full-bg gradient */}
      {!screenshotUrl && (
        <AbsoluteFill style={{ background: theme.gradient }} />
      )}

      {/* Left content panel */}
      <div
        style={{
          position:      "absolute",
          left:          0,
          top:           0,
          width:         LEFT_PANEL_WIDTH,
          height:        "100%",
          display:       "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding:       "80px 72px 80px 96px",
          opacity:       panelOpacity,
          background:    screenshotUrl
            ? `linear-gradient(90deg, ${theme.bg} 70%, transparent)`
            : "transparent",
          zIndex:        3,
        }}
      >
        {/* Accent pill */}
        <div
          style={{
            display:        "flex",
            alignItems:     "center",
            gap:            "8px",
            marginBottom:   "32px",
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
            fontSize:      "58px",
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
                  display:   "flex",
                  alignItems: "flex-start",
                  gap:       "12px",
                  opacity:   bulletOpacity,
                  transform: `translateX(${bulletX}px)`,
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
