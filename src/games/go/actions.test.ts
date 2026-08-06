import { describe, expect, it } from 'vitest';
import { getGoActions } from './actions';
import { type GoState, legalPlaces, SIZE } from './game';

function emptyG(overrides: Partial<GoState> = {}): GoState {
  return {
    cells: Array(SIZE * SIZE).fill(null) as (string | null)[],
    captures: [0, 0],
    koPoint: null,
    lastPass: false,
    consecutivePasses: 0,
    ...overrides,
  };
}

describe('getGoActions', () => {
  it('lists Place intents for each legal square plus Pass on turn', () => {
    const G = emptyG();
    const places = legalPlaces(G, '0');
    expect(places.length).toBeGreaterThan(0);

    const actions = getGoActions({ G, player: '0', yourTurn: true });
    expect(actions.map((a) => a.id)).toEqual([...places.map((i) => `place-${i}`), 'pass']);

    const place = actions[0];
    expect(place).toMatchObject({
      kind: 'move',
      disabled: false,
      variant: 'primary',
      testId: `go-action-${places[0]}`,
    });
    expect(place?.label).toMatch(/^Place at [a-i][1-9]$/);

    const pass = actions[actions.length - 1];
    expect(pass).toMatchObject({
      id: 'pass',
      kind: 'dismiss',
      label: 'Pass',
      variant: 'secondary',
      disabled: false,
      disabledReason: undefined,
      testId: 'go-action-pass',
    });
  });

  it('disables place and pass intents off-turn with a reason', () => {
    const G = emptyG();
    const actions = getGoActions({ G, player: '0', yourTurn: false });
    expect(actions.length).toBeGreaterThan(1);
    for (const action of actions) {
      expect(action.disabled).toBe(true);
      expect(action.disabledReason).toBe('Wait for your turn');
    }
  });

  it('still exposes Pass when the board has no legal places', () => {
    // Fill board so nowhere is empty (illegal to place).
    const cells = Array(SIZE * SIZE).fill('1') as (string | null)[];
    const actions = getGoActions({
      G: emptyG({ cells }),
      player: '0',
      yourTurn: true,
    });
    expect(legalPlaces(emptyG({ cells }), '0')).toEqual([]);
    expect(actions).toEqual([
      {
        id: 'pass',
        kind: 'dismiss',
        label: 'Pass',
        variant: 'secondary',
        disabled: false,
        disabledReason: undefined,
        testId: 'go-action-pass',
      },
    ]);
  });
});
