import { describe, it, expect } from "vitest";
import { sanitizeGeneratedCode } from "../../lib/sanitizeGeneratedCode";

// ─── Step 1: stripMarkdownFences ──────────────────────────────────────────────

describe("stripMarkdownFences", () => {
  it("strips ```tsx fences", () => {
    const input = "```tsx\nimport React from 'react';\n```";
    expect(sanitizeGeneratedCode(input)).toBe("import React from 'react';");
  });

  it("strips ```ts fences", () => {
    const input = "```ts\nconst x = 1;\n```";
    expect(sanitizeGeneratedCode(input)).toBe("const x = 1;");
  });

  it("strips ``` fences with no language tag", () => {
    const input = "```\nconst x = 1;\n```";
    expect(sanitizeGeneratedCode(input)).toBe("const x = 1;");
  });

  it("leaves code without fences unchanged", () => {
    const input = "import React from 'react';";
    expect(sanitizeGeneratedCode(input)).toBe("import React from 'react';");
  });

  // Regression: before this fix, fences were processed AFTER template literal
  // sanitizer, so ``` → '' + "tsx\n...code..." + '' → ''"tsx\n..."'' (invalid JS)
  it("REGRESSION: fences stripped before template literal step (the '\"tsx\\n...\"'' bug)", () => {
    const input = "```tsx\nconst BG = '#0a0a0f';\n```";
    const result = sanitizeGeneratedCode(input);
    expect(result).not.toContain("''");
    expect(result).not.toContain('"tsx');
    expect(result).toBe("const BG = '#0a0a0f';");
  });
});

// ─── Step 2: sanitizeTemplateLiterals ─────────────────────────────────────────

describe("sanitizeTemplateLiterals", () => {
  it("converts template literal directly after property colon", () => {
    const input = "borderBottom: `1px solid ${BORDER}`,";
    const result = sanitizeGeneratedCode(input);
    expect(result).not.toContain("`");
    expect(result).toContain('"1px solid "');
    expect(result).toContain("BORDER");
    expect(result).toContain("+");
  });

  // Regression: first sanitizer only caught `prop: `...`` not ternary positions
  it("REGRESSION: converts template literal in ternary expression", () => {
    const input =
      "borderBottom: tab === active ? `2px solid ${ACCENT}` : '2px solid transparent',";
    const result = sanitizeGeneratedCode(input);
    expect(result).not.toContain("`");
    expect(result).toContain("ACCENT");
    expect(result).not.toContain("${ACCENT}");
  });

  it("converts template literal with no interpolation to plain string", () => {
    const input = "border: `2px solid transparent`,";
    const result = sanitizeGeneratedCode(input);
    expect(result).not.toContain("`");
    expect(result).toContain('"2px solid transparent"');
  });

  it("converts template literal with multiple interpolations", () => {
    const input = "background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`,";
    const result = sanitizeGeneratedCode(input);
    expect(result).not.toContain("`");
    expect(result).toContain("ACCENT");
    expect(result).toContain("ACCENT2");
    expect(result).toContain('"linear-gradient(135deg, "');
  });

  it("converts transform template literal", () => {
    const input = "transform: `translateY(${(1 - s) * 40}px)`,";
    const result = sanitizeGeneratedCode(input);
    expect(result).not.toContain("`");
    expect(result).toContain('"translateY("');
    expect(result).toContain("(1 - s) * 40");
    expect(result).toContain('"px)"');
  });

  it("converts rotate template literal", () => {
    const input = "transform: `rotate(${spinDeg}deg)`,";
    const result = sanitizeGeneratedCode(input);
    expect(result).not.toContain("`");
    expect(result).toBe(`transform: "rotate(" + spinDeg + "deg)",`);
  });

  it("converts empty template literal to empty string", () => {
    const input = "value: ``,";
    const result = sanitizeGeneratedCode(input);
    expect(result).toBe("value: '',");
  });

  it("handles template literal that is just a variable reference", () => {
    const input = "color: `${ACCENT}`,";
    const result = sanitizeGeneratedCode(input);
    expect(result).not.toContain("`");
    expect(result).toContain("ACCENT");
  });
});

// ─── Step 3: fixDoubleQuotedInterpolations ────────────────────────────────────

