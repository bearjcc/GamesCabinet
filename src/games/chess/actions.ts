import type { SemanticAction } from '../../lib/actions';
import { type ChessState, legalMoves, rc } from './game';

export type ChessActionInput = {
  G: ChessState;
  player: string;
  yourTurn: boolean;
  /** Selected board index; omit or null when none. */
  selected?: number | null;
};

function squareCoord(index: number): string {
  const { row, col } = rc(index);
  return `${String.fromCharCode(97 + col)}${8 - row}`;
}

/** Pure pew intents for Chess destinations of the selected piece. */
export function getChessActions({
  G,
  player,
  yourTurn,
  selected = null,
}: ChessActionInput): SemanticAction[] {
  if (selected === null || selected === undefined) return [];

  const destinations = legalMoves(G, player)
    .filter((m) => m.from === selected)
    .map((m) => m.to)
    .sort((a, b) => a - b);

  return destinations.map((to) => ({
    id: `move-to-${to}`,
    kind: 'move' as const,
    label: `Move to ${squareCoord(to)}`,
    variant: 'primary' as const,
    disabled: !yourTurn,
    disabledReason: yourTurn ? undefined : 'Wait for your turn',
    testId: `chess-action-to-${to}`,
  }));
}
