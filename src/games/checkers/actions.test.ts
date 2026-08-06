import { describe, expect, it } from 'vitest';
import { getCheckersActions } from './actions';
import type { CheckersState, Piece } from './game';
import { sq } from './game';

function emptyBoard(): (Piece | null)[] {
  return Array(64).fill(null);
}

function setupG(partial: Partial<CheckersState> = {}): CheckersState {
  return {
    board: emptyBoard(),
    mustContinueFrom: null,
    pliesWithoutCaptureOrPromotion: 0,
    ...partial,
  };
}

describe('getCheckersActions', () => {
  it('lists Move to intents for legal destinations of the selected piece', () => {
    const board = emptyBoard();
    board[sq(2, 1)] = { player: '0', king: false };
    const G = setupG({ board });
    const actions = getCheckersActions({
      G,
      player: '0',
      yourTurn: true,
      selected: sq(2, 1),
    });
    expect(actions.map((a) => a.id).sort()).toEqual(['move-to-24', 'move-to-26'].sort());
    expect(actions.find((a) => a.id === 'move-to-24')).toMatchObject({
      kind: 'move',
      label: 'Move to a5',
      disabled: false,
      testId: 'ck-action-to-24',
      variant: 'primary',
    });
    expect(actions.find((a) => a.id === 'move-to-26')).toMatchObject({
      kind: 'move',
      label: 'Move to c5',
      disabled: false,
      testId: 'ck-action-to-26',
    });
  });

  it('disables destination intents off-turn with a reason', () => {
    const board = emptyBoard();
    board[sq(2, 1)] = { player: '0', king: false };
    const G = setupG({ board });
    const actions = getCheckersActions({
      G,
      player: '0',
      yourTurn: false,
      selected: sq(2, 1),
    });
    expect(actions.length).toBeGreaterThan(0);
    for (const action of actions) {
      expect(action.disabled).toBe(true);
      expect(action.disabledReason).toBe('Wait for your turn');
    }
  });

  it('omits move intents when no piece is selected', () => {
    const board = emptyBoard();
    board[sq(2, 1)] = { player: '0', king: false };
    const G = setupG({ board });
    const actions = getCheckersActions({
      G,
      player: '0',
      yourTurn: true,
      selected: null,
    });
    expect(actions).toEqual([]);
  });

  it('omits destinations that are not legal for the selected piece', () => {
    const board = emptyBoard();
    board[sq(2, 1)] = { player: '0', king: false };
    board[sq(5, 0)] = { player: '1', king: false };
    const G = setupG({ board });
    const actions = getCheckersActions({
      G,
      player: '0',
      yourTurn: true,
      selected: sq(5, 0),
    });
    // Player 0 selected an opponent piece / illegal from — no legal moves from that square.
    expect(actions).toEqual([]);
  });
});