describe("fixDoubleQuotedInterpolations", () => {
  it("converts double-quoted string with ${} to concatenation", () => {
    // Claude sometimes writes "text ${VAR}" (double quotes) instead of template literals
    // This is a visual bug — the ${VAR} renders as literal text, not the variable value
    const input = 'border: "1px solid ${BORDER}",';
    const result = sanitizeGeneratedCode(input);
    expect(result).not.toContain("${BORDER}");
    expect(result).toContain("BORDER");
    expect(result).toContain("+");
  });

  it("converts percentage width double-quoted interpolation", () => {
    const input = 'width: "${progWidth}%",';
    const result = sanitizeGeneratedCode(input);
    expect(result).not.toContain("${progWidth}");
    expect(result).toContain("progWidth");
  });

  it("leaves normal double-quoted strings alone", () => {
    const input = "color: \"#6366f1\",";
    expect(sanitizeGeneratedCode(input)).toBe("color: \"#6366f1\",");
  });

  it("leaves double-quoted strings without ${} alone", () => {
    const input = "fontFamily: \"system-ui, sans-serif\",";
    expect(sanitizeGeneratedCode(input)).toBe("fontFamily: \"system-ui, sans-serif\",");
  });
});

// ─── Step 4: fixUnescapedApostrophes ──────────────────────────────────────────

