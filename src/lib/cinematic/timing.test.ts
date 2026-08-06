import { describe, expect, it } from 'vitest';
import { MOTION_CSS_EASE, MOTION_DURATION_MS, MOTION_LIB_EASE } from '../motion';
import { primitiveProfile } from './timing';
import { isCinematicKind, isCountPrimitive } from './types';

describe('primitive timing', () => {
  it('guards cinematic kinds', () => {
    expect(isCinematicKind('deal')).toBe(true);
    expect(isCinematicKind('wiggle')).toBe(false);
    expect(isCinematicKind(null)).toBe(false);
    expect(isCountPrimitive({ kind: 'count', from: 0, to: 1 })).toBe(true);
    expect(isCountPrimitive({ kind: 'flip' })).toBe(false);
  });

  it('resolves reduced profiles with no animation', () => {
    const profile = primitiveProfile('roll', 'reduced');
    expect(profile.animate).toBe(false);
    expect(profile.durationMs).toBe(0);
    expect(profile.ease).toBe(MOTION_LIB_EASE.reduced);
    expect(profile.cssEase).toBe(MOTION_CSS_EASE.reduced);
  });

  it('reuses motion tokens for normal and playful weight', () => {
    const snap = primitiveProfile('snap', 'normal');
    const deal = primitiveProfile('deal', 'normal');
    const playfulFlip = primitiveProfile('flip', 'playful');

    expect(snap.animate).toBe(true);
    expect(snap.durationMs).toBe(Math.round(MOTION_DURATION_MS.normal * 0.5));
    expect(snap.ease).toBe(MOTION_LIB_EASE.normal);
    expect(snap.cssEase).toBe(MOTION_CSS_EASE.normal);
    expect(deal.durationMs).toBeGreaterThan(snap.durationMs);
    expect(playfulFlip.durationMs).toBeGreaterThan(primitiveProfile('flip', 'normal').durationMs);
    expect(playfulFlip.ease).toEqual(MOTION_LIB_EASE.playful);
  });
});
