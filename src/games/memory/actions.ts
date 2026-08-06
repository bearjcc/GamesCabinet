import type { SemanticAction } from '../../lib/actions';
import type { MemoryState } from './game';

export type MemoryActionInput = {
  G: MemoryState;
  yourTurn: boolean;
};

/** Pure pew intents for Memory face-down cards. */
export function getMemoryActions({ G, yourTurn }: MemoryActionInput): SemanticAction[] {
  const actions: SemanticAction[] = [];
  for (let i = 0; i < G.cards.length; i++) {
    if (G.cards[i].faceUp) continue;
    actions.push({
      id: `flip-${i}`,
      kind: 'move',
      label: `Flip card ${i + 1}`,
      variant: 'primary',
      disabled: !yourTurn,
      disabledReason: yourTurn ? undefined : 'Wait for your turn',
      testId: `memory-action-${i}`,
    });
  }
  return actions;
}
