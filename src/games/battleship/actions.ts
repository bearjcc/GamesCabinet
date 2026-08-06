import type { SemanticAction } from '../../lib/actions';
import { type BattleshipState, nextShipId, type Orientation, SHIP_LENGTHS } from './game';

export type BattleshipActionInput = {
  G: BattleshipState;
  player: string;
  yourTurn: boolean;
  phase: string | null | undefined;
  orientation: Orientation;
};

/** Pure pew intents: setup confirm / rotate; battle fires via board clicks. */
export function getBattleshipActions({
  G,
  player,
  yourTurn,
  phase,
  orientation,
}: BattleshipActionInput): SemanticAction[] {
  if (phase === 'setup') {
    const board = G.boards[player];
    const actions: SemanticAction[] = [
      {
        id: 'rotate',
        kind: 'choose',
        label: orientation === 'H' ? 'Orient: horizontal' : 'Orient: vertical',
        variant: 'secondary',
        disabled: !yourTurn || Boolean(board?.ready),
        disabledReason: board?.ready ? 'Fleet ready' : yourTurn ? undefined : 'Wait for your turn',
        testId: 'battleship-action-rotate',
      },
    ];

    const next = board ? nextShipId(board) : null;
    const allPlaced = next === null && (board?.ships.length ?? 0) === SHIP_LENGTHS.length;
    actions.push({
      id: 'confirmSetup',
      kind: 'confirm',
      label: 'Ready',
      variant: 'primary',
      disabled: !yourTurn || !allPlaced || Boolean(board?.ready),
      disabledReason: board?.ready
        ? 'Already ready'
        : !allPlaced
          ? 'Place all ships first'
          : yourTurn
            ? undefined
            : 'Wait for your turn',
      testId: 'battleship-action-ready',
    });
    return actions;
  }

  // Battle: fire via opponent grid clicks (100 open cells is too many for pew).
  return [];
}
