import { describe, expect, it } from 'vitest';
import { makeCard } from '../shared/cards';
import { canDrawCard, getCrazyEightsActions } from './actions';
import type { CrazyEightsState } from './game';

function baseG(partial: Partial<CrazyEightsState> = {}): CrazyEightsState {
  return {
    hands: [[makeCard('spades', '2')], [makeCard('clubs', '3')]],
    stock: [makeCard('diamonds', '4')],
    discard: [makeCard('hearts', '5')],
    currentSuit: 'hearts',
    drewThisTurn: false,
    ...partial,
  };
}

describe('canDrawCard', () => {
  it('allows draw when stock has cards', () => {
    expect(canDrawCard(baseG({ stock: [makeCard('clubs', '9')] }), 0)).toBe(true);
  });

  it('allows draw when discard can reshuffle', () => {
    expect(
      canDrawCard(
        baseG({
          stock: [],
          discard: [makeCard('hearts', '5'), makeCard('hearts', '6')],
        }),
        0,
      ),
    ).toBe(true);
  });

  it('blocks draw when stock is empty and discard cannot reshuffle', () => {
    expect(canDrawCard(baseG({ stock: [], discard: [makeCard('hearts', '5')] }), 0)).toBe(false);
  });
});

describe('getCrazyEightsActions', () => {
  it('exposes pass as a dismiss action with ce-pass test id', () => {
    const [pass] = getCrazyEightsActions({
      G: baseG({ drewThisTurn: true }),
      yourTurn: true,
    });
    expect(pass).toMatchObject({
      id: 'pass',
      kind: 'dismiss',
      label: 'Pass',
      testId: 'ce-pass',
      disabled: false,
    });
  });

  it('disables pass until the player has drawn this turn', () => {
    const [pass] = getCrazyEightsActions({ G: baseG({ drewThisTurn: false }), yourTurn: true });
    expect(pass).toMatchObject({
      disabled: true,
      disabledReason: 'Draw a card before you can pass',
    });
  });

  it('disables pass off-turn with a reason', () => {
    const [pass] = getCrazyEightsActions({ G: baseG({ drewThisTurn: true }), yourTurn: false });
    expect(pass).toMatchObject({
      disabled: true,
      disabledReason: 'Wait for your turn',
    });
  });
});
