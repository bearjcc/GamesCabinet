import type { SemanticAction } from '../../lib/actions';
import { canDraw, canPass, type DominoesState, playableEndIndexes } from './game';

export type DominoesActionInput = {
  G: DominoesState;
  player: number;
  yourTurn: boolean;
  /** Selected hand index for Mum play intents; omit when none. */
  handIndex?: number | null;
};

/** Pure pew intents for Dominoes play ends / starter, draw, and pass. */
export function getDominoesActions({
  G,
  player,
  yourTurn,
  handIndex = null,
}: DominoesActionInput): SemanticAction[] {
  const actions: SemanticAction[] = [];

  if (yourTurn && player >= 0 && handIndex !== null && handIndex !== undefined) {
    const tile = G.hands[player]?.[handIndex];
    if (tile) {
      if (G.board.length === 0) {
        actions.push({
          id: 'play-starter',
          kind: 'move',
          label: 'Play starter',
          variant: 'primary',
          disabled: false,
          testId: 'dom-play-starter',
        });
      } else {
        for (const endIndex of playableEndIndexes(G, tile)) {
          actions.push({
            id: `play-end-${endIndex}`,
            kind: 'move',
            label: `Play on end ${endIndex}`,
            variant: 'primary',
            disabled: false,
            testId: `dom-play-end-${endIndex}`,
          });
        }
      }
    }
  }

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
