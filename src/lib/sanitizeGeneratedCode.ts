/**
 * Fixes common Claude code-generation mistakes in Remotion TSX files
 * that cause Remotion's esbuild-loader to fail at bundle time.
 *
 * Applied in this order:
 *   1. Strip markdown fences (must happen first — fences contain backticks that
 *      would be corrupted by the template-literal sanitizer)
 *   2. Convert template literals to string concatenation
 *   3. Fix unquoted CSS unit values
 */

/**
 * Strips markdown code fences if Claude wrapped the code in them.
 * Must run BEFORE sanitizeTemplateLiterals — backticks in ``` fences would
 * otherwise be converted to empty string literals, corrupting the entire file.
 *
 *   ```tsx          →  (removed)
 *   import React…      import React…
 *   ```             →  (removed)
 */
function stripMarkdownFences(code: string): string {
  const match = code.match(/```(?:tsx?|typescript|javascript|js)?\n?([\s\S]*?)```/i);
  return match ? match[1].trim() : code.trim();
}

/**
 * Converts ALL template literals in the file to string concatenation.
 * Remotion's bundler (esbuild-loader) cannot parse template literals,
 * including those in ternary expressions inside style objects.
 *
 * e.g.:  `2px solid ${ACCENT}`          →  "2px solid " + ACCENT
 * e.g.:  `translateY(${(1-s)*40}px)`    →  "translateY(" + (1-s)*40 + "px)"
 * e.g.:  `rotate(${deg}deg)`            →  "rotate(" + deg + "deg)"
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

/**
 * Fixes unquoted CSS unit values.
 *
 * e.g.:  padding: 16px   →   padding: '16px'
 */
function sanitizeUnquotedUnits(code: string): string {
  return code.replace(
    /(\w+):\s*(-?[\d.]+)(px|rem|em|vh|vw|%|pt|pc|ch|ex|vmin|vmax|fr|deg|rad|turn|s|ms)\b(?!\s*['"`])/g,
    (_match, key, num, unit) => `${key}: '${num}${unit}'`
  );
}

export function sanitizeGeneratedCode(code: string): string {
  // Step 1: strip fences FIRST — backticks in ``` would corrupt subsequent steps
  const stripped = stripMarkdownFences(code);
  // Step 2: convert template literals to string concatenation
  const noTemplateLiterals = sanitizeTemplateLiterals(stripped);
  // Step 3: fix any remaining bare CSS unit values
  return sanitizeUnquotedUnits(noTemplateLiterals);
}
