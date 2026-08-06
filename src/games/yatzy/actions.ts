import type { SemanticAction } from '../../lib/actions';

export type YatzyActionInput = {
  rolls: number;
  yourTurn: boolean;
};

/** Pure pew intents for Yatzy (Roll). Score stays on the scorecard. */
export function getYatzyActions({ rolls, yourTurn }: YatzyActionInput): SemanticAction[] {
  const canRoll = yourTurn && rolls < 3;
  return [
    {
      id: 'roll',
      kind: 'roll',
      label: `Roll (${rolls}/3)`,
      variant: 'primary',
      disabled: !canRoll,
      disabledReason: yourTurn ? 'No rolls left this turn' : 'Wait for your turn',
      testId: 'yatzy-roll',
    },
  ];
}
