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

/**
 * Duration in ms matching CSS `--motion-duration` tokens in `tokens.css`.
 * Reduced is always 0 (correctness path: no visible motion).
 */
export const MOTION_DURATION_MS: Record<MotionIntensity, number> = {
  reduced: 0,
  normal: 140,
  playful: 220,
};

/** CSS `--motion-ease` token values (stylesheets only). */
export const MOTION_CSS_EASE: Record<MotionIntensity, string> = {
  reduced: 'linear',
  normal: 'ease-out',
  playful: 'cubic-bezier(0.34, 1.4, 0.64, 1)',
};

/** Motion library easing: named curve or cubic-bezier tuple. */
export type MotionLibEase = 'linear' | 'easeOut' | readonly [number, number, number, number];

export const MOTION_LIB_EASE: Record<MotionIntensity, MotionLibEase> = {
  reduced: 'linear',
  normal: 'easeOut',
  playful: [0.34, 1.4, 0.64, 1],
};

export function motionDurationMs(intensity: MotionIntensity): number {
  return MOTION_DURATION_MS[intensity];
}

export function motionCssEase(intensity: MotionIntensity): string {
  return MOTION_CSS_EASE[intensity];
}

export function motionEase(intensity: MotionIntensity): MotionLibEase {
  return MOTION_LIB_EASE[intensity];
}

/** Read effective intensity for cinematic consumers (storage + system preference). */
export function readEffectiveMotion(): MotionIntensity {
  return effectiveMotionIntensity(getMotion(), readPrefersReducedMotion());
}
