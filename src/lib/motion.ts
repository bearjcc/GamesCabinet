export const MOTION_INTENSITIES = ['reduced', 'normal', 'playful'] as const;

export type MotionIntensity = (typeof MOTION_INTENSITIES)[number];

export const MOTION_KEY = 'gamescabinet.motion';
export const DEFAULT_MOTION: MotionIntensity = 'normal';

export function isMotionIntensity(value: string | null | undefined): value is MotionIntensity {
  return !!value && (MOTION_INTENSITIES as readonly string[]).includes(value);
}

export function getMotion(): MotionIntensity {
  try {
    const raw = localStorage.getItem(MOTION_KEY);
    return isMotionIntensity(raw) ? raw : DEFAULT_MOTION;
  } catch {
    return DEFAULT_MOTION;
  }
}

export function nextMotion(current: MotionIntensity): MotionIntensity {
  const i = MOTION_INTENSITIES.indexOf(current);
  return MOTION_INTENSITIES[(i + 1) % MOTION_INTENSITIES.length]!;
}

/** System reduced-motion preference always wins for accessibility. */
export function effectiveMotionIntensity(
  preferred: MotionIntensity,
  prefersReducedMotion: boolean,
): MotionIntensity {
  if (prefersReducedMotion) return 'reduced';
  return preferred;
}

export function applyMotion(intensity: MotionIntensity): void {
  document.documentElement.dataset.motion = intensity;
}

export function setMotion(intensity: MotionIntensity): void {
  try {
    localStorage.setItem(MOTION_KEY, intensity);
  } catch {
    /* private mode / quota — still apply in-session */
  }
  applyEffectiveMotion(intensity);
}

export function cycleMotion(current: MotionIntensity = getMotion()): MotionIntensity {
  const next = nextMotion(current);
  setMotion(next);
  return next;
}

export function motionLabel(intensity: MotionIntensity): string {
  return intensity.charAt(0).toUpperCase() + intensity.slice(1);
}

export function readPrefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function applyEffectiveMotion(preferred: MotionIntensity = getMotion()): MotionIntensity {
  const effective = effectiveMotionIntensity(preferred, readPrefersReducedMotion());
  applyMotion(effective);
  return effective;
}
