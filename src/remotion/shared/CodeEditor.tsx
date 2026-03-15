import { useCurrentFrame, useVideoConfig } from "remotion";
import type { CodeLine } from "@/types";

// ─── VS Code Dark+ color tokens ───────────────────────────────────────────────
const VSCODE = {
  background:  "#1e1e1e",
  sidebar:     "#252526",
  border:      "#3e3e42",
  text:        "#cccccc",
  keywordBlue: "#569cd6",
  stringOrange:"#ce9178",
  commentGreen:"#6a9955",
  typeTeal:    "#4ec9b0",
  numberGold:  "#b5cea8",
  lineNumber:  "#858585",
  titleBar:    "#323233",
  statusBar:   "#007acc",
} as const;

// ─── Tokenizer ─────────────────────────────────────────────────────────────────

interface Token { text: string; color: string }

function tokenize(line: string): Token[] {
  if (!line.trim()) return [{ text: line, color: VSCODE.text }];

  const tokens: Token[] = [];
  let remaining = line;

  // Strip leading indent — we'll re-add as a plain token
  const indentMatch = remaining.match(/^(\s+)/);
  if (indentMatch) {
    tokens.push({ text: indentMatch[1], color: VSCODE.text });
    remaining = remaining.slice(indentMatch[1].length);
  }

  // Comments (must be first — consumes rest of line)
  const commentMatch = remaining.match(/^(\/\/.*|#.*)$/);
  if (commentMatch) {
    tokens.push({ text: remaining, color: VSCODE.commentGreen });
    return tokens;
  }

  // Process token by token with regex alternation
  const TOKEN_RE = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d+(\.\d+)?\b)|(\b(?:import|export|from|const|let|var|function|async|await|return|if|else|for|while|do|class|extends|new|typeof|instanceof|throw|try|catch|finally|switch|case|default|break|continue|in|of|type|interface|enum|namespace|declare|abstract|readonly|static|public|private|protected|override|implements|void|never|null|undefined|true|false|this|super)\b)|([A-Z][A-Za-z0-9_]*)|([a-zA-Z_$][a-zA-Z0-9_$]*)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = TOKEN_RE.exec(remaining)) !== null) {
    // Any gap before this match is plain text
    if (match.index > lastIndex) {
      tokens.push({ text: remaining.slice(lastIndex, match.index), color: VSCODE.text });
    }

    const [full, strGroup, numGroup, , kwGroup, typeGroup] = match;

    if (strGroup !== undefined) {
      tokens.push({ text: full, color: VSCODE.stringOrange });
    } else if (numGroup !== undefined) {
      tokens.push({ text: full, color: VSCODE.numberGold });
    } else if (kwGroup !== undefined) {
      tokens.push({ text: full, color: VSCODE.keywordBlue });
    } else if (typeGroup !== undefined) {
      tokens.push({ text: full, color: VSCODE.typeTeal });
    } else {
      tokens.push({ text: full, color: VSCODE.text });
    }

    lastIndex = match.index + full.length;
  }

  if (lastIndex < remaining.length) {
    tokens.push({ text: remaining.slice(lastIndex), color: VSCODE.text });
  }

  return tokens;
}

// ─── Props ──────────────────────────────────────────────────────────────────

export interface CodeEditorProps {
  filename:          string;
  lines:             CodeLine[];
  highlightLines?:   number[];   // 1-indexed
  errorLines?:       number[];   // 1-indexed
  animateTyping?:    boolean;
  typingStartFrame?: number;     // global frame when typing begins
}

const CHARS_PER_FRAME = 3;

// ─── Component ──────────────────────────────────────────────────────────────

