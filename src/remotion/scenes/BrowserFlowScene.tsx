import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { BrowserStep } from "@/types";
import type { Theme } from "../theme";
import { spring, easeOutCubic } from "../shared/easing";
import { BrowserMockup } from "../shared/BrowserMockup";

interface BrowserFlowSceneProps {
  url:          string;
  steps:        BrowserStep[];
  headline?:    string;
  overlayText?: string;
  theme:        Theme;
}

// ─── Browser content renderer ──────────────────────────────────────────────

interface BrowserContentProps {
  steps:  BrowserStep[];
  frame:  number;
  fps:    number;
  theme:  Theme;
}

const BrowserContent: React.FC<BrowserContentProps> = ({ steps, frame, theme }) => {
  // Find the current active step
  const activeIdx = steps.reduce((acc, step, i) => {
    return frame >= step.frame ? i : acc;
  }, -1);

  const activeStep = activeIdx >= 0 ? steps[activeIdx] : null;

  // --- Shared dark app styles ---
  const inputStyle: React.CSSProperties = {
    background:   "rgba(255,255,255,0.06)",
    border:       "1px solid rgba(255,255,255,0.15)",
    borderRadius: "8px",
    padding:      "12px 16px",
    color:        "#f0f0f5",
    fontSize:     "16px",
    fontFamily:   "sans-serif",
    outline:      "none",
    width:        "100%",
    boxSizing:    "border-box",
  };

  // "load" — initial form state
  const renderLoad = () => (
    <div
      style={{
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "center",
        height:         "100%",
        padding:        "40px",
        gap:            "20px",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: "8px" }}>
        <div style={{ color: theme.text, fontSize: "24px", fontWeight: 700, marginBottom: "6px" }}>
          {steps.find((s) => s.type === "load")?.label ?? "App"}
        </div>
        <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "14px" }}>
          Enter details to get started
        </div>
      </div>
      <div style={{ width: "100%", maxWidth: "480px" }}>
        <div style={inputStyle}>
          <span style={{ color: "rgba(255,255,255,0.25)" }}>Search…</span>
        </div>
      </div>
      <button
        style={{
          background:   "rgba(255,255,255,0.08)",
          border:       "1px solid rgba(255,255,255,0.12)",
          borderRadius: "8px",
          padding:      "12px 32px",
          color:        "rgba(255,255,255,0.4)",
          fontSize:     "16px",
          cursor:       "default",
          fontFamily:   "sans-serif",
        }}
      >
        {steps.find((s) => s.type === "click")?.buttonLabel ?? "Submit"}
      </button>
    </div>
  );

  // "type" — typing into field
  const renderType = (step: BrowserStep) => {
    const typeStepFrame = frame - step.frame;
    const CHARS_PER_FRAME = 2;
    const charsTyped = Math.min(
      (step.fieldValue ?? "").length,
      Math.floor(typeStepFrame * CHARS_PER_FRAME)
    );
    const typedText = (step.fieldValue ?? "").slice(0, charsTyped);
    const cursorVisible = Math.floor(typeStepFrame / 15) % 2 === 0;

    return (
      <div
        style={{
          display:        "flex",
          flexDirection:  "column",
          alignItems:     "center",
          justifyContent: "center",
          height:         "100%",
          padding:        "40px",
          gap:            "20px",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "8px" }}>
          <div style={{ color: theme.text, fontSize: "24px", fontWeight: 700, marginBottom: "6px" }}>
            {step.fieldName ?? "Search"}
          </div>
        </div>
        <div style={{ width: "100%", maxWidth: "480px" }}>
          <div
            style={{
              ...inputStyle,
              border:    `1px solid ${theme.accent}`,
              boxShadow: `0 0 0 2px ${theme.accentSoft}`,
            }}
          >
            <span style={{ color: theme.text }}>{typedText}</span>
            {cursorVisible && (
              <span
                style={{
                  display:    "inline-block",
                  width:      "2px",
                  height:     "16px",
                  background: theme.accent,
                  marginLeft: "2px",
                  verticalAlign: "middle",
                }}
              />
            )}
          </div>
        </div>
        <button
          style={{
            background:   "rgba(255,255,255,0.08)",
            border:       "1px solid rgba(255,255,255,0.12)",
            borderRadius: "8px",
            padding:      "12px 32px",
            color:        "rgba(255,255,255,0.4)",
            fontSize:     "16px",
            cursor:       "default",
            fontFamily:   "sans-serif",
          }}
        >
          {step.buttonLabel ?? steps.find((s) => s.type === "click")?.buttonLabel ?? "Submit"}
        </button>
      </div>
    );
  };

  // "click" — button pulses + ripple + transitions to loading
  const renderClick = (step: BrowserStep) => {
    const clickFrame = frame - step.frame;
    const RIPPLE_DURATION = 20;
    const LOADING_START   = 15;

    const rippleScale  = easeOutCubic(clickFrame, 0, RIPPLE_DURATION, 0, 2.5);
    const rippleOpacity = interpolate(clickFrame, [0, RIPPLE_DURATION], [0.6, 0], {
      extrapolateRight: "clamp",
    });
    const btnGlow = interpolate(clickFrame, [0, 8, 15], [1, 0.6, 0.4], {
      extrapolateRight: "clamp",
    });

    const showSpinner = clickFrame > LOADING_START;
    const spinnerOp   = interpolate(clickFrame, [LOADING_START, LOADING_START + 10], [0, 1], {
      extrapolateRight: "clamp",
    });

    // Find the typed value
    const typeStep = steps.find((s) => s.type === "type");
    const typedText = typeStep?.fieldValue ?? "";

    if (showSpinner) {
      // Spinner / loading state
      const spinDeg = (clickFrame - LOADING_START) * 12; // 12 deg/frame = ~360/s
      return (
        <div
          style={{
            display:        "flex",
            flexDirection:  "column",
            alignItems:     "center",
            justifyContent: "center",
            height:         "100%",
            padding:        "40px",
            gap:            "24px",
            opacity:        spinnerOp,
          }}
        >
          <div
            style={{
              width:        "48px",
              height:       "48px",
              borderRadius: "50%",
              border:       `3px solid ${theme.border}`,
              borderTop:    `3px solid ${theme.accent}`,
              transform:    `rotate(${spinDeg}deg)`,
            }}
          />
          <div
            style={{
              color:     theme.textMuted,
              fontSize:  "16px",
              fontFamily: "sans-serif",
            }}
          >
            {step.label ?? "Processing…"}
          </div>
        </div>
      );
    }

    return (
      <div
        style={{
          display:        "flex",
          flexDirection:  "column",
          alignItems:     "center",
          justifyContent: "center",
          height:         "100%",
          padding:        "40px",
          gap:            "20px",
        }}
      >
        <div style={{ width: "100%", maxWidth: "480px" }}>
          <div style={inputStyle}>
            <span style={{ color: theme.text }}>{typedText}</span>
          </div>
        </div>

        <div style={{ position: "relative" }}>
          {/* Ripple */}
          <div
            style={{
              position:     "absolute",
              top:          "50%",
              left:         "50%",
              transform:    `translate(-50%, -50%) scale(${rippleScale})`,
              width:        "120px",
              height:       "44px",
              borderRadius: "8px",
              background:   theme.accent,
              opacity:      rippleOpacity,
            }}
          />
          <button
            style={{
              position:     "relative",
              background:   theme.accent,
              border:       "none",
              borderRadius: "8px",
              padding:      "12px 32px",
              color:        "#fff",
              fontSize:     "16px",
              fontWeight:   600,
              cursor:       "default",
              fontFamily:   "sans-serif",
              opacity:      btnGlow,
              boxShadow:    `0 0 24px ${theme.accent}88`,
            }}
          >
            {step.buttonLabel ?? "Submit"}
          </button>
        </div>
      </div>
    );
  };

  // "result" — rows appear one by one
  const renderResult = (step: BrowserStep) => {
    const resultFrame = frame - step.frame;
    const rows = (step.resultText ?? "").split("\n").filter(Boolean).slice(0, 6);
    const FRAMES_PER_ROW = 8;

    return (
      <div
        style={{
          display:       "flex",
          flexDirection: "column",
          height:        "100%",
          overflow:      "hidden",
        }}
      >
        {/* Results header */}
        <div
          style={{
            padding:      "16px 24px 12px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            display:      "flex",
            alignItems:   "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              color:     theme.accent,
              fontSize:  "13px",
              fontWeight: 600,
              fontFamily: "sans-serif",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            {rows.length} Results
          </div>
          <div
            style={{
              color:     theme.textMuted,
              fontSize:  "12px",
              fontFamily: "sans-serif",
            }}
          >
            {step.label ?? ""}
          </div>
        </div>

        {/* Result rows */}
        <div style={{ flex: 1, padding: "8px 0", overflow: "hidden" }}>
          {rows.map((row, i) => {
            const rowStartFrame = i * FRAMES_PER_ROW;
            const rowS    = spring(Math.max(0, resultFrame - rowStartFrame), 30, {
              damping: 20, stiffness: 150,
            });
            const rowOpacity = rowS;
            const rowX       = (1 - rowS) * 24;

            return (
              <div
                key={i}
                style={{
                  display:        "flex",
                  alignItems:     "center",
                  padding:        "10px 24px",
                  gap:            "12px",
                  opacity:        rowOpacity,
                  transform:      `translateX(${rowX}px)`,
                  borderBottom:   "1px solid rgba(255,255,255,0.04)",
                }}
              >
                <div
                  style={{
                    width:        "6px",
                    height:       "6px",
                    borderRadius: "50%",
                    background:   theme.accent,
                    flexShrink:   0,
                  }}
                />
                <span
                  style={{
                    color:     theme.text,
                    fontSize:  "15px",
                    fontFamily: "sans-serif",
                  }}
                >
                  {row}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Choose what to render
  if (!activeStep || activeStep.type === "load") return renderLoad();
  if (activeStep.type === "type") return renderType(activeStep);
  if (activeStep.type === "click") return renderClick(activeStep);
  if (activeStep.type === "result") return renderResult(activeStep);
  return renderLoad();
};

// ─── Main Component ──────────────────────────────────────────────────────────

/**
 * BrowserFlowScene — animates a user interacting with the app in a browser.
 * Steps trigger at specific frames, transitioning through load → type → click → result.
 */
export const BrowserFlowScene: React.FC<BrowserFlowSceneProps> = ({
  url,
  steps,
  headline,
  overlayText,
  theme,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Browser mockup entrance
  const browserS  = spring(frame, fps, { damping: 18, stiffness: 110 });
  const browserY  = (1 - browserS) * 50;
  const browserOp = browserS;

  // Headline entrance
  const headlineS  = spring(frame, fps, { damping: 20, stiffness: 120 });
  const headlineOp = headlineS;
  const headlineY  = (1 - headlineS) * 30;

  // Overlay text fades in near the end
  const overlayStartFrame = durationInFrames - 60;
  const overlayOp = interpolate(
    frame,
    [overlayStartFrame, overlayStartFrame + 20],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

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
          opacity: 0.6,
        }}
      />

      {/* Gradient glow */}
      <AbsoluteFill style={{ background: theme.gradient, opacity: 0.6 }} />

      {/* Content layout */}
      <AbsoluteFill
        style={{
          display:       "flex",
          flexDirection: "column",
          alignItems:    "center",
          padding:       "48px 80px",
          gap:           "32px",
        }}
      >
        {/* Headline */}
        {headline && (
          <div
            style={{
              opacity:   headlineOp,
              transform: `translateY(${headlineY}px)`,
              textAlign: "center",
            }}
          >
            <h2
              style={{
                fontSize:      "42px",
                fontWeight:    800,
                color:         theme.text,
                margin:        0,
                letterSpacing: "-0.02em",
              }}
            >
              {headline}
            </h2>
          </div>
        )}

        {/* Browser window */}
        <div
          style={{
            flex:      1,
            width:     "100%",
            opacity:   browserOp,
            transform: `translateY(${browserY}px)`,
            minHeight: 0,
            filter:    "drop-shadow(0 40px 80px rgba(0,0,0,0.5))",
          }}
        >
          <BrowserMockup url={url} width="100%" height="100%">
            <div
              style={{
                width:      "100%",
                height:     "100%",
                background: theme.bgSecondary,
              }}
            >
              <BrowserContent steps={steps} frame={frame} fps={fps} theme={theme} />
            </div>
          </BrowserMockup>
        </div>

        {/* Overlay text */}
        {overlayText && (
          <div
            style={{
              opacity:      overlayOp,
              textAlign:    "center",
              padding:      "12px 32px",
              background:   theme.accentSoft,
              border:       `1px solid ${theme.border}`,
              borderRadius: "10px",
            }}
          >
            <span
              style={{
                color:     theme.text,
                fontSize:  "22px",
                fontWeight: 600,
              }}
            >
              {overlayText}
            </span>
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
