import { describe, expect, it } from 'vitest';
import { makeCard } from '../shared/cards';
import { getGoFishActions } from './actions';
import type { GoFishState } from './game';

function baseG(partial: Partial<GoFishState> = {}): GoFishState {
  return {
    hands: [[makeCard('hearts', 'A'), makeCard('clubs', '2')], [makeCard('spades', '3')]],
    stock: [makeCard('diamonds', '4')],
    books: [0, 0],
    pendingFishRank: null,
    ...partial,
  };
}

describe('getGoFishActions', () => {
  it('exposes ask intents for unique held ranks with go-fish-action test ids', () => {
    const actions = getGoFishActions({ G: baseG(), player: 0, yourTurn: true });
    expect(actions.map((a) => a.id)).toEqual(['ask-A', 'ask-2']);
    expect(actions[0]).toMatchObject({
      kind: 'choose',
      label: 'Ask for Aces',
      testId: 'go-fish-action-ask-A',
      disabled: false,
    });
    expect(actions.some((a) => a.id === 'draw')).toBe(false);
  });

  it('disables asks while a fish is pending and offers Go fish draw', () => {
    const actions = getGoFishActions({
      G: baseG({ pendingFishRank: 'A' }),
      player: 0,
      yourTurn: true,
    });
    expect(actions.find((a) => a.id === 'ask-A')).toMatchObject({
      disabled: true,
      disabledReason: 'Go fish - draw from the stock',
    });
    expect(actions.find((a) => a.id === 'draw')).toMatchObject({
      kind: 'draw',
      label: 'Go fish',
      testId: 'go-fish-action-draw',
      disabled: false,
    });
  });

  it('offers draw when the hand is empty and stock remains', () => {
    const actions = getGoFishActions({
      G: baseG({ hands: [[], [makeCard('spades', '3')]] }),
      player: 0,
      yourTurn: true,
    });
    expect(actions).toEqual([
      expect.objectContaining({
        id: 'draw',
        label: 'Draw',
        testId: 'go-fish-action-draw',
        disabled: false,
      }),
    ]);
  });

  it('disables asks off-turn', () => {
    const [ask] = getGoFishActions({ G: baseG(), player: 0, yourTurn: false });
    expect(ask).toMatchObject({
      disabled: true,
      disabledReason: 'Wait for your turn',
    });
  });

  it('uses an empty hand when the player seat is missing', () => {
    expect(getGoFishActions({ G: baseG(), player: -1, yourTurn: true })).toEqual([]);
    const missing = getGoFishActions({
      G: baseG({ hands: [] as GoFishState['hands'] }),
      player: 0,
      yourTurn: true,
    });
    expect(missing).toHaveLength(1);
    expect(missing[0]).toMatchObject({ id: 'draw', testId: 'go-fish-action-draw' });
  });

  it('disables go-fish draw off-turn and when stock is empty', () => {
    const off = getGoFishActions({
      G: baseG({ pendingFishRank: 'A' }),
      player: 0,
      yourTurn: false,
    });
    expect(off.find((a) => a.id === 'draw')).toMatchObject({
      disabled: true,
      disabledReason: 'Wait for your turn',
    });

    const empty = getGoFishActions({
      G: baseG({ pendingFishRank: 'A', stock: [] }),
      player: 0,
      yourTurn: true,
    });
    expect(empty.find((a) => a.id === 'draw')).toMatchObject({
      disabled: true,
      disabledReason: 'Stock is empty',
    });
  });
});