export const CodeEditor: React.FC<CodeEditorProps> = ({
  filename,
  lines,
  highlightLines = [],
  errorLines     = [],
  animateTyping  = false,
  typingStartFrame = 0,
}) => {
  const frame    = useCurrentFrame();
  const { fps }  = useVideoConfig();

  // How many total chars have been "typed" by now
  const allText      = lines.map((l) => (l.indent ? " ".repeat(l.indent * 2) : "") + l.content).join("\n");
  const framesTyping = frame - typingStartFrame;
  const charsShown   = animateTyping
    ? Math.max(0, framesTyping * CHARS_PER_FRAME)
    : Infinity;

  // Blink cursor — toggle every 15 frames
  const cursorVisible = Math.floor(frame / 15) % 2 === 0;

  // Figure out which line the cursor is on (for highlight)
  let cursorLine = -1;
  if (animateTyping && charsShown < allText.length) {
    let counted = 0;
    for (let i = 0; i < lines.length; i++) {
      const lineLen = ((lines[i].indent ?? 0) * 2) + lines[i].content.length + 1; // +1 for \n
      if (counted + lineLen > charsShown) {
        cursorLine = i;
        break;
      }
      counted += lineLen;
    }
  }

  // Resolve visible content per line
  const renderedLines: { tokens: Token[]; partial: boolean; charsInLine: number }[] = [];
  let remainingChars = charsShown;

  for (const line of lines) {
    const indent    = line.indent ? " ".repeat(line.indent * 2) : "";
    const fullLine  = indent + line.content;
    const lineLen   = fullLine.length + 1; // +1 for newline

    if (!animateTyping || remainingChars >= lineLen) {
      renderedLines.push({ tokens: tokenize(fullLine), partial: false, charsInLine: fullLine.length });
      remainingChars -= lineLen;
    } else if (remainingChars > 0) {
      const partial = fullLine.slice(0, remainingChars);
      renderedLines.push({ tokens: tokenize(partial), partial: true, charsInLine: remainingChars });
      remainingChars = 0;
    } else {
      // Line not yet reached — push empty placeholder so line numbers align
      renderedLines.push({ tokens: [], partial: false, charsInLine: 0 });
    }
  }

  void fps;

  return (
    <div
      style={{
        fontFamily:   "'Cascadia Code', 'Fira Code', 'Consolas', 'Monaco', monospace",
        fontSize:     "14px",
        lineHeight:   "22px",
        background:   VSCODE.background,
        borderRadius: "8px",
        overflow:     "hidden",
        border:       `1px solid ${VSCODE.border}`,
        display:      "flex",
        flexDirection: "column",
        height:       "100%",
      }}
    >
      {/* Title bar */}
      <div
        style={{
          background:   VSCODE.titleBar,
          borderBottom: `1px solid ${VSCODE.border}`,
          padding:      "0 12px",
          display:      "flex",
          alignItems:   "center",
          height:       "36px",
          flexShrink:   0,
        }}
      >
        {/* Tab */}
        <div
          style={{
            display:        "flex",
            alignItems:     "center",
            gap:            "8px",
            padding:        "0 16px",
            height:         "100%",
            borderTop:      `2px solid ${VSCODE.statusBar}`,
            background:     VSCODE.background,
            color:          VSCODE.text,
            fontSize:       "13px",
            borderRight:    `1px solid ${VSCODE.border}`,
          }}
        >
          <span>{filename}</span>
          <span
            style={{
              background:   VSCODE.statusBar,
              color:        "#fff",
              fontSize:     "10px",
              padding:      "1px 5px",
              borderRadius: "3px",
              fontWeight:   700,
              letterSpacing: "0.05em",
            }}
          >
            TS
          </span>
        </div>
      </div>

      {/* Code area */}
      <div
        style={{
          flex:       1,
          overflow:   "hidden",
          display:    "flex",
          background: VSCODE.background,
        }}
      >
        {/* Line numbers */}
        <div
          style={{
            width:         "48px",
            flexShrink:    0,
            background:    VSCODE.background,
            borderRight:   `1px solid ${VSCODE.border}`,
            paddingTop:    "12px",
            paddingBottom: "12px",
          }}
        >
          {lines.map((_, i) => {
            const isError   = errorLines.includes(i + 1);
            const isCursor  = cursorLine === i;

            return (
              <div
                key={i}
                style={{
                  height:      "22px",
                  display:     "flex",
                  alignItems:  "center",
                  justifyContent: "flex-end",
                  paddingRight: "8px",
                  position:    "relative",
                }}
              >
                {isError && (
                  <div
                    style={{
                      position:     "absolute",
                      left:         "6px",
                      width:        "6px",
                      height:       "6px",
                      borderRadius: "50%",
                      background:   "#f44747",
                    }}
                  />
                )}
                <span
                  style={{
                    color:    isCursor ? VSCODE.text : VSCODE.lineNumber,
                    fontSize: "12px",
                  }}
                >
                  {i + 1}
                </span>
              </div>
            );
          })}
        </div>

        {/* Code lines */}
        <div
          style={{
            flex:          1,
            paddingTop:    "12px",
            paddingBottom: "12px",
            paddingLeft:   "16px",
            overflow:      "hidden",
          }}
        >
          {lines.map((_, i) => {
            const isHighlight = highlightLines.includes(i + 1);
            const isError     = errorLines.includes(i + 1);
            const isCursor    = cursorLine === i;
            const rendered    = renderedLines[i];

            return (
              <div
                key={i}
                style={{
                  height:     "22px",
                  display:    "flex",
                  alignItems: "center",
                  position:   "relative",
                  background: isHighlight
                    ? "rgba(255,255,255,0.04)"
                    : isError
                    ? "rgba(244,71,71,0.06)"
                    : "transparent",
                  marginLeft: "-16px",
                  paddingLeft: "16px",
                }}
              >
                {/* Error underline */}
                {isError && (
                  <div
                    style={{
                      position:   "absolute",
                      bottom:     "1px",
                      left:       "16px",
                      right:      "16px",
                      height:     "2px",
                      background: "repeating-linear-gradient(90deg, #f44747 0, #f44747 4px, transparent 4px, transparent 8px)",
                    }}
                  />
                )}

                {/* Tokens */}
                <span>
                  {rendered?.tokens.map((tok, ti) => (
                    <span key={ti} style={{ color: tok.color, whiteSpace: "pre" }}>
                      {tok.text}
                    </span>
                  ))}
                  {/* Blinking cursor on the active typing line */}
                  {isCursor && cursorVisible && (
                    <span
                      style={{
                        display:    "inline-block",
                        width:      "2px",
                        height:     "14px",
                        background: VSCODE.text,
                        verticalAlign: "middle",
                        marginLeft: "1px",
                      }}
                    />
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Status bar */}
      <div
        style={{
          background:  VSCODE.statusBar,
          height:      "22px",
          display:     "flex",
          alignItems:  "center",
          paddingLeft: "12px",
          gap:         "16px",
          flexShrink:  0,
        }}
      >
        <span style={{ color: "#fff", fontSize: "11px", opacity: 0.9 }}>TypeScript</span>
        <span style={{ color: "#fff", fontSize: "11px", opacity: 0.7 }}>UTF-8</span>
        <span style={{ color: "#fff", fontSize: "11px", opacity: 0.7 }}>
          Ln {Math.max(1, cursorLine + 1)}, Col 1
        </span>
      </div>
    </div>
  );
};
