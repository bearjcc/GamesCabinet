// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  applyEffectiveMotion,
  applyMotion,
  cycleMotion,
  DEFAULT_MOTION,
  effectiveMotionIntensity,
  getMotion,
  isMotionIntensity,
  MOTION_KEY,
  motionLabel,
  nextMotion,
  setMotion,
} from './motion';

const store = new Map<string, string>();

afterEach(() => {
  store.clear();
  vi.unstubAllGlobals();
  delete document.documentElement.dataset.motion;
});

function stubMotionDom() {
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  });
}

describe('motion preferences', () => {
  it('validates motion intensities', () => {
    expect(isMotionIntensity('normal')).toBe(true);
    expect(isMotionIntensity('playful')).toBe(true);
    expect(isMotionIntensity('chaos')).toBe(false);
    expect(isMotionIntensity(null)).toBe(false);
  });

  it('forces reduced motion when the system prefers it', () => {
    expect(effectiveMotionIntensity('playful', true)).toBe('reduced');
    expect(effectiveMotionIntensity('normal', false)).toBe('normal');
    expect(effectiveMotionIntensity('reduced', false)).toBe('reduced');
  });

  it('reads, applies, and cycles motion preferences', () => {
    stubMotionDom();
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: false })),
    );
    expect(getMotion()).toBe(DEFAULT_MOTION);
    store.set(MOTION_KEY, 'playful');
    expect(getMotion()).toBe('playful');
    expect(nextMotion('playful')).toBe('reduced');
    applyMotion('normal');
    expect(document.documentElement.dataset.motion).toBe('normal');
    expect(setMotion('reduced')).toBeUndefined();
    expect(document.documentElement.dataset.motion).toBe('reduced');
    expect(cycleMotion('reduced')).toBe('normal');
    expect(motionLabel('playful')).toBe('Playful');
  });

  it('applies reduced motion when the system preference is set', () => {
    stubMotionDom();
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
      })),
    );
    expect(setMotion('playful')).toBeUndefined();
    expect(document.documentElement.dataset.motion).toBe('reduced');
  });

  it('falls back when storage is unavailable', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    });
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: false })),
    );
    expect(getMotion()).toBe(DEFAULT_MOTION);
    applyMotion('playful');
    expect(document.documentElement.dataset.motion).toBe('playful');
    expect(setMotion('playful')).toBeUndefined();
  });

  it('treats missing matchMedia as no system preference', () => {
    stubMotionDom();
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: undefined,
    });
    expect(setMotion('normal')).toBeUndefined();
    expect(document.documentElement.dataset.motion).toBe('normal');
  });

  it('applies stored preference through applyEffectiveMotion defaults', () => {
    stubMotionDom();
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: false })),
    );
    store.set(MOTION_KEY, 'playful');
    expect(applyEffectiveMotion()).toBe('playful');
    expect(document.documentElement.dataset.motion).toBe('playful');
    expect(cycleMotion()).toBe('reduced');
  });
});
