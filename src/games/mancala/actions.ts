import type { SemanticAction } from '../../lib/actions';
import { type MancalaState, ownPits } from './game';

export type MancalaActionInput = {
  G: MancalaState;
  player: string;
  yourTurn: boolean;
};

/** Pure pew intents for Mancala sow from non-empty own pits. */
export function getMancalaActions({ G, player, yourTurn }: MancalaActionInput): SemanticAction[] {
  const actions: SemanticAction[] = [];
  for (const pit of ownPits(player)) {
    if (G.pits[pit] <= 0) continue;
    actions.push({
      id: `sow-${pit}`,
      kind: 'move',
      label: `Sow pit ${pit}`,
      variant: 'primary',
      disabled: !yourTurn,
      disabledReason: yourTurn ? undefined : 'Wait for your turn',
      testId: `mancala-action-${pit}`,
    });
  }
  return actions;
}
