import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { Theme } from "../theme";
import { spring } from "../shared/easing";

interface EndCardSceneProps {
  title:     string;
  tagline:   string;
  subtext?:  string;
  theme:     Theme;
}

const PARTICLE_COUNT = 16;

/**
 * EndCardScene — branded final card with floating particles and spring entrances.
 * Radial gradient using theme.accent, 16 sine-wave floating particles.
 */
export const EndCardScene: React.FC<EndCardSceneProps> = ({
  title,
  tagline,
  subtext,
  theme,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Title spring entrance
  const titleS   = spring(frame, fps, { damping: 16, stiffness: 130 });
  const titleOp  = titleS;
  const titleY   = (1 - titleS) * 50;
  const titleScl = 0.85 + titleS * 0.15;

  // Tagline — delayed
  const taglineS  = spring(Math.max(0, frame - 10), fps, { damping: 18, stiffness: 120 });
  const taglineOp = taglineS;
  const taglineY  = (1 - taglineS) * 30;

  // Subtext — more delayed
  const subtextS  = spring(Math.max(0, frame - 18), fps, { damping: 20, stiffness: 110 });
  const subtextOp = subtextS;

  // Glow pulse
  const glowOp = 0.4 + interpolate(
    frame,
    [0, fps * 1.5, fps * 3],
    [0, 0.2, 0],
    { extrapolateRight: "clamp" }
  );

  // Particles — sine wave float
  const particles = Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const seed    = (i * 137.508) % 360; // golden angle scatter
    const x       = (Math.sin(seed * 0.0174533) * 0.45 + 0.5) * (width ?? 1920);
    const baseY   = (Math.cos(seed * 0.0174533 + 1.2) * 0.4 + 0.5) * (height ?? 1080);
    const floatAmp = 8 + (i % 5) * 4;
    const floatSpeed = 0.03 + (i % 4) * 0.01;
    const y = baseY + Math.sin(frame * floatSpeed + seed) * floatAmp;
    const size = 2 + (i % 4) * 1.5;
    const opacity = 0.15 + (Math.sin(frame * 0.04 + i) * 0.5 + 0.5) * 0.25;

    return { x, y, size, opacity };
  });

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
          background: `radial-gradient(ellipse 120% 100% at 50% 50%, ${theme.accentSoft} 0%, transparent 65%)`,
          opacity:    glowOp * 2,
        }}
      />

      {/* Top gradient */}
      <AbsoluteFill style={{ background: theme.gradient }} />

      {/* Particles */}
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            position:     "absolute",
            left:         `${p.x}px`,
            top:          `${p.y}px`,
            width:        `${p.size}px`,
            height:       `${p.size}px`,
            borderRadius: "50%",
            background:   theme.accent,
            opacity:      p.opacity,
            transform:    "translate(-50%, -50%)",
          }}
        />
      ))}

      {/* Content */}
      <AbsoluteFill
        style={{
          display:        "flex",
          flexDirection:  "column",
          alignItems:     "center",
          justifyContent: "center",
          padding:        "80px 120px",
          gap:            "0",
        }}
      >
        {/* Title */}
        <div
          style={{
            opacity:   titleOp,
            transform: `translateY(${titleY}px) scale(${titleScl})`,
            textAlign: "center",
          }}
        >
          <h1
            style={{
              fontSize:      "100px",
              fontWeight:    900,
              color:         theme.text,
              margin:        0,
              lineHeight:    1.05,
              letterSpacing: "-0.03em",
            }}
          >
            {title}
          </h1>
        </div>

        {/* Accent underline */}
        <div
          style={{
            width:        "80px",
            height:       "4px",
            background:   `linear-gradient(90deg, ${theme.accent}, transparent)`,
            borderRadius: "2px",
            marginTop:    "24px",
            marginBottom: "24px",
            opacity:      titleOp,
          }}
        />

        {/* Tagline */}
        <div
          style={{
            opacity:   taglineOp,
            transform: `translateY(${taglineY}px)`,
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize:   "40px",
              color:      theme.accent,
              margin:     0,
              fontWeight: 600,
              lineHeight: 1.3,
              maxWidth:   "900px",
            }}
          >
            {tagline}
          </p>
        </div>

        {/* Subtext */}
        {subtext && (
          <div
            style={{
              opacity:   subtextOp,
              textAlign: "center",
              marginTop: "24px",
            }}
          >
            <p
              style={{
                fontSize:   "22px",
                color:      theme.textMuted,
                margin:     0,
                fontWeight: 400,
              }}
            >
              {subtext}
            </p>
          </div>
        )}
      </AbsoluteFill>

      {/* Bottom accent line */}
      <div
        style={{
          position:   "absolute",
          bottom:     0,
          left:       0,
          right:      0,
          height:     "4px",
          background: `linear-gradient(90deg, transparent, ${theme.accent}, transparent)`,
          opacity:    titleOp,
        }}
      />
    </AbsoluteFill>
  );
};
