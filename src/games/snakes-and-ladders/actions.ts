import type { SemanticAction } from '../../lib/actions';
import type { SnakesAndLaddersState } from './game';

export type SnakesAndLaddersActionInput = {
  G: SnakesAndLaddersState;
  yourTurn: boolean;
};

/** Pure pew intents: Roll is the only primary play action. */
export function getSnakesAndLaddersActions({
  yourTurn,
}: SnakesAndLaddersActionInput): SemanticAction[] {
  return [
    {
      id: 'roll',
      kind: 'roll',
      label: 'Roll',
      variant: 'primary',
      disabled: !yourTurn,
      disabledReason: yourTurn ? undefined : 'Wait for your turn',
      testId: 'sal-action-roll',
    },
  ];
}
