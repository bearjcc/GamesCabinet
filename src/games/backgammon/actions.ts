import type { SemanticAction } from '../../lib/actions';
import { BAR, type BackgammonState, legalPlays } from './game';

export type BackgammonActionInput = {
  G: BackgammonState;
  player: string;
  yourTurn: boolean;
};

function fromLabel(from: number): string {
  return from === BAR ? 'bar' : `point ${from}`;
}

/** Pure pew intents: roll, legal plays, or pass when stuck. */
export function getBackgammonActions({
  G,
  player,
  yourTurn,
}: BackgammonActionInput): SemanticAction[] {
  if (!G.hasRolled) {
    return [
      {
        id: 'roll',
        kind: 'roll',
        label: 'Roll dice',
        variant: 'primary',
        disabled: !yourTurn,
        disabledReason: yourTurn ? undefined : 'Wait for your turn',
        testId: 'backgammon-roll',
      },
    ];
  }

  const plays = legalPlays(G, player);
  if (plays.length === 0) {
    return [
      {
        id: 'pass',
        kind: 'dismiss',
        label: 'No moves - pass',
        variant: 'primary',
        disabled: !yourTurn,
        disabledReason: yourTurn ? undefined : 'Wait for your turn',
        testId: 'backgammon-pass',
      },
    ];
  }

  return plays.map((p) => ({
    id: `play-${p.from}-${p.dieIndex}`,
    kind: 'move' as const,
    label:
      p.to === 0
        ? `Bear off ${fromLabel(p.from)} (${G.dice[p.dieIndex]})`
        : `${fromLabel(p.from)} -> ${p.to} (${G.dice[p.dieIndex]})`,
    variant: 'primary' as const,
    disabled: !yourTurn,
    disabledReason: yourTurn ? undefined : 'Wait for your turn',
    testId: `backgammon-play-${p.from}-${p.dieIndex}`,
  }));
}
