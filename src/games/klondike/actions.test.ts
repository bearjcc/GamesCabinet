import { describe, expect, it } from 'vitest';
import { makeCard } from '../shared/cards';
import { getKlondikeActions } from './actions';
import { emptyKlondike, type KlondikeState, type TableCard } from './game';

function face(card: ReturnType<typeof makeCard>, faceUp = true): TableCard {
  return { ...card, faceUp };
}

function baseG(partial: Partial<KlondikeState> = {}): KlondikeState {
  const G = emptyKlondike();
  return {
    ...G,
    ...partial,
    foundations: partial.foundations ?? G.foundations,
    tableau: partial.tableau ?? G.tableau,
  };
}

describe('getKlondikeActions', () => {
  it('returns no actions when not playable', () => {
    const G = baseG({
      stock: [face(makeCard('spades', '2'))],
    });
    expect(getKlondikeActions({ G, playable: false, selection: null })).toEqual([]);
  });

  it('always includes Draw when stock has cards', () => {
    const G = baseG({
      stock: [face(makeCard('spades', '2'), false)],
    });
    const actions = getKlondikeActions({ G, playable: true, selection: null });
    expect(actions.find((a) => a.id === 'draw')).toMatchObject({
      kind: 'draw',
      label: 'Draw',
      disabled: false,
      testId: 'klondike-action-draw',
      variant: 'primary',
    });
  });

  it('labels draw as Recycle when stock empty and waste non-empty', () => {
    const G = baseG({
      waste: [face(makeCard('hearts', '5'))],
    });
    const actions = getKlondikeActions({ G, playable: true, selection: null });
    expect(actions.find((a) => a.id === 'draw')).toMatchObject({
      kind: 'draw',
      label: 'Recycle',
      disabled: false,
      testId: 'klondike-action-draw',
    });
  });

  it('disables draw when stock and waste are empty with a reason', () => {
    const G = baseG();
    const actions = getKlondikeActions({ G, playable: true, selection: null });
    expect(actions.find((a) => a.id === 'draw')).toMatchObject({
      kind: 'draw',
      label: 'Draw',
      disabled: true,
      disabledReason: 'Stock and waste are empty',
      testId: 'klondike-action-draw',
    });
  });

  it('exposes waste-to-foundation when waste top can place, even without selection', () => {
    const G = baseG({
      waste: [face(makeCard('spades', 'A'))],
    });
    const actions = getKlondikeActions({ G, playable: true, selection: null });
    expect(actions.find((a) => a.id === 'waste-to-foundation')).toMatchObject({
      kind: 'move',
      label: 'Waste to foundation',
      disabled: false,
      testId: 'klondike-action-waste-foundation',
      variant: 'primary',
    });
  });

  it('omits waste-to-foundation when waste cannot place', () => {
    const G = baseG({
      waste: [face(makeCard('spades', '5'))],
      foundations: [[face(makeCard('hearts', 'A'))], [], [], []],
    });
    const actions = getKlondikeActions({ G, playable: true, selection: { source: 'waste' } });
    expect(actions.find((a) => a.id === 'waste-to-foundation')).toBeUndefined();
  });

  it('exposes tableau-to-foundation for selected single top that can place', () => {
    const col = [face(makeCard('clubs', 'K'), false), face(makeCard('diamonds', 'A'))];
    const G = baseG({
      tableau: [col, [], [], [], [], [], []],
    });
    const actions = getKlondikeActions({
      G,
      playable: true,
      selection: { source: 'tableau', col: 0, startIndex: 1, count: 1 },
    });
    expect(actions.find((a) => a.id === 'tableau-to-foundation-0')).toMatchObject({
      kind: 'move',
      label: 'Tableau to foundation',
      disabled: false,
      testId: 'klondike-action-tableau-foundation-0',
      variant: 'primary',
    });
  });

  it('omits tableau-to-foundation when selected top cannot place', () => {
    const col = [face(makeCard('spades', '5'))];
    const G = baseG({
      tableau: [col, [], [], [], [], [], []],
      foundations: [[face(makeCard('hearts', 'A'))], [], [], []],
    });
    const actions = getKlondikeActions({
      G,
      playable: true,
      selection: { source: 'tableau', col: 0, startIndex: 0, count: 1 },
    });
    expect(actions.find((a) => a.id.startsWith('tableau-to-foundation'))).toBeUndefined();
  });

  it('omits tableau-to-foundation when selected column is empty', () => {
    const G = baseG();
    const actions = getKlondikeActions({
      G,
      playable: true,
      selection: { source: 'tableau', col: 0, startIndex: 0, count: 1 },
    });
    expect(actions.find((a) => a.id.startsWith('tableau-to-foundation'))).toBeUndefined();
  });

  it('omits tableau-to-foundation when selected top is face-down', () => {
    const col = [face(makeCard('spades', 'A'), false)];
    const G = baseG({
      tableau: [col, [], [], [], [], [], []],
    });
    const actions = getKlondikeActions({
      G,
      playable: true,
      selection: { source: 'tableau', col: 0, startIndex: 0, count: 1 },
    });
    expect(actions.find((a) => a.id.startsWith('tableau-to-foundation'))).toBeUndefined();
  });

  it('omits tableau-to-foundation when a multi-card run is selected', () => {
    const col = [
      face(makeCard('spades', '3')),
      face(makeCard('hearts', '2')),
      face(makeCard('spades', 'A')),
    ];
    const G = baseG({
      tableau: [col, [], [], [], [], [], []],
    });
    const actions = getKlondikeActions({
      G,
      playable: true,
      selection: { source: 'tableau', col: 0, startIndex: 0, count: 3 },
    });
    expect(actions.find((a) => a.id.startsWith('tableau-to-foundation'))).toBeUndefined();
  });

  it('includes clear dismiss when selection is active', () => {
    const G = baseG({
      waste: [face(makeCard('clubs', '9'))],
    });
    const actions = getKlondikeActions({
      G,
      playable: true,
      selection: { source: 'waste' },
    });
    expect(actions.find((a) => a.id === 'clear')).toMatchObject({
      kind: 'dismiss',
      label: 'Clear',
      disabled: false,
      testId: 'klondike-action-clear',
      variant: 'secondary',
    });
  });

  it('omits clear when there is no selection', () => {
    const G = baseG({
      stock: [face(makeCard('spades', '2'), false)],
    });
    const actions = getKlondikeActions({ G, playable: true, selection: null });
    expect(actions.find((a) => a.id === 'clear')).toBeUndefined();
  });
});
