import {
  type MotionIntensity,
  type MotionLibEase,
  motionCssEase,
  motionDurationMs,
  motionEase,
} from '../motion';
import type { CinematicKind } from './types';

/** Per-kind duration multipliers against the shared motion token. */
const KIND_DURATION_SCALE: Record<CinematicKind, number> = {
  lift: 1,
  drop: 1,
  snap: 0.5,
  deal: 1.2,
  flip: 1.4,
  fan: 1.2,
  stack: 1,
  roll: 1.6,
  count: 1,
};

export type PrimitiveMotionProfile = {
  kind: CinematicKind;
  intensity: MotionIntensity;
  durationMs: number;
  /** Motion library easing for React wrappers. */
  ease: MotionLibEase;
  /** CSS easing token string for stylesheet consumers. */
  cssEase: string;
  /** False when reduced: no transforms, resolve instantly. */
  animate: boolean;
};

/**
 * Timing profile for a named primitive at the given intensity.
 * Duration mirrors `--motion-duration`; ease mirrors `--motion-ease`.
 */
export function primitiveProfile(
  kind: CinematicKind,
  intensity: MotionIntensity,
): PrimitiveMotionProfile {
  const base = motionDurationMs(intensity);
  if (intensity === 'reduced' || base === 0) {
    return {
      kind,
      intensity,
      durationMs: 0,
      ease: motionEase('reduced'),
      cssEase: motionCssEase('reduced'),
      animate: false,
    };
  }
  return {
    kind,
    intensity,
    durationMs: Math.round(base * KIND_DURATION_SCALE[kind]),
    ease: motionEase(intensity),
    cssEase: motionCssEase(intensity),
    animate: true,
  };
}
