import type { SemanticAction } from '../../lib/actions';
import { canPlay, type WarState } from './game';

export type WarActionInput = {
  G: WarState;
  yourTurn: boolean;
};

/** Pure pew intents: a single Fight action plays both top cards. */
export function getWarActions({ G, yourTurn }: WarActionInput): SemanticAction[] {
  const ok = yourTurn && canPlay(G);
  let disabledReason: string | undefined;
  if (!yourTurn) disabledReason = 'Wait for your turn';
  else if (!canPlay(G)) disabledReason = 'No cards left to fight';

  return [
    {
      id: 'play',
      kind: 'confirm',
      label: 'Fight',
      variant: 'primary',
      disabled: !ok,
      disabledReason,
      testId: 'war-action-play',
    },
  ];
}
