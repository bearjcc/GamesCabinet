import { describe, expect, it } from 'vitest';
import { getTicTacToeActions } from './actions';
import type { TTTState } from './game';

function baseG(cells?: (string | null)[]): TTTState {
  return { cells: cells ?? Array(9).fill(null) };
}

describe('getTicTacToeActions', () => {
  it('lists enabled Mark square intents for every empty cell on turn', () => {
    const G = baseG(['0', null, null, null, '1', null, null, null, null]);
    const actions = getTicTacToeActions({ G, yourTurn: true });
    expect(actions.map((a) => a.id)).toEqual([
      'click-cell-1',
      'click-cell-2',
      'click-cell-3',
      'click-cell-5',
      'click-cell-6',
      'click-cell-7',
      'click-cell-8',
    ]);
    expect(actions[0]).toMatchObject({
      kind: 'move',
      label: 'Mark square 2',
      disabled: false,
      testId: 'ttt-action-cell-1',
      variant: 'primary',
    });
  });

  it('disables empty-cell intents off-turn with a reason', () => {
    const G = baseG([null, '0', null, null, null, null, null, null, null]);
    const actions = getTicTacToeActions({ G, yourTurn: false });
    expect(actions).toHaveLength(8);
    for (const action of actions) {
      expect(action.disabled).toBe(true);
      expect(action.disabledReason).toBe('Wait for your turn');
    }
  });

  it('omits occupied cells', () => {
    const G = baseG(['0', '1', '0', '1', '0', '1', '0', '1', '0']);
    const actions = getTicTacToeActions({ G, yourTurn: true });
    expect(actions).toEqual([]);
  });
});
