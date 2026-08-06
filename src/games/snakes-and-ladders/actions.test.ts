import { describe, expect, it } from 'vitest';
import { getSnakesAndLaddersActions } from './actions';
import type { SnakesAndLaddersState } from './game';

const baseG: SnakesAndLaddersState = { positions: [0, 0], lastRoll: null };

describe('getSnakesAndLaddersActions', () => {
  it('offers Roll on your turn', () => {
    const actions = getSnakesAndLaddersActions({ G: baseG, yourTurn: true });
    expect(actions).toEqual([
      expect.objectContaining({
        id: 'roll',
        kind: 'roll',
        label: 'Roll',
        variant: 'primary',
        disabled: false,
        testId: 'sal-action-roll',
      }),
    ]);
  });

  it('disables Roll off-turn', () => {
    const actions = getSnakesAndLaddersActions({ G: baseG, yourTurn: false });
    expect(actions[0]).toMatchObject({
      id: 'roll',
      disabled: true,
      disabledReason: 'Wait for your turn',
      testId: 'sal-action-roll',
    });
  });
});
