import { describe, expect, it } from 'vitest';
import { idx } from '../shared/grid';
import { getReversiActions } from './actions';
import { legalPlaces, type ReversiState, SIZE } from './game';

function openingG(): ReversiState {
  const cells = Array(SIZE * SIZE).fill(null) as (string | null)[];
  cells[idx(3, 3, SIZE)] = '0';
  cells[idx(3, 4, SIZE)] = '1';
  cells[idx(4, 3, SIZE)] = '1';
  cells[idx(4, 4, SIZE)] = '0';
  return { cells };
}

function emptyG(): ReversiState {
  return { cells: Array(SIZE * SIZE).fill(null) };
}

describe('getReversiActions', () => {
  it('lists enabled Place intents for each legal square on turn', () => {
    const G = openingG();
    const places = legalPlaces(G, '0');
    expect(places.length).toBeGreaterThan(0);

    const actions = getReversiActions({ G, player: '0', yourTurn: true });
    expect(actions.map((a) => a.id)).toEqual(places.map((i) => `place-${i}`));
    expect(actions[0]).toMatchObject({
      kind: 'move',
      disabled: false,
      variant: 'primary',
      testId: `reversi-action-${places[0]}`,
    });
    expect(actions[0]?.label).toMatch(/^Place at [a-h][1-8]$/);
  });

  it('disables place intents off-turn with a reason', () => {
    const G = openingG();
    const actions = getReversiActions({ G, player: '0', yourTurn: false });
    expect(actions.length).toBeGreaterThan(0);
    for (const action of actions) {
      expect(action.id).toMatch(/^place-\d+$/);
      expect(action.disabled).toBe(true);
      expect(action.disabledReason).toBe('Wait for your turn');
    }
  });

  it('exposes an enabled pass intent when no legal places on turn', () => {
    const actions = getReversiActions({ G: emptyG(), player: '0', yourTurn: true });
    expect(actions).toEqual([
      {
        id: 'pass',
        kind: 'dismiss',
        label: 'Pass',
        variant: 'secondary',
        disabled: false,
        disabledReason: undefined,
        testId: 'reversi-action-pass',
      },
    ]);
  });

  it('disables pass off-turn when no legal places', () => {
    const actions = getReversiActions({ G: emptyG(), player: '0', yourTurn: false });
    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({
      id: 'pass',
      kind: 'dismiss',
      disabled: true,
      disabledReason: 'Wait for your turn',
      testId: 'reversi-action-pass',
    });
  });
});
