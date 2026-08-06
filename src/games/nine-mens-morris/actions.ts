import type { SemanticAction } from '../../lib/actions';
import { legalMoves, legalPlaces, legalRemovals, type NmmState } from './game';

export type NmmActionInput = {
  G: NmmState;
  player: string;
  yourTurn: boolean;
};

/** Pure pew intents for place, move destinations, or removals. */
export function getNineMensMorrisActions({
  G,
  player,
  yourTurn,
}: NmmActionInput): SemanticAction[] {
  const disabled = !yourTurn;
  const disabledReason = yourTurn ? undefined : 'Wait for your turn';

  if (G.pendingRemoval) {
    return legalRemovals(G, player).map((i) => ({
      id: `remove-${i}`,
      kind: 'move' as const,
      label: `Remove point ${i}`,
      variant: 'primary' as const,
      disabled,
      disabledReason,
      testId: `nmm-action-remove-${i}`,
    }));
  }

  if (G.phase === 'place') {
    return legalPlaces(G, player).map((i) => ({
      id: `place-${i}`,
      kind: 'move' as const,
      label: `Place at ${i}`,
      variant: 'primary' as const,
      disabled,
      disabledReason,
      testId: `nmm-action-place-${i}`,
    }));
  }

  if (G.selected === null) {
    const fromSet = [...new Set(legalMoves(G, player).map((m) => m.from))].sort((a, b) => a - b);
    return fromSet.map((i) => ({
      id: `select-${i}`,
      kind: 'select' as const,
      label: `Select point ${i}`,
      variant: 'secondary' as const,
      disabled,
      disabledReason,
      testId: `nmm-action-select-${i}`,
    }));
  }

  const destinations = legalMoves(G, player)
    .filter((m) => m.from === G.selected)
    .map((m) => m.to)
    .sort((a, b) => a - b);

  return destinations.map((to) => ({
    id: `move-to-${to}`,
    kind: 'move' as const,
    label: `Move to ${to}`,
    variant: 'primary' as const,
    disabled,
    disabledReason,
    testId: `nmm-action-to-${to}`,
  }));
}