describe("fixUnescapedApostrophes", () => {
  it("fixes apostrophe in const declaration", () => {
    // The apostrophe in "Acme's" terminates the string, leaving 's SaaS' as tokens
    // Note: in actual generated code there's no backslash — Claude writes it unescaped
    const badInput = "const TITLE_QUERY = 'Launchpad — Acme's SaaS Onboarding';";
    const result = sanitizeGeneratedCode(badInput);
    expect(result).toContain('"Launchpad — Acme');
    expect(result).toContain("Acme's SaaS Onboarding");
    expect(result).not.toMatch(/^const TITLE_QUERY = '/m);
  });

  it("fixes apostrophe in let declaration", () => {
    const input = "let msg = 'it's working';";
    const result = sanitizeGeneratedCode(input);
    expect(result).toContain('"it\'s working"');
  });

  it("fixes apostrophe in object property value", () => {
    const input = "  value: 'Acme's Product',";
    const result = sanitizeGeneratedCode(input);
    // Should use double quotes so apostrophe is safe
    expect(result).toContain('"Acme');
    expect(result).not.toMatch(/: 'Acme's/);
  });

  it("leaves strings with 2 quotes (no apostrophe) unchanged", () => {
    const input = "const ACCENT = '#6366f1';";
    expect(sanitizeGeneratedCode(input)).toBe("const ACCENT = '#6366f1';");
  });

  it("leaves strings with 4 quotes (two normal strings) unchanged", () => {
    const input = "  borderRadius: '50%', background: '#fff',";
    expect(sanitizeGeneratedCode(input)).toBe("  borderRadius: '50%', background: '#fff',");
  });
});

// ─── Step 5: sanitizeUnquotedUnits ────────────────────────────────────────────

describe("sanitizeUnquotedUnits", () => {
  it("quotes bare px values", () => {
    expect(sanitizeGeneratedCode("padding: 16px,")).toBe("padding: '16px',");
  });

  it("quotes bare rem values", () => {
    expect(sanitizeGeneratedCode("fontSize: 1.5rem,")).toBe("fontSize: '1.5rem',");
  });

  it("quotes bare % values", () => {
    expect(sanitizeGeneratedCode("width: 100%,")).toBe("width: '100%',");
  });

  it("leaves already-quoted px alone", () => {
    expect(sanitizeGeneratedCode("padding: '16px',")).toBe("padding: '16px',");
  });

  it("leaves unitless numbers alone", () => {
    expect(sanitizeGeneratedCode("opacity: 0.8,")).toBe("opacity: 0.8,");
    expect(sanitizeGeneratedCode("zIndex: 1,")).toBe("zIndex: 1,");
    expect(sanitizeGeneratedCode("flex: 1,")).toBe("flex: 1,");
  });

  it("leaves px inside string concatenation alone", () => {
    // After template literal fix, we get: 'rotate(' + deg + 'deg)'
    // The 'deg)' here shouldn't be re-processed
    const input = "transform: 'rotate(' + deg + 'deg)',";
    expect(sanitizeGeneratedCode(input)).toBe(input);
  });
});

// ─── Full pipeline integration tests ──────────────────────────────────────────

describe("full pipeline — real-world generated code", () => {
  it("handles code with multiple simultaneous errors", () => {
    const input = [
      "```tsx",
      "import React from 'react';",
      "const ACCENT = '#6366f1';",
      "const BORDER = 'rgba(99,102,241,0.2)';",
      "const TITLE = 'Acme's SaaS';",          // apostrophe error
      "const style = {",
      "  borderBottom: `1px solid ${BORDER}`,", // template literal
      "  padding: 16px,",                       // bare unit
      "  color: \"${ACCENT}\",",                // double-quoted interpolation
      "};",
      "```",
    ].join("\n");

    const result = sanitizeGeneratedCode(input);

    // Fences stripped
    expect(result).not.toMatch(/^```/m);
    // No backtick template literals
    expect(result).not.toContain("`");
    // Apostrophe fixed — title uses double quotes
    expect(result).toContain('"Acme');
    // Template literal converted to concatenation
    expect(result).toContain("BORDER");
    expect(result).not.toContain("${BORDER}");
    // Bare unit fixed
    expect(result).toContain("'16px'");
    // Double-quoted interpolation fixed
    expect(result).not.toContain('"${ACCENT}"');
    expect(result).toContain("ACCENT");
  });

  it("clean well-formed generated code passes through unchanged", () => {
    const input = [
      "import React from 'react';",
      "import { AbsoluteFill, spring } from 'remotion';",
      "const BG = '#0a0a0f';",
      "const ACCENT = '#6366f1';",
      "const BORDER = 'rgba(99,102,241,0.2)';",
      "export const GENERATED_FPS = 30;",
      "export const GENERATED_DURATION = 300;",
      "export const GENERATED_WIDTH = 1920;",
      "export const GENERATED_HEIGHT = 1080;",
      "export const GeneratedDemo: React.FC<{ screenshotUrls: string[] }> = () => {",
      "  const frame = 0;",
      "  const s = spring({ frame, fps: 30, config: { damping: 14, stiffness: 120 } });",
      "  return (",
      "    <AbsoluteFill style={{ background: BG }}>",
      "      <div style={{",
      "        opacity: s,",
      "        transform: 'translateY(' + ((1 - s) * 40) + 'px)',",
      "        borderBottom: '1px solid ' + BORDER,",
      "        padding: '16px',",
      "        fontSize: '24px',",
      "      }}>",
      "        Hello",
      "      </div>",
      "    </AbsoluteFill>",
      "  );",
      "};",
    ].join("\n");

    const result = sanitizeGeneratedCode(input);
    // All correct patterns should pass through unchanged
    expect(result).toContain("'translateY(' + ((1 - s) * 40) + 'px)'");
    expect(result).toContain("'1px solid ' + BORDER");
    expect(result).toContain("padding: '16px'");
    expect(result).toContain("fontSize: '24px'");
    expect(result).not.toContain("`");
  });

  it("handles the exact ternary template literal that broke production", () => {
    // This exact pattern caused: ERROR: Syntax error "p" at col 46
    const input =
      "borderBottom: tab === activeTab ? `2px solid ${ACCENT}` : '2px solid transparent',";
    const result = sanitizeGeneratedCode(input);
    expect(result).not.toContain("`");
    expect(result).toContain("ACCENT");
    expect(result).toContain("'2px solid transparent'");
  });

  it("handles the exact apostrophe that broke production", () => {
    // This exact pattern caused: ERROR: Expected ";" but found "s" at col 42
    const input = "  const TITLE_QUERY = 'Launchpad — Acme's SaaS Onboarding';";
    const result = sanitizeGeneratedCode(input);
    expect(result).not.toMatch(/= 'Launchpad/);
    expect(result).toContain("Acme's SaaS Onboarding");
  });

  it("handles the exact markdown fence corruption that broke production", () => {
    // Without stripMarkdownFences running FIRST, ``` becomes ''"tsx\n..."''
    const input = "```tsx\nconst x = '#fff';\nexport const GeneratedDemo = () => null;\n```";
    const result = sanitizeGeneratedCode(input);
    expect(result).not.toContain("''");
    expect(result).not.toContain('"tsx');
    expect(result).toContain("const x = '#fff'");
  });
});
