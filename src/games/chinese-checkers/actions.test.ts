import { describe, expect, it } from 'vitest';
import { getChineseCheckersActions } from './actions';
import { type ChineseCheckersState, HOLE_COUNT, holeIndex, type Peg } from './game';

function emptyBoard(): (Peg | null)[] {
  return Array(HOLE_COUNT).fill(null);
}

function setupG(partial: Partial<ChineseCheckersState> = {}): ChineseCheckersState {
  return {
    board: emptyBoard(),
    mustContinueFrom: null,
    ...partial,
  };
}

describe('getChineseCheckersActions', () => {
  it('lists Move to intents for legal destinations of the selected peg', () => {
    const board = emptyBoard();
    const from = holeIndex(-4, 5)!;
    board[from] = '0';
    const G = setupG({ board });
    const actions = getChineseCheckersActions({
      G,
      player: '0',
      yourTurn: true,
      selected: from,
    });
    expect(actions.length).toBeGreaterThan(0);
    expect(actions.every((a) => a.kind === 'move')).toBe(true);
    expect(actions.every((a) => a.id.startsWith('move-to-'))).toBe(true);
    expect(actions[0]).toMatchObject({
      disabled: false,
      variant: 'primary',
    });
  });

  it('includes End hop while a hop chain can continue', () => {
    const board = emptyBoard();
    const a = holeIndex(0, 3)!;
    const mid = holeIndex(0, 2)!;
    const b = holeIndex(0, 1)!;
    board[mid] = '0';
    board[a] = '1';
    board[b] = '1';
    const G = setupG({ board, mustContinueFrom: mid });
    const actions = getChineseCheckersActions({
      G,
      player: '0',
      yourTurn: true,
      selected: mid,
    });
    expect(actions.some((a) => a.id === 'end-hop')).toBe(true);
    expect(actions.find((a) => a.id === 'end-hop')).toMatchObject({
      kind: 'confirm',
      label: 'End hop',
      testId: 'cc-action-end-hop',
      disabled: false,
    });
  });

  it('disables End hop off-turn with a reason', () => {
    const board = emptyBoard();
    const mid = holeIndex(0, 2)!;
    board[mid] = '0';
    board[holeIndex(0, 3)!] = '1';
    board[holeIndex(0, 1)!] = '1';
    const G = setupG({ board, mustContinueFrom: mid });
    const actions = getChineseCheckersActions({
      G,
      player: '0',
      yourTurn: false,
      selected: mid,
    });
    const end = actions.find((a) => a.id === 'end-hop');
    expect(end).toMatchObject({
      disabled: true,
      disabledReason: 'Wait for your turn',
    });
  });

  it('disables destination intents off-turn with a reason', () => {
    const board = emptyBoard();
    const from = holeIndex(-4, 5)!;
    board[from] = '0';
    const G = setupG({ board });
    const actions = getChineseCheckersActions({
      G,
      player: '0',
      yourTurn: false,
      selected: from,
    });
    expect(actions.length).toBeGreaterThan(0);
    for (const action of actions) {
      expect(action.disabled).toBe(true);
      expect(action.disabledReason).toBe('Wait for your turn');
    }
  });

  it('omits move intents when no peg is selected', () => {
    const board = emptyBoard();
    board[holeIndex(-4, 5)!] = '0';
    const G = setupG({ board });
    const actions = getChineseCheckersActions({
      G,
      player: '0',
      yourTurn: true,
      selected: null,
    });
    expect(actions).toEqual([]);
  });
});
