import type { SemanticAction } from '../../lib/actions';
import type { Rank } from '../shared/cards';
import { askableRanks, canAsk, canDraw, type GoFishState } from './game';

export type GoFishActionInput = {
  G: GoFishState;
  player: number;
  yourTurn: boolean;
};

const RANK_LABEL: Record<Rank, string> = {
  A: 'Aces',
  '2': 'Twos',
  '3': 'Threes',
  '4': 'Fours',
  '5': 'Fives',
  '6': 'Sixes',
  '7': 'Sevens',
  '8': 'Eights',
  '9': 'Nines',
  '10': 'Tens',
  J: 'Jacks',
  Q: 'Queens',
  K: 'Kings',
};

/** Pure pew intents: askable ranks + draw when fishing / empty-hand refill. */
export function getGoFishActions({ G, player, yourTurn }: GoFishActionInput): SemanticAction[] {
  const actions: SemanticAction[] = [];
  const hand = player >= 0 && G.hands[player] ? G.hands[player] : [];

  for (const rank of askableRanks(hand)) {
    const ok = yourTurn && canAsk(G, player, rank);
    let disabledReason: string | undefined;
    if (!yourTurn) disabledReason = 'Wait for your turn';
    else if (G.pendingFishRank != null) disabledReason = 'Go fish - draw from the stock';

    actions.push({
      id: `ask-${rank}`,
      kind: 'choose',
      label: `Ask for ${RANK_LABEL[rank]}`,
      variant: 'primary',
      disabled: !ok,
      disabledReason,
      testId: `go-fish-action-ask-${rank}`,
    });
  }

  const drawNeeded =
    G.pendingFishRank != null ||
    (yourTurn && player >= 0 && hand.length === 0 && G.stock.length > 0);
  if (drawNeeded) {
    const drawOk = yourTurn && player >= 0 && canDraw(G, player);
    let drawReason: string | undefined;
    if (!yourTurn) drawReason = 'Wait for your turn';
    else if (!drawOk) drawReason = 'Stock is empty';

    actions.push({
      id: 'draw',
      kind: 'draw',
      label: G.pendingFishRank != null ? 'Go fish' : 'Draw',
      variant: 'primary',
      disabled: !drawOk,
      disabledReason: drawReason,
      testId: 'go-fish-action-draw',
    });
  }

  return actions;
}
