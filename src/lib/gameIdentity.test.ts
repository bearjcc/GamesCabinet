import { describe, expect, it } from 'vitest';
import {
  gameAccentStyle,
  gameAccentVar,
  gameIdentityToken,
  usesLaunchSeatColours,
} from './gameIdentity';
import { GAMES } from './games';

describe('game identity', () => {
  it('covers every catalogue game', () => {
    for (const game of GAMES) {
      expect(gameIdentityToken(game.id)).toMatch(/^(red|blue|green|yellow|umber|navy)$/);
    }
  });

  it('hides launch seat colours for fixed-piece games', () => {
    expect(usesLaunchSeatColours('chess')).toBe(false);
    expect(usesLaunchSeatColours('connect-four')).toBe(true);
  });

  it('exposes accent css helpers', () => {
    expect(gameAccentVar('chess')).toBe('var(--game-umber)');
    expect(gameAccentStyle('chess')).toEqual({ '--game-accent': 'var(--game-umber)' });
    expect(gameIdentityToken('unknown-game')).toBe('blue');
  });
});
