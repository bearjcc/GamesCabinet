import type { SemanticAction } from '../../lib/actions';
import { type C4State, COLS, ROWS } from './game';

export type ConnectFourActionInput = {
  G: C4State;
  yourTurn: boolean;
};

export type ColumnDropState = {
  enabled: boolean;
  disabledReason?: string;
};

function columnOpen(cells: (string | null)[], col: number): boolean {
  for (let row = 0; row < ROWS; row++) {
    if (cells[row * COLS + col] === null) return true;
  }
  return false;
}

/** Shared legality + reason for pew Drop intents and board column taps. */
export function columnDropState(
  cells: (string | null)[],
  col: number,
  yourTurn: boolean,
): ColumnDropState {
  const open = columnOpen(cells, col);
  const enabled = yourTurn && open;
  let disabledReason: string | undefined;
  if (!yourTurn) disabledReason = 'Wait for your turn';
  else if (!open) disabledReason = 'Column full';
  return { enabled, disabledReason };
}

/** Pure pew intents for Connect Four columns. */
export function getConnectFourActions({ G, yourTurn }: ConnectFourActionInput): SemanticAction[] {
  const actions: SemanticAction[] = [];
  for (let col = 0; col < COLS; col++) {
    const { enabled, disabledReason } = columnDropState(G.cells, col, yourTurn);
    actions.push({
      id: `drop-${col}`,
      kind: 'move',
      label: `Drop column ${col + 1}`,
      variant: 'primary',
      disabled: !enabled,
      disabledReason,
      testId: `c4-action-col-${col}`,
    });
  }
  return actions;
}
