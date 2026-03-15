import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import type { Theme } from "../theme";
import { spring } from "../shared/easing";

interface ComparisonSceneProps {
  headline:    string;
  leftTitle:   string;
  leftItems:   string[];
  rightTitle:  string;
  rightItems:  string[];
  theme:       Theme;
}

/**
 * ComparisonScene — side-by-side before/after panels.
 * Left panel is dimmed (old way), right panel is accent-highlighted (new way).
 * Spring animates in with a slight delay between left and right.
 */
export const ComparisonScene: React.FC<ComparisonSceneProps> = ({
  headline,
  leftTitle,
  leftItems,
  rightTitle,
  rightItems,
  theme,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Headline entrance
  const headlineS  = spring(frame, fps, { damping: 18, stiffness: 120 });
  const headlineOp = headlineS;
  const headlineY  = (1 - headlineS) * -30;

  // Left panel entrance (slight X offset)
  const leftS  = spring(Math.max(0, frame - 6), fps, { damping: 18, stiffness: 120 });
  const leftX  = (1 - leftS) * -50;
  const leftOp = leftS;

  // Right panel entrance (delayed more)
  const rightS  = spring(Math.max(0, frame - 12), fps, { damping: 18, stiffness: 120 });
  const rightX  = (1 - rightS) * 50;
  const rightOp = rightS;

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

      {/* Gradient */}
      <AbsoluteFill style={{ background: theme.gradient, opacity: 0.5 }} />

      <AbsoluteFill
        style={{
          display:       "flex",
          flexDirection: "column",
          padding:       "60px 80px",
          gap:           "40px",
        }}
      >
        {/* Headline */}
        <div
          style={{
            opacity:   headlineOp,
            transform: `translateY(${headlineY}px)`,
            textAlign: "center",
          }}
        >
          <h2
            style={{
              fontSize:      "52px",
              fontWeight:    800,
              color:         theme.text,
              margin:        0,
              letterSpacing: "-0.02em",
            }}
          >
            {headline}
          </h2>
        </div>

        {/* Panels */}
        <div
          style={{
            display: "flex",
            gap:     "32px",
            flex:    1,
          }}
        >
          {/* Left — old way */}
          <div
            style={{
              flex:          1,
              opacity:       leftOp * 0.75,
              transform:     `translateX(${leftX}px)`,
              background:    theme.bgSecondary,
              border:        `1px solid ${theme.border}`,
              borderRadius:  "12px",
              padding:       "32px 36px",
              display:       "flex",
              flexDirection: "column",
              gap:           "20px",
            }}
          >
            {/* Left title */}
            <div>
              <div
                style={{
                  color:         theme.textMuted,
                  fontSize:      "13px",
                  fontWeight:    700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  marginBottom:  "8px",
                }}
              >
                Before
              </div>
              <h3
                style={{
                  fontSize:   "28px",
                  fontWeight: 700,
                  color:      theme.textMuted,
                  margin:     0,
                }}
              >
                {leftTitle}
              </h3>
            </div>

            {/* Divider */}
            <div
              style={{
                height:     "1px",
                background: theme.border,
              }}
            />

            {/* Items */}
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {leftItems.map((item, i) => {
                const itemS  = spring(Math.max(0, frame - 6 - i * 5), fps, { damping: 22, stiffness: 130 });
                const itemOp = itemS;
                const itemY  = (1 - itemS) * 12;

                return (
                  <div
                    key={i}
                    style={{
                      display:    "flex",
                      alignItems: "flex-start",
                      gap:        "12px",
                      opacity:    itemOp,
                      transform:  `translateY(${itemY}px)`,
                    }}
                  >
                    <span
                      style={{
                        color:      "#f87171",
                        fontSize:   "18px",
                        fontWeight: 700,
                        flexShrink: 0,
                        lineHeight: "1.5",
                      }}
                    >
                      ✗
                    </span>
                    <span
                      style={{
                        color:      theme.textMuted,
                        fontSize:   "20px",
                        lineHeight: "1.5",
                      }}
                    >
                      {item}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right — new way */}
          <div
            style={{
              flex:          1,
              opacity:       rightOp,
              transform:     `translateX(${rightX}px)`,
              background:    theme.bgSecondary,
              border:        `2px solid ${theme.accent}`,
              borderRadius:  "12px",
              padding:       "32px 36px",
              display:       "flex",
              flexDirection: "column",
              gap:           "20px",
              boxShadow:     `0 0 32px ${theme.accentSoft}`,
              position:      "relative",
              overflow:      "hidden",
            }}
          >
            {/* Accent glow overlay */}
            <div
              style={{
                position:   "absolute",
                top:        0,
                left:       0,
                right:      0,
                height:     "60px",
                background: `linear-gradient(180deg, ${theme.accentSoft} 0%, transparent 100%)`,
                pointerEvents: "none",
              }}
            />

            {/* Right title */}
            <div style={{ position: "relative" }}>
              <div
                style={{
                  color:         theme.accent,
                  fontSize:      "13px",
                  fontWeight:    700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  marginBottom:  "8px",
                }}
              >
                After
              </div>
              <h3
                style={{
                  fontSize:   "28px",
                  fontWeight: 700,
                  color:      theme.text,
                  margin:     0,
                }}
              >
                {rightTitle}
              </h3>
            </div>

            {/* Divider */}
            <div
              style={{
                height:     "1px",
                background: theme.accent,
                opacity:    0.3,
              }}
            />

            {/* Items */}
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {rightItems.map((item, i) => {
                const itemS  = spring(Math.max(0, frame - 12 - i * 5), fps, { damping: 22, stiffness: 130 });
                const itemOp = itemS;
                const itemY  = (1 - itemS) * 12;

                return (
                  <div
                    key={i}
                    style={{
                      display:    "flex",
                      alignItems: "flex-start",
                      gap:        "12px",
                      opacity:    itemOp,
                      transform:  `translateY(${itemY}px)`,
                    }}
                  >
                    <span
                      style={{
                        color:      "#4ade80",
                        fontSize:   "18px",
                        fontWeight: 700,
                        flexShrink: 0,
                        lineHeight: "1.5",
                      }}
                    >
                      ✓
                    </span>
                    <span
                      style={{
                        color:      theme.text,
                        fontSize:   "20px",
                        lineHeight: "1.5",
                      }}
                    >
                      {item}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
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
