/**
 * Fixes the most common Claude code-generation mistake: unquoted CSS unit values.
 *
 * In TypeScript style objects, CSS values with units must be strings:
 *   ✓ padding: '16px'
 *   ✗ padding: 16px   ← syntax error: esbuild sees "16" then unexpected "px"
 *
 * This sanitizer converts bare unit values to quoted strings so the generated
 * code compiles even if Claude forgets the quotes.
 */
export function sanitizeGeneratedCode(code: string): string {
  return code.replace(
    /(\w+):\s*(-?[\d.]+)(px|rem|em|vh|vw|%|pt|pc|ch|ex|vmin|vmax|fr|deg|rad|turn|s|ms)\b(?!\s*['"`])/g,
    (_match, key, num, unit) => `${key}: '${num}${unit}'`
  );
}
