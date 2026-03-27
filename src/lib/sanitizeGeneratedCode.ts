/**
 * Fixes common Claude code-generation mistakes in Remotion TSX files.
 *
 * Two classes of errors:
 *
 * 1. Unquoted CSS unit values:
 *    ✓ padding: '16px'
 *    ✗ padding: 16px   ← esbuild sees "16" then unexpected token "px"
 *
 * 2. Template literals in style objects:
 *    ✓ transform: 'translateY(' + val + 'px)'
 *    ✗ transform: `translateY(${val}px)`  ← Remotion's esbuild-loader fails on these
 */

/**
 * Converts template literals used as CSS property values to string concatenation.
 * Remotion's bundler (esbuild-loader) cannot parse template literals in style objects.
 *
 * e.g.:  borderBottom: `1px solid ${BORDER}`
 * →      borderBottom: '1px solid ' + BORDER
 *
 * e.g.:  transform: `translateY(${(1-s)*40}px)`
 * →      transform: 'translateY(' + ((1-s)*40) + 'px)'
 */
function sanitizeTemplateLiterals(code: string): string {
  return code.replace(
    /(\w+):\s*`([^`]*)`/g,
    (_match, prop: string, content: string) => {
      const parts: string[] = [];
      const interpolationRegex = /\$\{([^}]+)\}/g;
      let lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = interpolationRegex.exec(content)) !== null) {
        const literal = content.slice(lastIndex, match.index);
        if (literal) parts.push(`'${literal}'`);
        parts.push(match[1]);
        lastIndex = match.index + match[0].length;
      }
      const remaining = content.slice(lastIndex);
      if (remaining) parts.push(`'${remaining}'`);

      if (parts.length === 0) return `${prop}: ''`;
      return `${prop}: ${parts.join(' + ')}`;
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
  // Order matters: fix template literals first (they may contain unit values),
  // then fix any remaining bare unit values.
  return sanitizeUnquotedUnits(sanitizeTemplateLiterals(code));
}
