import { describe, expect, it, vi } from 'vitest';
import { hintFromLegacyYourTurn, playerDisplayName, turnStatusText } from './matchPlayers';
import * as storage from './storage';

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

  it('falls back to named seats when lobby metadata is missing', () => {
    vi.spyOn(storage, 'getNickname').mockReturnValue('Bear');
    expect(playerDisplayName('0')).toBe('Bear');
    expect(playerDisplayName('1')).toBe('Orange');
    expect(playerDisplayName('alpha')).toBe('Seat alpha');
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
      'X: tap a square',
    );
  });

  it('extracts hints from legacy your-turn labels', () => {
    expect(hintFromLegacyYourTurn('   ')).toBeUndefined();
    expect(hintFromLegacyYourTurn('Your turn — tap a column')).toBe('tap a column');
    expect(hintFromLegacyYourTurn('Your turn - roll the die')).toBe('roll the die');
    expect(hintFromLegacyYourTurn('Your turn roll the die')).toBe('roll the die');
    expect(hintFromLegacyYourTurn('Your turn')).toBeUndefined();
    expect(hintFromLegacyYourTurn('Choose a suit')).toBe('Choose a suit');
  });
});
