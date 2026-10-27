import { describe, expect, it } from 'vitest';
import { usesLidPlaceholder } from './gameLidArt';

describe('gameLidArt', () => {
  it('flags games waiting on box-lid art', () => {
    expect(usesLidPlaceholder('hogwarts-battle')).toBe(true);
    expect(usesLidPlaceholder('connect-four')).toBe(false);
  });
});
