import { describe, expect, it } from 'vitest';
import { shouldBotAct } from './botSeat';

describe('shouldBotAct', () => {
  it('plays when the seat is active and the room is full', () => {
    expect(
      shouldBotAct({
        isActive: true,
        playerID: '1',
        ctx: { currentPlayer: '1' },
        matchData: [
          { id: 0, name: 'Bear' },
          { id: 1, name: 'Bot' },
          { id: 2, name: 'Guest' },
        ],
      }),
    ).toBe(true);
  });

  it('waits while an online room still has an open chair', () => {
    expect(
      shouldBotAct({
        isActive: true,
        playerID: '0',
        ctx: { currentPlayer: '0' },
        matchData: [
          { id: 0, name: 'Bot' },
          { id: 1, name: 'Bear' },
          { id: 2, name: '' },
        ],
      }),
    ).toBe(false);
  });

  it('plays without matchData (offline / local transports)', () => {
    expect(
      shouldBotAct({
        isActive: true,
        playerID: '1',
        ctx: { currentPlayer: '1' },
      }),
    ).toBe(true);
  });

  it('stays quiet off-turn, when inactive, or after game over', () => {
    const base = {
      isActive: true,
      playerID: '1',
      ctx: { currentPlayer: '1' },
    };
    expect(shouldBotAct({ ...base, isActive: false })).toBe(false);
    expect(shouldBotAct({ ...base, playerID: '0' })).toBe(false);
    expect(shouldBotAct({ ...base, ctx: { currentPlayer: '0' } })).toBe(false);
    expect(shouldBotAct({ ...base, ctx: { currentPlayer: '1', gameover: { winner: '0' } } })).toBe(
      false,
    );
    expect(shouldBotAct({ ...base, playerID: null })).toBe(false);
  });
});
