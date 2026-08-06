import type { SemanticAction } from '../../lib/actions';
import { allLineKeys, type DotsAndBoxesState } from './game';

export type DotsAndBoxesActionInput = {
  G: DotsAndBoxesState;
  yourTurn: boolean;
};

/** Pure pew intents for open Dots and Boxes lines. */
export function getDotsAndBoxesActions({ G, yourTurn }: DotsAndBoxesActionInput): SemanticAction[] {
  const actions: SemanticAction[] = [];
  for (const key of allLineKeys()) {
    if (G.lines[key] !== null) continue;
    actions.push({
      id: `claim-${key}`,
      kind: 'move',
      label: `Claim line ${key}`,
      variant: 'primary',
      disabled: !yourTurn,
      disabledReason: yourTurn ? undefined : 'Wait for your turn',
      testId: `dab-action-${key}`,
    });
  }
  return actions;
}
