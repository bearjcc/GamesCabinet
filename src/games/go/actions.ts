import type { SemanticAction } from '../../lib/actions';
import { type GoState, legalPlaces, SIZE } from './game';

export type GoActionInput = {
  G: GoState;
  player: string;
  yourTurn: boolean;
};

function squareCoord(index: number): string {
  const row = Math.floor(index / SIZE);
  const col = index % SIZE;
  return `${String.fromCharCode(97 + col)}${SIZE - row}`;
}

/** Pure pew intents for Go place / pass. */
export function getGoActions({ G, player, yourTurn }: GoActionInput): SemanticAction[] {
  const places = legalPlaces(G, player);
  const disabled = !yourTurn;
  const disabledReason = yourTurn ? undefined : 'Wait for your turn';

  const placeActions = places.map((i) => ({
    id: `place-${i}`,
    kind: 'move' as const,
    label: `Place at ${squareCoord(i)}`,
    variant: 'primary' as const,
    disabled,
    disabledReason,
    testId: `go-action-${i}`,
  }));

  return [
    ...placeActions,
    {
      id: 'pass',
      kind: 'dismiss',
      label: 'Pass',
      variant: 'secondary',
      disabled,
      disabledReason,
      testId: 'go-action-pass',
    },
  ];
}
