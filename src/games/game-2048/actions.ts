import type { SemanticAction } from '../../lib/actions';
import { canRedo, canUndo, type Game2048State } from './game';

export type Game2048ActionInput = {
  G: Game2048State;
  playable: boolean;
  gameover?: unknown;
};

/** Chrome actions for solo 2048 (undo, redo, new game, win pause). Tile moves use keys / swipe. */
export function get2048Actions({ G, gameover }: Game2048ActionInput): SemanticAction[] {
  if (G.winPaused && !gameover) {
    return [
      {
        id: 'keep-going',
        kind: 'confirm',
        label: 'Keep going',
        variant: 'primary',
        testId: 'g2048-keep-going',
      },
      {
        id: 'try-again',
        kind: 'dismiss',
        label: 'Try again',
        variant: 'secondary',
        testId: 'g2048-try-again',
      },
    ];
  }

  const undoOk = canUndo(G, gameover);
  const redoOk = canRedo(G, gameover);
  const actions: SemanticAction[] = [];

  if (!gameover) {
    actions.push({
      id: 'new-game',
      kind: 'dismiss',
      label: 'New game',
      variant: 'secondary',
      testId: 'g2048-new-game',
    });
  }

  actions.push({
    id: 'undo',
    kind: 'dismiss',
    label: 'Undo',
    variant: 'secondary',
    disabled: !undoOk,
    disabledReason: undoOk ? undefined : gameover ? 'Game over' : 'Nothing to undo',
    testId: 'g2048-action-undo',
  });

  actions.push({
    id: 'redo',
    kind: 'dismiss',
    label: 'Redo',
    variant: 'secondary',
    disabled: !redoOk,
    disabledReason: redoOk ? undefined : gameover ? 'Game over' : 'Nothing to redo',
    testId: 'g2048-action-redo',
  });

  return actions;
}
