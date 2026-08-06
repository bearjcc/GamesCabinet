import { describe, expect, it } from 'vitest';
import { formatDieLabel } from './label';
import { asDieFaceValue, isDieFaceValue } from './types';

describe('die labels and face guards', () => {
  it('formats held and free faces', () => {
    expect(formatDieLabel(4)).toBe('4');
    expect(formatDieLabel(4, true)).toBe('4, held');
  });

  it('narrows integer faces 1-6', () => {
    expect(isDieFaceValue(1)).toBe(true);
    expect(isDieFaceValue(6)).toBe(true);
    expect(isDieFaceValue(0)).toBe(false);
    expect(isDieFaceValue(7)).toBe(false);
    expect(isDieFaceValue(1.5)).toBe(false);
  });

  it('coerces out-of-range values to 1', () => {
    expect(asDieFaceValue(5)).toBe(5);
    expect(asDieFaceValue(0)).toBe(1);
    expect(asDieFaceValue(99)).toBe(1);
  });
});
