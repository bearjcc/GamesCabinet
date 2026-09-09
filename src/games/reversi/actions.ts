import type { SemanticAction } from '../../lib/actions';
import { legalPlaces, type ReversiState } from './game';

export type ReversiActionInput = {
  G: ReversiState;
  player: string;
  yourTurn: boolean;
};

/** Pure pew intents for Reversi pass when the board has no legal place. */
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

  return [];
}
