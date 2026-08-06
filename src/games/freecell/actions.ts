import type { SemanticAction } from '../../lib/actions';
import { findFoundationIndex } from '../klondike/game';
import type { FreeCellState } from './game';

/** Board selection: cascade run or parked freecell card. */
export type FreeCellSelection =
  | { source: 'cascade'; col: number; startIndex: number; count: number }
  | { source: 'freecell'; index: number };

export type FreeCellActionInput = {
  G: FreeCellState;
  playable: boolean;
  selection: FreeCellSelection | null;
};

function turnGate(playable: boolean): Pick<SemanticAction, 'disabled' | 'disabledReason'> {
  return {
    disabled: !playable,
    disabledReason: playable ? undefined : 'Wait for your turn',
  };
}

/** Pure pew intents for FreeCell selection destinations (no spam of every legal move). */
export function getFreeCellActions({
  G,
  playable,
  selection,
}: FreeCellActionInput): SemanticAction[] {
  if (!selection) return [];

  const gate = turnGate(playable);
  const actions: SemanticAction[] = [];

  if (selection.source === 'cascade') {
    if (selection.count === 1) {
      const from = G.cascades[selection.col];
      const card = from[from.length - 1];
      if (card && findFoundationIndex(G.foundations, card) >= 0) {
        actions.push({
          id: 'to-foundation',
          kind: 'move',
          label: 'To foundation',
          variant: 'primary',
          ...gate,
          testId: 'freecell-action-to-foundation',
        });
      }
      for (let i = 0; i < G.freecells.length; i++) {
        if (G.freecells[i] !== null) continue;
        actions.push({
          id: `to-freecell-${i}`,
          kind: 'move',
          label: `To freecell ${i + 1}`,
          variant: 'primary',
          ...gate,
          testId: `freecell-action-to-freecell-${i}`,
        });
      }
    }
  } else {
    const card = G.freecells[selection.index];
    if (card && findFoundationIndex(G.foundations, card) >= 0) {
      actions.push({
        id: 'to-foundation',
        kind: 'move',
        label: 'To foundation',
        variant: 'primary',
        ...gate,
        testId: 'freecell-action-to-foundation',
      });
    }
  }

  actions.push({
    id: 'clear',
    kind: 'dismiss',
    label: 'Clear',
    variant: 'secondary',
    ...gate,
    testId: 'freecell-action-clear',
  });

  return actions;
}
