/**
 * Fixes common Claude code-generation mistakes in Remotion TSX files
 * that cause Remotion's esbuild-loader to fail at bundle time.
 *
 * Two classes of errors:
 *
 * 1. Template literals anywhere in the file:
 *    Remotion's esbuild-loader cannot parse template literals — not even inside
 *    ternary expressions in style objects.
 *    ✓ tab === active ? '2px solid ' + ACCENT : '2px solid transparent'
 *    ✗ tab === active ? `2px solid ${ACCENT}` : '2px solid transparent'
 *
 * 2. Unquoted CSS unit values:
 *    ✓ padding: '16px'
 *    ✗ padding: 16px   ← esbuild sees "16" then unexpected token "px"
 */

/**
 * Converts ALL template literals in the file to string concatenation.
 * Handles template literals in any position — direct property values,
 * ternary branches, function arguments, variable declarations, etc.
 *
 * e.g.:  `2px solid ${ACCENT}`          →  "2px solid " + ACCENT
 * e.g.:  `translateY(${(1-s)*40}px)`    →  "translateY(" + (1-s)*40 + "px)"
 * e.g.:  `rotate(${deg}deg)`            →  "rotate(" + deg + "deg)"
 */
function sanitizeTemplateLiterals(code: string): string {
  // Match any template literal (non-nested — generated Remotion code never nests them)
  return code.replace(
    /`([^`]*)`/g,
    (_match, content: string) => {
      const parts: string[] = [];
      const interp = /\$\{([^}]+)\}/g;
      let lastIndex = 0;
      let m: RegExpExecArray | null;

      while ((m = interp.exec(content)) !== null) {
        const lit = content.slice(lastIndex, m.index);
        if (lit) parts.push(JSON.stringify(lit)); // handles single-quote escaping
        parts.push(m[1]);                         // raw expression e.g. `(1-s)*40`
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
  // Order matters: fix template literals first (they may also contain bare unit values),
  // then fix any remaining unquoted unit values.
  return sanitizeUnquotedUnits(sanitizeTemplateLiterals(code));
}
