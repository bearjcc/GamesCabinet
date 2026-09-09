import type { SemanticAction } from '../../lib/actions';
import { type CrazyEightsState, canPass } from './game';

export type CrazyEightsActionInput = {
  G: CrazyEightsState;
  player: number;
  yourTurn: boolean;
};

/** Pure pew intents for Crazy Eights (Pass). Draw stays on StockPile via game.canDraw. */
export function getCrazyEightsActions({
  G,
  player,
  yourTurn,
}: CrazyEightsActionInput): SemanticAction[] {
  const passOk = yourTurn && canPass(G, player);
  let disabledReason: string | undefined;
  if (!yourTurn) disabledReason = 'Wait for your turn';
  else if (!passOk) disabledReason = 'Play a card or draw first';

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
