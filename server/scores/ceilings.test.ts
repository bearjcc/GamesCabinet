import { describe, expect, it } from 'vitest';
import { scoreCeilingFor, scoreWithinCeiling } from './ceilings.ts';

describe('score ceilings', () => {
  it('documents per-game ceilings', () => {
    expect(scoreCeilingFor('2048')).toBe(200_000);
    expect(scoreCeilingFor('yatzy')).toBe(2_000);
    expect(scoreCeilingFor('letter-walker')).toBe(5_000);
  });

  it('rejects scores above the ceiling', () => {
    expect(scoreWithinCeiling('2048', 200_000)).toBe(true);
    expect(scoreWithinCeiling('2048', 200_001)).toBe(false);
    expect(scoreWithinCeiling('yatzy', 2_001)).toBe(false);
    expect(scoreWithinCeiling('letter-walker', 5_001)).toBe(false);
  });

  it('uses the default ceiling for unknown leaderboard ids', () => {
    expect(scoreCeilingFor('future-solo')).toBe(1_000_000);
    expect(scoreWithinCeiling('future-solo', 1_000_000)).toBe(true);
  });
});
