import type { SemanticAction } from '../../lib/actions';
import { legalPlaces, type ReversiState, SIZE } from './game';

export type ReversiActionInput = {
  G: ReversiState;
  player: string;
  yourTurn: boolean;
};

function squareCoord(index: number): string {
  const row = Math.floor(index / SIZE);
  const col = index % SIZE;
  return `${String.fromCharCode(97 + col)}${SIZE - row}`;
}

/** Pure pew intents for Reversi place / pass. */
export function getReversiActions({ G, player, yourTurn }: ReversiActionInput): SemanticAction[] {
  const places = legalPlaces(G, player);

  if (places.length === 0) {
    return [
      {
        id: 'pass',
        kind: 'dismiss',
        label: 'Pass',
        variant: 'secondary',
        disabled: !yourTurn,
        disabledReason: yourTurn ? undefined : 'Wait for your turn',
        testId: 'reversi-action-pass',
      },
    ];
  }

  return places.map((i) => ({
    id: `place-${i}`,
    kind: 'move' as const,
    label: `Place at ${squareCoord(i)}`,
    variant: 'primary' as const,
    disabled: !yourTurn,
    disabledReason: yourTurn ? undefined : 'Wait for your turn',
    testId: `reversi-action-${i}`,
  }));
}
