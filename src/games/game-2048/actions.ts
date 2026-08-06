import type { SemanticAction } from '../../lib/actions';
import { canUndo, type Game2048State } from './game';

export type Game2048ActionInput = {
  G: Game2048State;
  playable: boolean;
  gameover?: unknown;
};

const SWIPES = [
  { id: 'swipe-up', label: 'Up', testId: 'g2048-action-up' },
  { id: 'swipe-down', label: 'Down', testId: 'g2048-action-down' },
  { id: 'swipe-left', label: 'Left', testId: 'g2048-action-left' },
  { id: 'swipe-right', label: 'Right', testId: 'g2048-action-right' },
] as const;

/** Pure pew intents for solo 2048 swipes and undo. */
export function get2048Actions({ G, playable, gameover }: Game2048ActionInput): SemanticAction[] {
  const undoOk = canUndo(G, gameover);
  const swipes: SemanticAction[] = SWIPES.map((s) => ({
    id: s.id,
    kind: 'move' as const,
    label: s.label,
    variant: 'primary' as const,
    disabled: !playable,
    disabledReason: playable ? undefined : 'Game not playable',
    testId: s.testId,
  }));

  return [
    ...swipes,
    {
      id: 'undo',
      kind: 'dismiss',
      label: 'Undo',
      variant: 'secondary',
      disabled: !undoOk,
      disabledReason: undoOk ? undefined : gameover ? 'Game over' : 'Nothing to undo',
      testId: 'g2048-action-undo',
    },
  ];
}
