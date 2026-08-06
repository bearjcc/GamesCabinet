import { describe, expect, it } from 'vitest';
import {
  countDurationMs,
  countPrimitive,
  countSamples,
  displayCount,
  interpolateCount,
} from './count';

describe('count helpers', () => {
  it('interpolates and clamps progress', () => {
    expect(interpolateCount(0, 10, 0)).toBe(0);
    expect(interpolateCount(0, 10, 0.5)).toBe(5);
    expect(interpolateCount(0, 10, 1)).toBe(10);
    expect(interpolateCount(0, 10, -1)).toBe(0);
    expect(interpolateCount(0, 10, 2)).toBe(10);
    expect(displayCount(0, 10, 0.54)).toBe(5);
    expect(displayCount(0, 10, 0.56)).toBe(6);
  });

  it('builds count primitives', () => {
    expect(countPrimitive(1, 4)).toEqual({ kind: 'count', from: 1, to: 4 });
    expect(countPrimitive(1, 4, 'score')).toEqual({
      kind: 'count',
      from: 1,
      to: 4,
      id: 'score',
    });
  });

  it('uses reduced as an instant correctness path', () => {
    expect(countDurationMs(0, 100, 'reduced')).toBe(0);
    expect(countSamples(0, 100, 'reduced')).toEqual([100]);
    expect(countDurationMs(5, 5, 'normal')).toBe(0);
    expect(countSamples(5, 5, 'normal')).toEqual([5]);
    expect(countSamples(0, 10, 'normal', 0)).toEqual([10]);
  });

  it('scales duration with distance and intensity', () => {
    const normal = countDurationMs(0, 12, 'normal');
    const playful = countDurationMs(0, 12, 'playful');
    const short = countDurationMs(0, 1, 'normal');
    expect(normal).toBeGreaterThan(0);
    expect(playful).toBeGreaterThan(normal);
    expect(normal).toBeGreaterThan(short);
    expect(countSamples(0, 4, 'normal', 2)).toEqual([0, 2, 4]);
  });
});
