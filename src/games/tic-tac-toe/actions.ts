import type { SemanticAction } from '../../lib/actions';
import type { TTTState } from './game';

export type TicTacToeActionInput = {
  G: TTTState;
  yourTurn: boolean;
};

/** Pure pew intents for Tic-Tac-Toe empty cells. */
export function getTicTacToeActions({ G, yourTurn }: TicTacToeActionInput): SemanticAction[] {
  const actions: SemanticAction[] = [];
  for (let i = 0; i < G.cells.length; i++) {
    if (G.cells[i] !== null) continue;
    actions.push({
      id: `click-cell-${i}`,
      kind: 'move',
      label: `Mark square ${i + 1}`,
      variant: 'primary',
      disabled: !yourTurn,
      disabledReason: yourTurn ? undefined : 'Wait for your turn',
      testId: `ttt-action-cell-${i}`,
    });
  }
  return actions;
}
