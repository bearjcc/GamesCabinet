import { describe, expect, it } from 'vitest';
import { getConnectFourActions } from './actions';
import { type C4State, COLS, ROWS } from './game';

function emptyG(): C4State {
  return { cells: Array(ROWS * COLS).fill(null) };
}

function fillColumn(G: C4State, col: number, player = '0') {
  for (let row = 0; row < ROWS; row++) {
    G.cells[row * COLS + col] = player;
  }
}

describe('getConnectFourActions', () => {
  it('lists one Drop intent per column with stable test ids', () => {
    const actions = getConnectFourActions({ G: emptyG(), yourTurn: true });
    expect(actions.map((a) => a.id)).toEqual([
      'drop-0',
      'drop-1',
      'drop-2',
      'drop-3',
      'drop-4',
      'drop-5',
      'drop-6',
    ]);
    expect(actions[0]).toMatchObject({
      kind: 'move',
      label: 'Drop column 1',
      disabled: false,
      testId: 'c4-action-col-0',
      variant: 'primary',
    });
  });

  it('disables all columns off-turn with a reason', () => {
    const actions = getConnectFourActions({ G: emptyG(), yourTurn: false });
    expect(actions).toHaveLength(COLS);
    for (const action of actions) {
      expect(action.disabled).toBe(true);
      expect(action.disabledReason).toBe('Wait for your turn');
    }
  });

  it('disables a full column on turn', () => {
    const G = emptyG();
    fillColumn(G, 3);
    const actions = getConnectFourActions({ G, yourTurn: true });
    expect(actions.find((a) => a.id === 'drop-3')).toMatchObject({
      disabled: true,
      disabledReason: 'Column full',
    });
    expect(actions.find((a) => a.id === 'drop-0')).toMatchObject({ disabled: false });
  });
});
