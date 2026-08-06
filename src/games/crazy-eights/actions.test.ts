import { describe, expect, it } from 'vitest';
import { makeCard } from '../shared/cards';
import { getCrazyEightsActions } from './actions';
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
