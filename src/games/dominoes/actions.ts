import type { SemanticAction } from '../../lib/actions';
import { canDraw, canPass, type DominoesState } from './game';

export type DominoesActionInput = {
  G: DominoesState;
  player: number;
  yourTurn: boolean;
};

/** Pure pew intents for Dominoes draw and pass (play stays on the board). */
export function getDominoesActions({ G, player, yourTurn }: DominoesActionInput): SemanticAction[] {
  const actions: SemanticAction[] = [];

  const drawOk = yourTurn && player >= 0 && canDraw(G, player);
  const passOk = yourTurn && player >= 0 && canPass(G, player);

  let drawReason: string | undefined;
  let passReason: string | undefined;
  if (!yourTurn) {
    drawReason = 'Wait for your turn';
    passReason = 'Wait for your turn';
  } else if (drawOk) {
    passReason = 'Draw from the boneyard first';
  } else if (passOk) {
    drawReason = 'Boneyard is empty';
  } else {
    drawReason = 'You can play a tile';
    passReason = 'You can play a tile';
  }

  actions.push(
    {
      id: 'draw',
      kind: 'draw',
      label: 'Draw',
      variant: 'primary',
      disabled: !drawOk,
      disabledReason: drawReason,
      testId: 'dom-draw',
    },
    {
      id: 'pass',
      kind: 'dismiss',
      label: 'Pass',
      variant: 'secondary',
      disabled: !passOk,
      disabledReason: passReason,
      testId: 'dom-pass',
    },
  );

  return actions;
}
