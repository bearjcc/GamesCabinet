import { describe, expect, it } from 'vitest';
import { getChessActions } from './actions';
import type { ChessState, Piece } from './game';
import { sq } from './game';

function emptyBoard(): (Piece | null)[] {
  return Array(64).fill(null);
}

function setupG(partial: Partial<ChessState> = {}): ChessState {
  return {
    board: emptyBoard(),
    castling: {
      whiteKing: false,
      whiteQueen: false,
      blackKing: false,
      blackQueen: false,
    },
    enPassant: null,
    halfmove: 0,
    fullmove: 1,
    ...partial,
  };
}

describe('getChessActions', () => {
  it('lists Move to intents for legal destinations of the selected piece', () => {
    const board = emptyBoard();
    board[sq(7, 4)] = { type: 'K', player: '0' };
    board[sq(0, 4)] = { type: 'K', player: '1' };
    board[sq(6, 0)] = { type: 'P', player: '0' };
    const G = setupG({ board });
    const actions = getChessActions({
      G,
      player: '0',
      yourTurn: true,
      selected: sq(6, 0),
    });
    expect(actions.map((a) => a.id).sort()).toEqual(['move-to-32', 'move-to-40'].sort());
    expect(actions.find((a) => a.id === 'move-to-40')).toMatchObject({
      kind: 'move',
      label: 'Move to a3',
      disabled: false,
      testId: 'chess-action-to-40',
      variant: 'primary',
    });
    expect(actions.find((a) => a.id === 'move-to-32')).toMatchObject({
      label: 'Move to a4',
      testId: 'chess-action-to-32',
    });
  });

  it('disables destination intents off-turn with a reason', () => {
    const board = emptyBoard();
    board[sq(7, 4)] = { type: 'K', player: '0' };
    board[sq(0, 4)] = { type: 'K', player: '1' };
    board[sq(6, 0)] = { type: 'P', player: '0' };
    const G = setupG({ board });
    const actions = getChessActions({
      G,
      player: '0',
      yourTurn: false,
      selected: sq(6, 0),
    });
    expect(actions.length).toBeGreaterThan(0);
    for (const action of actions) {
      expect(action.disabled).toBe(true);
      expect(action.disabledReason).toBe('Wait for your turn');
    }
  });

  it('omits move intents when no piece is selected', () => {
    const board = emptyBoard();
    board[sq(7, 4)] = { type: 'K', player: '0' };
    board[sq(0, 4)] = { type: 'K', player: '1' };
    board[sq(6, 0)] = { type: 'P', player: '0' };
    const G = setupG({ board });
    expect(
      getChessActions({
        G,
        player: '0',
        yourTurn: true,
        selected: null,
      }),
    ).toEqual([]);
  });

  it('omits destinations that are not legal for the selected square', () => {
    const board = emptyBoard();
    board[sq(7, 4)] = { type: 'K', player: '0' };
    board[sq(0, 4)] = { type: 'K', player: '1' };
    board[sq(6, 0)] = { type: 'P', player: '0' };
    const G = setupG({ board });
    expect(
      getChessActions({
        G,
        player: '0',
        yourTurn: true,
        selected: sq(0, 4),
      }),
    ).toEqual([]);
  });
});
