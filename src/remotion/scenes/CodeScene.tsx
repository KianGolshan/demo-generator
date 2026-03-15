import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import type { CodeLine } from "@/types";
import type { Theme } from "../theme";
import { spring } from "../shared/easing";
import { CodeEditor } from "../shared/CodeEditor";

interface CodeSceneProps {
  filename:        string;
  codeLines:       CodeLine[];
  highlightLines?: number[];
  errorLines?:     number[];
  animateTyping?:  boolean;
  overlayText?:    string;
  overlaySub?:     string;
  headline?:       string;
  theme:           Theme;
}

/**
 * CodeScene — left text panel + right syntax-highlighted code editor.
 * Left 45%: headline + overlayText / overlaySub, spring animated in.
 * Right 55%: CodeEditor component with the actual code.
 */
export const CodeScene: React.FC<CodeSceneProps> = ({
  filename,
  codeLines,
  highlightLines,
  errorLines,
  animateTyping,
  overlayText,
  overlaySub,
  headline,
  theme,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Left panel entrance
  const leftS  = spring(frame, fps, { damping: 18, stiffness: 130 });
  const leftX  = (1 - leftS) * -60;
  const leftOp = leftS;

  // Code panel entrance (slight delay)
  const rightS  = spring(Math.max(0, frame - 8), fps, { damping: 18, stiffness: 130 });
  const rightX  = (1 - rightS) * 60;
  const rightOp = rightS;

  // Overlay text fades in at frame 20
  const overlayS  = spring(Math.max(0, frame - 20), fps, { damping: 20, stiffness: 100 });
  const overlayOp = overlayS;

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
          opacity: 0.7,
        }}
      />

      {/* Subtle gradient */}
      <AbsoluteFill style={{ background: theme.gradient, opacity: 0.5 }} />

      {/* Layout */}
      <AbsoluteFill
        style={{
          display: "flex",
          padding: "60px 64px",
          gap:     "48px",
        }}
      >
        {/* Left panel — text */}
        <div
          style={{
            width:          "42%",
            flexShrink:     0,
            display:        "flex",
            flexDirection:  "column",
            justifyContent: "center",
            gap:            "20px",
            opacity:        leftOp,
            transform:      `translateX(${leftX}px)`,
          }}
        >
          {/* Accent dot + label */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
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
                color:         theme.accent,
                fontSize:      "14px",
                fontWeight:    700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              Code
            </span>
          </div>

          {/* Headline */}
          {headline && (
            <h2
              style={{
                fontSize:      "48px",
                fontWeight:    800,
                color:         theme.text,
                margin:        0,
                lineHeight:    1.1,
                letterSpacing: "-0.02em",
              }}
            >
              {headline}
            </h2>
          )}

          {/* Accent line */}
          <div
            style={{
              width:        "48px",
              height:       "3px",
              background:   theme.accent,
              borderRadius: "2px",
            }}
          />

          {/* Overlay caption */}
          {overlayText && (
            <div
              style={{
                opacity:   overlayOp,
                marginTop: "8px",
              }}
            >
              <p
                style={{
                  color:      theme.text,
                  fontSize:   "28px",
                  fontWeight: 600,
                  margin:     0,
                  lineHeight: 1.3,
                }}
              >
                {overlayText}
              </p>
              {overlaySub && (
                <p
                  style={{
                    color:      theme.textMuted,
                    fontSize:   "18px",
                    margin:     "10px 0 0 0",
                    lineHeight: 1.5,
                  }}
                >
                  {overlaySub}
                </p>
              )}
            </div>
          )}

          {/* Filename badge */}
          <div
            style={{
              display:      "inline-flex",
              alignItems:   "center",
              gap:          "8px",
              background:   theme.accentSoft,
              border:       `1px solid ${theme.border}`,
              borderRadius: "6px",
              padding:      "6px 12px",
              alignSelf:    "flex-start",
              marginTop:    "auto",
            }}
          >
            <span style={{ color: theme.accent, fontSize: "14px" }}>📄</span>
            <span
              style={{
                color:      theme.textMuted,
                fontSize:   "14px",
                fontFamily: "monospace",
              }}
            >
              {filename}
            </span>
          </div>
        </div>

        {/* Right panel — code editor */}
        <div
          style={{
            flex:      1,
            opacity:   rightOp,
            transform: `translateX(${rightX}px)`,
            minWidth:  0,
          }}
        >
          <CodeEditor
            filename={filename}
            lines={codeLines}
            highlightLines={highlightLines}
            errorLines={errorLines}
            animateTyping={animateTyping}
            typingStartFrame={0}
          />
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
