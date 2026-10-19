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
  it('returns no pew intents when legal places exist on the board', () => {
    const G = openingG();
    expect(legalPlaces(G, '0').length).toBeGreaterThan(0);
    expect(getReversiActions({ G, player: '0', yourTurn: true })).toEqual([]);
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
