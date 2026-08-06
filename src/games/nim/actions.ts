import type { SemanticAction } from '../../lib/actions';
import { MAX_TAKE, type NimState } from './game';

export type NimActionInput = {
  G: NimState;
  yourTurn: boolean;
};

/** Pure pew intents: Take 1 / Take 2 / Take 3 from the single heap. */
export function getNimActions({ G, yourTurn }: NimActionInput): SemanticAction[] {
  const actions: SemanticAction[] = [];
  for (let n = 1; n <= MAX_TAKE; n++) {
    const exceedsHeap = n > G.heap;
    const disabled = !yourTurn || exceedsHeap;
    let disabledReason: string | undefined;
    if (!yourTurn) disabledReason = 'Wait for your turn';
    else if (exceedsHeap) {
      disabledReason = G.heap === 1 ? 'Only 1 stone left' : `Only ${G.heap} stones left`;
    }
    actions.push({
      id: `take-${n}`,
      kind: 'move',
      label: `Take ${n}`,
      variant: 'primary',
      disabled,
      disabledReason,
      testId: `nim-action-take-${n}`,
    });
  }
  return actions;
}
