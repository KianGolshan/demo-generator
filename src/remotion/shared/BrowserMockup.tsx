import type { ReactNode } from "react";

interface BrowserMockupProps {
  url:           string;
  children:      ReactNode;
  width?:        number | string;
  height?:       number | string;
  borderRadius?: number;
  statusText?:   string;
}

/**
 * Generic macOS-style browser window chrome.
 * Wraps children in a styled browser frame with traffic lights + URL bar.
 */
export const BrowserMockup: React.FC<BrowserMockupProps> = ({
  url,
  children,
  width         = "100%",
  height        = "100%",
  borderRadius  = 12,
  statusText,
}) => {
  const truncatedUrl = url.length > 60 ? url.slice(0, 57) + "…" : url;

  return (
    <div
      style={{
        width,
        height,
        display:       "flex",
        flexDirection: "column",
        borderRadius:  `${borderRadius}px`,
        overflow:      "hidden",
        border:        "1px solid rgba(255,255,255,0.12)",
        boxShadow:     "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
        background:    "#1a1a2e",
      }}
    >
      {/* Chrome bar */}
      <div
        style={{
          background:     "#2d2d3e",
          borderBottom:   "1px solid rgba(255,255,255,0.08)",
          padding:        "10px 14px",
          display:        "flex",
          alignItems:     "center",
          gap:            "10px",
          flexShrink:     0,
          height:         "44px",
        }}
      >
        {/* Traffic lights */}
        <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
          {(["#ff5f57", "#febc2e", "#28c840"] as const).map((color, i) => (
            <div
              key={i}
              style={{
                width:        "12px",
                height:       "12px",
                borderRadius: "50%",
                background:   color,
                opacity:      0.92,
              }}
            />
          ))}
        </div>

        {/* Navigation arrows */}
        <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
          {["‹", "›"].map((arrow, i) => (
            <div
              key={i}
              style={{
                width:        "24px",
                height:       "24px",
                display:      "flex",
                alignItems:   "center",
                justifyContent: "center",
                color:        "rgba(255,255,255,0.3)",
                fontSize:     "16px",
                cursor:       "default",
              }}
            >
              {arrow}
            </div>
          ))}
        </div>

        {/* URL bar */}
        <div
          style={{
            flex:          1,
            background:    "rgba(0,0,0,0.3)",
            border:        "1px solid rgba(255,255,255,0.1)",
            borderRadius:  "6px",
            height:        "26px",
            display:       "flex",
            alignItems:    "center",
            paddingLeft:   "10px",
            paddingRight:  "10px",
            gap:           "6px",
          }}
        >
          {/* Lock icon */}
          <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "10px" }}>🔒</span>
          <span
            style={{
              color:        "rgba(255,255,255,0.55)",
              fontSize:     "12px",
              fontFamily:   "sans-serif",
              whiteSpace:   "nowrap",
              overflow:     "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {truncatedUrl}
          </span>
        </div>

        {/* Action icons */}
        <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
          {["⊞", "⋮"].map((icon, i) => (
            <div
              key={i}
              style={{
                width:        "24px",
                height:       "24px",
                display:      "flex",
                alignItems:   "center",
                justifyContent: "center",
                color:        "rgba(255,255,255,0.25)",
                fontSize:     "14px",
              }}
            >
              {icon}
            </div>
          ))}
        </div>
      </div>

      {/* Content area */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        {children}
      </div>

      {/* Optional status bar */}
      {statusText && (
        <div
          style={{
            background:  "#1e1e2e",
            borderTop:   "1px solid rgba(255,255,255,0.06)",
            height:      "22px",
            display:     "flex",
            alignItems:  "center",
            paddingLeft: "12px",
            flexShrink:  0,
          }}
        >
          <span
            style={{
              color:      "rgba(255,255,255,0.35)",
              fontSize:   "11px",
              fontFamily: "sans-serif",
            }}
          >
            {statusText}
          </span>
        </div>
      )}
    </div>
  );
};
