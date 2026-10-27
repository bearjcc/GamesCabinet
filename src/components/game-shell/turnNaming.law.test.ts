import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deriveMatchStatus } from '../../lib/matchStatus';
import * as storage from '../../lib/storage';
import { namedTurnStatusLine, turnPlateFromMatchStatus, turnPlateHeadline } from './turnPlate';

const FORBIDDEN = /your turn/i;
const FORBIDDEN_POSSESSIVE_YOU = /you's turn/i;

function assertNamedTurnCopy(text: string): void {
  expect(text).not.toMatch(FORBIDDEN);
  expect(text).not.toMatch(FORBIDDEN_POSSESSIVE_YOU);
}

describe('turn naming house law', () => {
  beforeEach(() => {
    vi.spyOn(storage, 'getNickname').mockReturnValue('');
  });

  it('namedTurnStatusLine never uses “Your turn”', () => {
    const lines = [
      namedTurnStatusLine('You'),
      namedTurnStatusLine('You', 'drop a disc'),
      namedTurnStatusLine('Bear'),
      namedTurnStatusLine('Bear', 'draw from the deck'),
      namedTurnStatusLine('Bot', 'roll the dice'),
    ];
    for (const line of lines) {
      assertNamedTurnCopy(line);
    }
    expect(namedTurnStatusLine('You')).toBe('You');
    expect(namedTurnStatusLine('You', 'drop a disc')).toBe('You: drop a disc');
    expect(namedTurnStatusLine('Bear', 'draw')).toBe('Bear: draw');
    expect(namedTurnStatusLine('Orange')).toBe("Orange's turn");
  });

  it('turn plates and deriveMatchStatus stay off “Your turn”', () => {
    const statusSamples = [
      deriveMatchStatus({ currentPlayer: '0' }, '0').text,
      deriveMatchStatus({ currentPlayer: '0' }, '0', { turnHint: 'tap a square' }).text,
      deriveMatchStatus({ currentPlayer: '1' }, '0').text,
      deriveMatchStatus({ currentPlayer: '0' }, '0', {
        labels: { yourTurn: 'Your turn — roll the die' },
      }).text,
    ];
    for (const text of statusSamples) {
      assertNamedTurnCopy(text);
    }

    const plates = [
      turnPlateFromMatchStatus({ text: 'You: drop a disc', tone: 'you' }, 'You', {
        hint: 'drop a disc',
      }),
      turnPlateFromMatchStatus({ text: "Bear's turn", tone: 'wait' }, 'Bear'),
      turnPlateFromMatchStatus({ text: 'Bot wins', tone: 'done' }, 'Bot'),
    ];
    for (const plate of plates) {
      expect(plate).not.toBeNull();
      assertNamedTurnCopy(plate!.headline);
      if (plate!.hint) assertNamedTurnCopy(plate!.hint);
    }

    assertNamedTurnCopy(turnPlateHeadline('You'));
    assertNamedTurnCopy(turnPlateHeadline('Bear'));
  });
});
