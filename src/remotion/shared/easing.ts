import { interpolate, spring as remotionSpring } from "remotion";

/**
 * Ease out cubic interpolation — smooth deceleration curve.
 */
export function easeOutCubic(
  frame: number,
  start: number,
  end: number,
  fromVal: number,
  toVal: number
): number {
  return interpolate(frame, [start, end], [fromVal, toVal], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });
}

/**
 * Spring animation wrapper with sensible defaults for product demo motion.
 * Uses damping=14, stiffness=120, mass=1 by default.
 */
export function spring(
  frame: number,
  fps: number,
  config?: { damping?: number; stiffness?: number; mass?: number }
): number {
  return remotionSpring({
    frame,
    fps,
    config: {
      damping:   config?.damping   ?? 14,
      stiffness: config?.stiffness ?? 120,
      mass:      config?.mass      ?? 1,
    },
  });
}
