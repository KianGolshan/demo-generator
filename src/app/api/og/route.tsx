import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const title = searchParams.get("title") ?? "Product Demo";
  const sub   = searchParams.get("sub")   ?? "";

  return new ImageResponse(
    (
      <div
        style={{
          width:           "100%",
          height:          "100%",
          display:         "flex",
          flexDirection:   "column",
          alignItems:      "center",
          justifyContent:  "center",
          background:      "#0a0a0f",
          fontFamily:      "sans-serif",
          padding:         "80px",
        }}
      >
        {/* Accent glow */}
        <div
          style={{
            position:     "absolute",
            top:          0,
            left:         "50%",
            transform:    "translateX(-50%)",
            width:        "600px",
            height:       "300px",
            background:   "radial-gradient(ellipse at center, rgba(99,102,241,0.25) 0%, transparent 70%)",
          }}
        />

        {/* Brand */}
        <div
          style={{
            display:      "flex",
            alignItems:   "center",
            gap:          "8px",
            marginBottom: "40px",
            fontSize:     "18px",
            color:        "#6b7280",
            letterSpacing: "0.05em",
          }}
        >
          <span style={{ color: "#e5e7eb", fontWeight: 700 }}>Demo</span>
          <span style={{ color: "#6366f1", fontWeight: 700 }}>Forge</span>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize:    "64px",
            fontWeight:  800,
            color:       "#f9fafb",
            textAlign:   "center",
            lineHeight:  1.1,
            maxWidth:    "900px",
            marginBottom: sub ? "24px" : "0",
          }}
        >
          {title}
        </div>

        {/* Subtitle */}
        {sub && (
          <div
            style={{
              fontSize:   "28px",
              color:      "#6b7280",
              textAlign:  "center",
              maxWidth:   "800px",
              lineHeight: 1.4,
            }}
          >
            {sub}
          </div>
        )}

        {/* Bottom badge */}
        <div
          style={{
            position:     "absolute",
            bottom:       "40px",
            display:      "flex",
            alignItems:   "center",
            gap:          "8px",
            padding:      "8px 16px",
            background:   "rgba(99,102,241,0.15)",
            border:       "1px solid rgba(99,102,241,0.3)",
            borderRadius: "999px",
            fontSize:     "14px",
            color:        "#a5b4fc",
          }}
        >
          <span
            style={{
              width:        "8px",
              height:       "8px",
              borderRadius: "50%",
              background:   "#6366f1",
            }}
          />
          Made with DemoForge · Powered by Claude AI
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
