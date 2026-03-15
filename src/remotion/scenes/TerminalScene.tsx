import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { Theme } from "../theme";
import { spring } from "../shared/easing";

interface TerminalLine {
  text:     string;
  isError?: boolean;
}

interface TerminalSceneProps {
  terminalLines: TerminalLine[];
  overlayText?:  string;
  overlaySub?:   string;
  theme:         Theme;
}

const CHARS_PER_FRAME = 4;
const TERMINAL_BG     = "#0a1628";
const TERMINAL_PANEL  = "#0d1f35";
const TERMINAL_BORDER = "rgba(255,255,255,0.08)";
const TERMINAL_GREEN  = "#4ade80";
const TERMINAL_RED    = "#f87171";
const TERMINAL_PROMPT = "#22d3ee";
const TERMINAL_TEXT   = "#e2e8f0";
const LINE_HEIGHT     = 24; // px

/**
 * TerminalScene — streaming terminal output with per-character animation.
 * Lines stream in 4 chars/frame. Error lines render in red. Blinking cursor.
 * An overlayText badge fades in after all lines finish.
 */
export const TerminalScene: React.FC<TerminalSceneProps> = ({
  terminalLines,
  overlayText,
  overlaySub,
  theme,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Panel entrance spring
  const panelS  = spring(frame, fps, { damping: 18, stiffness: 120 });
  const panelY  = (1 - panelS) * 40;
  const panelOp = panelS;

  // Total chars across all lines (with newlines between)
  const allText = terminalLines.map((l) => l.text).join("\n");
  const totalChars = allText.length + terminalLines.length; // +newlines
  const charsShown = frame * CHARS_PER_FRAME;
  const allDone    = charsShown >= totalChars;

  // Resolve per-line visible content
  let remaining = charsShown;
  const renderedLines: { text: string; done: boolean; isError: boolean }[] = [];
  for (const line of terminalLines) {
    const lineLen = line.text.length + 1; // +1 for newline
    if (remaining >= lineLen) {
      renderedLines.push({ text: line.text, done: true, isError: !!line.isError });
      remaining -= lineLen;
    } else if (remaining > 0) {
      renderedLines.push({ text: line.text.slice(0, remaining), done: false, isError: !!line.isError });
      remaining = 0;
    } else {
      // Line not yet reached — push empty so the array stays the right length
      break;
    }
  }

  // Blinking cursor on the current (last partial) line
  const cursorVisible = Math.floor(frame / 15) % 2 === 0;
  const cursorLineIdx = renderedLines.length > 0 && !renderedLines[renderedLines.length - 1].done
    ? renderedLines.length - 1
    : -1;

  // Overlay fades in when all text is done (or near end of scene)
  const overlayStartFrame = allDone
    ? Math.min(frame, durationInFrames - 45)
    : durationInFrames - 45;
  const overlayOp = interpolate(
    frame,
    [overlayStartFrame, overlayStartFrame + 15],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        background: theme.bg === "#0a0a0f" ? TERMINAL_BG : theme.bg,
        fontFamily: "sans-serif",
        overflow:   "hidden",
      }}
    >
      {/* Background grid */}
      <AbsoluteFill
        style={{
          backgroundImage: `
            linear-gradient(${theme.gridColor} 1px, transparent 1px),
            linear-gradient(90deg, ${theme.gridColor} 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
          opacity: 0.4,
        }}
      />

      {/* Gradient glow */}
      <AbsoluteFill style={{ background: theme.gradient, opacity: 0.3 }} />

      {/* Terminal panel */}
      <AbsoluteFill
        style={{
          display:        "flex",
          flexDirection:  "column",
          alignItems:     "center",
          justifyContent: "center",
          padding:        "60px 80px",
        }}
      >
        <div
          style={{
            width:        "100%",
            maxWidth:     "960px",
            opacity:      panelOp,
            transform:    `translateY(${panelY}px)`,
            borderRadius: "12px",
            overflow:     "hidden",
            border:       `1px solid ${TERMINAL_BORDER}`,
            boxShadow:    "0 40px 80px rgba(0,0,0,0.5)",
          }}
        >
          {/* Terminal title bar */}
          <div
            style={{
              background:   "#1e2d42",
              borderBottom: `1px solid ${TERMINAL_BORDER}`,
              padding:      "10px 16px",
              display:      "flex",
              alignItems:   "center",
              gap:          "10px",
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

            {/* TERMINAL label */}
            <div
              style={{
                flex:        1,
                textAlign:   "center",
                color:       "rgba(255,255,255,0.4)",
                fontSize:    "12px",
                fontFamily:  "monospace",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              TERMINAL
            </div>

            {/* Status dot */}
            <div
              style={{
                width:        "8px",
                height:       "8px",
                borderRadius: "50%",
                background:   TERMINAL_GREEN,
                boxShadow:    `0 0 6px ${TERMINAL_GREEN}`,
              }}
            />
          </div>

          {/* Code area */}
          <div
            style={{
              background:   TERMINAL_PANEL,
              padding:      "20px 24px",
              minHeight:    "300px",
              maxHeight:    "480px",
              overflowY:    "hidden",
            }}
          >
            {renderedLines.map((line, i) => {
              const isCursor = i === cursorLineIdx;

              return (
                <div
                  key={i}
                  style={{
                    display:    "flex",
                    alignItems: "center",
                    height:     `${LINE_HEIGHT}px`,
                    gap:        "8px",
                  }}
                >
                  {/* Prompt symbol */}
                  <span
                    style={{
                      color:      line.isError ? TERMINAL_RED : TERMINAL_PROMPT,
                      fontSize:   "13px",
                      fontFamily: "monospace",
                      flexShrink: 0,
                      opacity:    line.isError ? 1 : 0.7,
                    }}
                  >
                    {line.isError ? "✗" : "›"}
                  </span>

                  {/* Line text */}
                  <span
                    style={{
                      color:      line.isError ? TERMINAL_RED : TERMINAL_TEXT,
                      fontSize:   "13px",
                      fontFamily: "monospace",
                      whiteSpace: "pre",
                    }}
                  >
                    {line.text}
                  </span>

                  {/* Blinking cursor */}
                  {isCursor && cursorVisible && (
                    <span
                      style={{
                        display:    "inline-block",
                        width:      "8px",
                        height:     "14px",
                        background: TERMINAL_TEXT,
                        opacity:    0.8,
                      }}
                    />
                  )}
                </div>
              );
            })}

            {/* Idle cursor after all lines done */}
            {allDone && cursorVisible && (
              <div
                style={{
                  display:    "flex",
                  alignItems: "center",
                  height:     `${LINE_HEIGHT}px`,
                  gap:        "8px",
                }}
              >
                <span style={{ color: TERMINAL_PROMPT, fontSize: "13px", fontFamily: "monospace", opacity: 0.7 }}>›</span>
                <span
                  style={{
                    display:    "inline-block",
                    width:      "8px",
                    height:     "14px",
                    background: TERMINAL_TEXT,
                    opacity:    0.8,
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Overlay badge */}
        {overlayText && (
          <div
            style={{
              opacity:      overlayOp,
              marginTop:    "32px",
              textAlign:    "center",
              background:   theme.accentSoft,
              border:       `1px solid ${theme.border}`,
              borderRadius: "10px",
              padding:      "16px 40px",
            }}
          >
            <div style={{ color: theme.text, fontSize: "24px", fontWeight: 700 }}>
              {overlayText}
            </div>
            {overlaySub && (
              <div style={{ color: theme.textMuted, fontSize: "16px", marginTop: "6px" }}>
                {overlaySub}
              </div>
            )}
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
        }}
      />
    </AbsoluteFill>
  );
};
