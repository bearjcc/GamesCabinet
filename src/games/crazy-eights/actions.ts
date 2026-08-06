import type { SemanticAction } from '../../lib/actions';
import type { CrazyEightsState } from './game';

export type CrazyEightsActionInput = {
  G: CrazyEightsState;
  yourTurn: boolean;
};

/** Pure pew intents for Crazy Eights (Pass). Draw stays on StockPile via game.canDraw. */
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
