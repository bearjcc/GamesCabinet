import { describe, expect, it } from 'vitest';
import { GAMES, getGameMeta, supportsBotPlay, supportsLocalPlay } from './games';

describe('games catalogue', () => {
  it('finds metadata by id', () => {
    expect(getGameMeta('2048')?.name).toBe('2048');
    expect(getGameMeta('missing')).toBeUndefined();
  });

  it('detects local and bot support flags', () => {
    const solo = getGameMeta('2048')!;
    const local = getGameMeta('tic-tac-toe')!;
    expect(supportsLocalPlay(solo)).toBe(true);
    expect(supportsBotPlay(solo)).toBe(false);
    expect(supportsLocalPlay(local)).toBe(true);
    expect(supportsBotPlay(local)).toBe(true);
    expect(GAMES.length).toBeGreaterThan(0);
  });
});
