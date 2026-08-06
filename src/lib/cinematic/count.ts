import { type MotionIntensity, motionDurationMs } from '../motion';
import type { CountPrimitive } from './types';

/** Linear interpolation; `t` clamped to [0, 1]. */
export function interpolateCount(from: number, to: number, t: number): number {
  const clamped = t <= 0 ? 0 : t >= 1 ? 1 : t;
  return from + (to - from) * clamped;
}

/** Rounded display value for a counter tick. */
export function displayCount(from: number, to: number, t: number): number {
  return Math.round(interpolateCount(from, to, t));
}

/**
 * Duration for a count from A to B.
 * Reduced (or zero base token) is always 0 -- snap to final.
 * Distance scales duration lightly; playful inherits the longer token.
 */
export function countDurationMs(from: number, to: number, intensity: MotionIntensity): number {
  const base = motionDurationMs(intensity);
  if (base === 0 || from === to) return 0;
  const distance = Math.abs(to - from);
  const stretch = 1 + Math.min(distance, 24) / 12;
  return Math.round(base * stretch);
}

/** Build a count primitive descriptor (client-only; never written to G). */
export function countPrimitive(from: number, to: number, id?: string): CountPrimitive {
  return id === undefined ? { kind: 'count', from, to } : { kind: 'count', from, to, id };
}

/**
 * Samples along the count for tests / reduced-path verification.
 * Reduced intensity yields only the final value.
 */
export function countSamples(
  from: number,
  to: number,
  intensity: MotionIntensity,
  steps = 4,
): number[] {
  if (intensity === 'reduced' || from === to || steps <= 0) {
    return [to];
  }
  const out: number[] = [];
  for (let i = 0; i <= steps; i += 1) {
    out.push(displayCount(from, to, i / steps));
  }
  return out;
}
