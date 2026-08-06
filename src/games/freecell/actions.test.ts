import { describe, expect, it } from 'vitest';
import { makeCard } from '../shared/cards';
import { getFreeCellActions } from './actions';
import { emptyFreeCell, type FreeCellState } from './game';

function baseG(patch?: (G: FreeCellState) => void): FreeCellState {
  const G = emptyFreeCell();
  patch?.(G);
  return G;
}

describe('getFreeCellActions', () => {
  it('returns empty when nothing is selected', () => {
    const G = baseG((g) => {
      g.cascades[0] = [makeCard('hearts', 'A')];
      g.freecells[0] = null;
    });
    expect(getFreeCellActions({ G, playable: true, selection: null })).toEqual([]);
  });

  it('offers to-foundation, empty freecells, and clear for a single cascade card', () => {
    const G = baseG((g) => {
      g.cascades[0] = [makeCard('spades', 'A')];
      g.freecells = [null, makeCard('hearts', '2'), null, null];
    });
    const actions = getFreeCellActions({
      G,
      playable: true,
      selection: { source: 'cascade', col: 0, startIndex: 0, count: 1 },
    });
    expect(actions.map((a) => a.id)).toEqual([
      'to-foundation',
      'to-freecell-0',
      'to-freecell-2',
      'to-freecell-3',
      'clear',
    ]);
    expect(actions[0]).toMatchObject({
      kind: 'move',
      label: 'To foundation',
      disabled: false,
      testId: 'freecell-action-to-foundation',
      variant: 'primary',
    });
    expect(actions[1]).toMatchObject({
      kind: 'move',
      id: 'to-freecell-0',
      testId: 'freecell-action-to-freecell-0',
      variant: 'primary',
    });
    expect(actions.at(-1)).toMatchObject({
      kind: 'dismiss',
      id: 'clear',
      label: 'Clear',
      testId: 'freecell-action-clear',
      variant: 'secondary',
    });
  });

  it('omits to-foundation when cascade card cannot place', () => {
    const G = baseG((g) => {
      g.cascades[0] = [makeCard('hearts', '5')];
      g.foundations[0] = [makeCard('spades', 'A')];
    });
    const actions = getFreeCellActions({
      G,
      playable: true,
      selection: { source: 'cascade', col: 0, startIndex: 0, count: 1 },
    });
    expect(actions.map((a) => a.id)).toEqual([
      'to-freecell-0',
      'to-freecell-1',
      'to-freecell-2',
      'to-freecell-3',
      'clear',
    ]);
  });

  it('only offers clear for a multi-card cascade selection', () => {
    const G = baseG((g) => {
      g.cascades[0] = [makeCard('spades', '3'), makeCard('hearts', '2')];
      g.freecells = [null, null, null, null];
    });
    const actions = getFreeCellActions({
      G,
      playable: true,
      selection: { source: 'cascade', col: 0, startIndex: 0, count: 2 },
    });
    expect(actions.map((a) => a.id)).toEqual(['clear']);
  });

  it('offers to-foundation and clear for a freecell selection when legal', () => {
    const G = baseG((g) => {
      g.freecells[1] = makeCard('clubs', 'A');
    });
    const actions = getFreeCellActions({
      G,
      playable: true,
      selection: { source: 'freecell', index: 1 },
    });
    expect(actions.map((a) => a.id)).toEqual(['to-foundation', 'clear']);
    expect(actions[0]).toMatchObject({
      kind: 'move',
      testId: 'freecell-action-to-foundation',
    });
  });

  it('offers only clear for freecell when foundation is illegal', () => {
    const G = baseG((g) => {
      g.freecells[0] = makeCard('hearts', 'K');
      g.foundations[0] = [makeCard('spades', 'A')];
    });
    const actions = getFreeCellActions({
      G,
      playable: true,
      selection: { source: 'freecell', index: 0 },
    });
    expect(actions.map((a) => a.id)).toEqual(['clear']);
  });

  it('disables intents when not playable with a reason', () => {
    const G = baseG((g) => {
      g.cascades[0] = [makeCard('diamonds', 'A')];
    });
    const actions = getFreeCellActions({
      G,
      playable: false,
      selection: { source: 'cascade', col: 0, startIndex: 0, count: 1 },
    });
    expect(actions.length).toBeGreaterThan(0);
    for (const action of actions) {
      expect(action.disabled).toBe(true);
      expect(action.disabledReason).toBe('Wait for your turn');
    }
  });
});
