import { describe, expect, it } from 'vitest';
import { deriveMatchStatus } from './matchStatus';
import { withHotseatStatusOptions } from './useMatchStatus';

describe('withHotseatStatusOptions', () => {
  it('leaves options unchanged outside hot-seat', () => {
    expect(withHotseatStatusOptions(false, { isYourTurn: true })).toEqual({
      isYourTurn: true,
      seatLabel: undefined,
    });
  });

  it('adds named seats in pass-and-play', () => {
    const options = withHotseatStatusOptions(true, { isYourTurn: true });
    expect(deriveMatchStatus({ currentPlayer: '1' }, '1', options)).toEqual({
      text: "Player 2's turn",
      tone: 'you',
    });
  });

  it('reads seat nicknames from matchData', () => {
    const options = withHotseatStatusOptions(true, undefined, [
      { id: 0, name: 'Alice' },
      { id: 1, name: 'Bob' },
    ]);
    expect(deriveMatchStatus({ currentPlayer: '0' }, '0', options)).toEqual({
      text: "Alice's turn",
      tone: 'you',
    });
  });
});
