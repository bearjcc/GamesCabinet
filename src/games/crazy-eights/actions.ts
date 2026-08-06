import type { SemanticAction } from '../../lib/actions';
import type { CrazyEightsState } from './game';

/**
 * Stock/discard draw availability (current board legality).
 * Conflict note: rules agent may export `canDraw` from game.ts that also
 * forbids drawing when the hand already holds a legal card. Reconcile then.
 */
export function canDrawCard(G: CrazyEightsState, _player: number): boolean {
  return G.stock.length > 0 || G.discard.length > 1;
}

export type CrazyEightsActionInput = {
  G: CrazyEightsState;
  yourTurn: boolean;
};

/** Pure pew intents for Crazy Eights (Pass). Draw stays on StockPile. */
export function getCrazyEightsActions({ G, yourTurn }: CrazyEightsActionInput): SemanticAction[] {
  const passOk = yourTurn && G.drewThisTurn;
  let disabledReason: string | undefined;
  if (!yourTurn) disabledReason = 'Wait for your turn';
  else if (!G.drewThisTurn) disabledReason = 'Draw a card before you can pass';

  return [
    {
      id: 'pass',
      kind: 'dismiss',
      label: 'Pass',
      variant: 'secondary',
      disabled: !passOk,
      disabledReason,
      testId: 'ce-pass',
    },
  ];
}
