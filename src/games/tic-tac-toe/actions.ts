import type { SemanticAction } from '../../lib/actions';
import type { TTTState } from './game';

export type TicTacToeActionInput = {
  G: TTTState;
  yourTurn: boolean;
};

export type SquareMarkState = {
  enabled: boolean;
  disabledReason?: string;
};

/** Shared legality + reason for pew Mark intents and board square taps. */
export function squareMarkState(cell: string | null, yourTurn: boolean): SquareMarkState {
  if (cell !== null) return { enabled: false, disabledReason: 'Square already marked' };
  if (!yourTurn) return { enabled: false, disabledReason: 'Wait for your turn' };
  return { enabled: true };
}

/** Pure pew intents for Tic-Tac-Toe empty cells. */
export function getTicTacToeActions({ G, yourTurn }: TicTacToeActionInput): SemanticAction[] {
  const actions: SemanticAction[] = [];
  for (let i = 0; i < G.cells.length; i++) {
    const { enabled, disabledReason } = squareMarkState(G.cells[i], yourTurn);
    if (G.cells[i] !== null) continue;
    actions.push({
      id: `click-cell-${i}`,
      kind: 'move',
      label: `Mark square ${i + 1}`,
      variant: 'primary',
      disabled: !enabled,
      disabledReason,
      testId: `ttt-action-cell-${i}`,
    });
  }
  return actions;
}
