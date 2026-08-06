import type { SemanticAction } from '../../lib/actions';
import { findFoundationIndex, type KlondikeState } from './game';

export type KlondikeSelection =
  | null
  | { source: 'waste' }
  | { source: 'tableau'; col: number; startIndex: number; count: number };

export type KlondikeActionInput = {
  G: KlondikeState;
  playable: boolean;
  selection?: KlondikeSelection;
};

/** Pure pew intents for Klondike draw, foundation shortcuts, and dismiss. */
export function getKlondikeActions({
  G,
  playable,
  selection = null,
}: KlondikeActionInput): SemanticAction[] {
  if (!playable) return [];

  const actions: SemanticAction[] = [];
  const stockEmpty = G.stock.length === 0;
  const wasteEmpty = G.waste.length === 0;
  const canDrawOrRecycle = !stockEmpty || !wasteEmpty;

  actions.push({
    id: 'draw',
    kind: 'draw',
    label: stockEmpty && !wasteEmpty ? 'Recycle' : 'Draw',
    variant: 'primary',
    disabled: !canDrawOrRecycle,
    disabledReason: canDrawOrRecycle ? undefined : 'Stock and waste are empty',
    testId: 'klondike-action-draw',
  });

  const wasteTop = G.waste[G.waste.length - 1];
  if (wasteTop && findFoundationIndex(G.foundations, wasteTop) >= 0) {
    actions.push({
      id: 'waste-to-foundation',
      kind: 'move',
      label: 'Waste to foundation',
      variant: 'primary',
      disabled: false,
      testId: 'klondike-action-waste-foundation',
    });
  }

  if (selection?.source === 'tableau' && selection.count === 1) {
    const col = selection.col;
    const column = G.tableau[col];
    const top = column[column.length - 1];
    if (top?.faceUp && findFoundationIndex(G.foundations, top) >= 0) {
      actions.push({
        id: `tableau-to-foundation-${col}`,
        kind: 'move',
        label: 'Tableau to foundation',
        variant: 'primary',
        disabled: false,
        testId: `klondike-action-tableau-foundation-${col}`,
      });
    }
  }

  if (selection) {
    actions.push({
      id: 'clear',
      kind: 'dismiss',
      label: 'Clear',
      variant: 'secondary',
      disabled: false,
      testId: 'klondike-action-clear',
    });
  }

  return actions;
}
