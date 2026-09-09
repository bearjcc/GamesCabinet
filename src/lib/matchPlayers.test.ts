import { describe, expect, it } from 'vitest';
import { hintFromLegacyYourTurn, playerDisplayName, turnStatusText } from './matchPlayers';

describe('matchPlayers', () => {
  it('uses lobby names when present', () => {
    expect(
      playerDisplayName('1', {
        matchData: [
          { id: 0, name: 'Bear' },
          { id: 1, name: 'Pat' },
        ],
      }),
    ).toBe('Pat');
  });

  it('falls back to Player N', () => {
    expect(playerDisplayName('0')).toBe('Player 1');
    expect(playerDisplayName('alpha')).toBe('Player alpha');
  });

  it('prefers nameForPlayer over lobby', () => {
    expect(
      playerDisplayName('0', {
        matchData: [{ id: 0, name: 'Bear' }],
        nameForPlayer: () => 'White',
      }),
    ).toBe('White');
  });

  it('builds named turn lines with optional hints', () => {
    expect(turnStatusText('0', { nameForPlayer: () => 'X' })).toBe("X's turn");
    expect(turnStatusText('0', { nameForPlayer: () => 'X' }, 'tap a square')).toBe(
      "X's turn — tap a square",
    );
  });

  it('extracts hints from legacy your-turn labels', () => {
    expect(hintFromLegacyYourTurn('Your turn — tap a column')).toBe('tap a column');
    expect(hintFromLegacyYourTurn('Your turn - roll the die')).toBe('roll the die');
    expect(hintFromLegacyYourTurn('Your turn roll the die')).toBe('roll the die');
    expect(hintFromLegacyYourTurn('Your turn')).toBeUndefined();
    expect(hintFromLegacyYourTurn('Choose a suit')).toBe('Choose a suit');
  });
});
