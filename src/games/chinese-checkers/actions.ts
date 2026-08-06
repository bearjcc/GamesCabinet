import type { SemanticAction } from '../../lib/actions';
import { type ChineseCheckersState, holeAt, legalMoves } from './game';

export type ChineseCheckersActionInput = {
  G: ChineseCheckersState;
  player: string;
  yourTurn: boolean;
  /** Selected hole index; omit or null when none. */
  selected?: number | null;
};

function holeLabel(index: number): string {
  const { q, r } = holeAt(index);
  return `(${q},${r})`;
}

/** Pure pew intents for Chinese Checkers destinations of the selected peg. */
export function getChineseCheckersActions({
  G,
  player,
  yourTurn,
  selected = null,
}: ChineseCheckersActionInput): SemanticAction[] {
  const legal = legalMoves(G, player);
  const actions: SemanticAction[] = [];

  if (G.mustContinueFrom !== null && legal.some((m) => m.kind === 'endHop')) {
    actions.push({
      id: 'end-hop',
      kind: 'confirm',
      label: 'End hop',
      variant: 'secondary',
      disabled: !yourTurn,
      disabledReason: yourTurn ? undefined : 'Wait for your turn',
      testId: 'cc-action-end-hop',
    });
  }

  if (selected === null) return actions;

  const destinations = legal
    .flatMap((m) => ((m.kind === 'step' || m.kind === 'hop') && m.from === selected ? [m.to] : []))
    .sort((a, b) => a - b);

  for (const to of destinations) {
    actions.push({
      id: `move-to-${to}`,
      kind: 'move',
      label: `Move to ${holeLabel(to)}`,
      variant: 'primary',
      disabled: !yourTurn,
      disabledReason: yourTurn ? undefined : 'Wait for your turn',
      testId: `cc-action-to-${to}`,
    });
  }

  return actions;
}
