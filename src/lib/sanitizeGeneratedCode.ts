/**
 * Fixes common Claude code-generation mistakes in Remotion TSX files
 * that cause Remotion's esbuild-loader to fail at bundle time,
 * or produce incorrect visual output.
 *
 * Pipeline (ORDER MATTERS):
 *   1. stripMarkdownFences    — must be first; fences contain backticks that
 *                               would be mangled by step 2
 *   2. sanitizeTemplateLiterals — convert ALL `...` to string concatenation
 *   3. fixDoubleQuotedInterpolations — "text ${x}" → 'text ' + x (visual bug)
 *   4. fixUnescapedApostrophes  — 'it's' → "it's" (compile error)
 *   5. sanitizeUnquotedUnits    — prop: 16px → prop: '16px' (compile error)
 */

// ─── Step 1 ───────────────────────────────────────────────────────────────────

/**
 * Strips markdown code fences if Claude wrapped the output in them.
 *
 * MUST run before sanitizeTemplateLiterals. The three backticks in ```
 * would be processed as an empty template literal (`` `` → '') followed by
 * a large template literal containing the entire file, producing
 * ''"tsx\n...code..."'' — invalid JavaScript.
 */
function stripMarkdownFences(code: string): string {
  const match = code.match(/```(?:tsx?|typescript|javascript|js)?\n?([\s\S]*?)```/i);
  // When fences found, trim the extracted content (removes surrounding newlines).
  // When no fences, return as-is — trimming would strip meaningful indentation
  // from individual lines if the sanitizer is called on a code snippet.
  return match ? match[1].trim() : code;
}

// ─── Step 2 ───────────────────────────────────────────────────────────────────

/**
 * Converts ALL template literals to string concatenation.
 * Remotion's esbuild-loader cannot parse backtick template literals,
 * including those in ternary expressions inside style objects.
 *
 * `2px solid ${ACCENT}`       →  "2px solid " + ACCENT
 * `translateY(${(1-s)*40}px)` →  "translateY(" + (1-s)*40 + "px)"
 * `rotate(${deg}deg)`         →  "rotate(" + deg + "deg)"
 */
function sanitizeTemplateLiterals(code: string): string {
  return code.replace(
    /`([^`]*)`/g,
    (_match, content: string) => {
      const parts: string[] = [];
      const interp = /\$\{([^}]+)\}/g;
      let lastIndex = 0;
      let m: RegExpExecArray | null;

      while ((m = interp.exec(content)) !== null) {
        const lit = content.slice(lastIndex, m.index);
        if (lit) parts.push(JSON.stringify(lit));
        parts.push(m[1]);
        lastIndex = m.index + m[0].length;
      }
      const remaining = content.slice(lastIndex);
      if (remaining) parts.push(JSON.stringify(remaining));

      if (parts.length === 0) return "''";
      if (parts.length === 1) return parts[0];
      return parts.join(' + ');
    }
  );
}

// ─── Step 3 ───────────────────────────────────────────────────────────────────

/**
 * Fixes double-quoted strings that contain ${...} interpolation patterns.
 * Claude sometimes writes "text ${EXPR}" (double quotes) instead of
 * `text ${EXPR}` (backticks). Double-quoted ${} is NOT interpolated in JS
 * — it renders as the literal characters "${EXPR}", producing wrong CSS values.
 *
 * "1px solid ${BORDER}"    →  "1px solid " + BORDER
 * "${progWidth}%"          →  progWidth + "%"
 *
 * Only matches single-line double-quoted strings containing ${...}.
 * Strings without ${} are left alone (they're correct as-is).
 */
function fixDoubleQuotedInterpolations(code: string): string {
  return code.replace(
    /"([^"\n]*\$\{[^}]+\}[^"\n]*)"/g,
    (_match, content: string) => {
      const parts: string[] = [];
      const interp = /\$\{([^}]+)\}/g;
      let lastIndex = 0;
      let m: RegExpExecArray | null;

      while ((m = interp.exec(content)) !== null) {
        const lit = content.slice(lastIndex, m.index);
        if (lit) parts.push(JSON.stringify(lit));
        parts.push(m[1]);
        lastIndex = m.index + m[0].length;
      }
      const remaining = content.slice(lastIndex);
      if (remaining) parts.push(JSON.stringify(remaining));

      if (parts.length === 0) return "''";
      if (parts.length === 1) return parts[0];
      return parts.join(' + ');
    }
  );
}

// ─── Step 4 ───────────────────────────────────────────────────────────────────

/**
 * Fixes unescaped apostrophes in single-quoted string literals.
 * An apostrophe inside a single-quoted string terminates it early,
 * leaving the rest as unexpected tokens — compile error.
 *
 * const TITLE = 'Acme's SaaS'  →  const TITLE = "Acme's SaaS"
 * value: 'it's done',          →  value: "it's done",
 *
 * Strategy: lines with exactly 3 single quotes have exactly one unescaped
 * apostrophe. Convert the string value to double-quoted (greedy match
 * captures from first to last quote on the line, spanning the apostrophe).
 *
 * Handles both const declarations (= '...') and object properties (: '...').
 */
function fixUnescapedApostrophes(code: string): string {
  return code
    .split('\n')
    .map((line) => {
      if (line.split("'").length - 1 !== 3) return line;

      return line.replace(
        /^(\s*(?:(?:const|let|var)\s+\w+|\w+)\s*[=:]\s*)'(.*)'([,;]?\s*)$/,
        (_m, pre, content, end) =>
          `${pre}"${content.replace(/"/g, '\\"')}"${end}`,
      );
    })
    .join('\n');
}

// ─── Step 5 ───────────────────────────────────────────────────────────────────

/**
 * Fixes bare CSS unit values that are not wrapped in quotes.
 * esbuild sees `padding: 16` then the unexpected token `px`.
 *
 * padding: 16px  →  padding: '16px'
 * fontSize: 24px →  fontSize: '24px'
 */
function sanitizeUnquotedUnits(code: string): string {
  // NOTE: \b does not work after `%` because % is a non-word character.
  // Use (?=[^a-zA-Z0-9]|$) instead — matches any non-alphanumeric char or end of string.
  // This correctly handles all units including % (width: 100% → width: '100%').
  return code.replace(
    /(\w+):\s*(-?[\d.]+)(px|rem|em|vh|vw|%|pt|pc|ch|ex|vmin|vmax|fr|deg|rad|turn|s|ms)(?=[^a-zA-Z0-9]|$)(?!\s*['"`])/g,
    (_match, key, num, unit) => `${key}: '${num}${unit}'`
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export function sanitizeGeneratedCode(code: string): string {
  const s1 = stripMarkdownFences(code);
  const s2 = sanitizeTemplateLiterals(s1);
  const s3 = fixDoubleQuotedInterpolations(s2);
  const s4 = fixUnescapedApostrophes(s3);
  const s5 = sanitizeUnquotedUnits(s4);
  return s5;
}
