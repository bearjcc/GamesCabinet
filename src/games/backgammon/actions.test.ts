import { describe, expect, it } from 'vitest';
import { getBackgammonActions } from './actions';
import { type BackgammonState, createInitialState } from './game';

function emptyPoints(): number[] {
  return Array(25).fill(0);
}

function G(partial: Partial<BackgammonState>): BackgammonState {
  return { ...createInitialState(), ...partial };
}

describe('getBackgammonActions', () => {
  it('offers roll before dice are rolled', () => {
    const actions = getBackgammonActions({
      G: G({ hasRolled: false, dice: [] }),
      player: '0',
      yourTurn: true,
    });
    expect(actions).toEqual([
      expect.objectContaining({
        id: 'roll',
        kind: 'roll',
        label: 'Roll dice',
        disabled: false,
        testId: 'backgammon-roll',
      }),
    ]);
  });

  it('disables roll off-turn', () => {
    const actions = getBackgammonActions({
      G: G({ hasRolled: false, dice: [] }),
      player: '0',
      yourTurn: false,
    });
    expect(actions[0]).toMatchObject({
      id: 'roll',
      disabled: true,
      disabledReason: 'Wait for your turn',
    });
  });

  it('lists legal play intents after rolling', () => {
    const points = emptyPoints();
    points[8] = 1;
    const actions = getBackgammonActions({
      G: G({ points, hasRolled: true, dice: [2] }),
      player: '0',
      yourTurn: true,
    });
    expect(actions.map((a) => a.id)).toEqual(['play-8-0']);
    expect(actions[0]).toMatchObject({
      kind: 'move',
      label: 'point 8 → 6 (2)',
      testId: 'backgammon-play-8-0',
      disabled: false,
    });
  });

  it('offers pass when stuck after rolling', () => {
    const points = emptyPoints();
    points[8] = 1;
    for (let p = 2; p <= 7; p++) points[p] = -2;
    const actions = getBackgammonActions({
      G: G({ points, hasRolled: true, dice: [1, 2] }),
      player: '0',
      yourTurn: true,
    });
    expect(actions).toEqual([
      expect.objectContaining({
        id: 'pass',
        kind: 'dismiss',
        testId: 'backgammon-pass',
        disabled: false,
      }),
    ]);
  });

  it('disables pass and plays off-turn', () => {
    const points = emptyPoints();
    points[8] = 1;
    for (let p = 2; p <= 7; p++) points[p] = -2;
    const pass = getBackgammonActions({
      G: G({ points, hasRolled: true, dice: [1] }),
      player: '0',
      yourTurn: false,
    });
    expect(pass[0]).toMatchObject({
      id: 'pass',
      disabled: true,
      disabledReason: 'Wait for your turn',
    });

    const open = emptyPoints();
    open[8] = 1;
    const plays = getBackgammonActions({
      G: G({ points: open, hasRolled: true, dice: [2] }),
      player: '0',
      yourTurn: false,
    });
    expect(plays[0]).toMatchObject({
      id: 'play-8-0',
      disabled: true,
      disabledReason: 'Wait for your turn',
    });
  });

  it('labels bar entry and bear-off intents', () => {
    const barPts = emptyPoints();
    const barActions = getBackgammonActions({
      G: G({ points: barPts, bar: [1, 0], hasRolled: true, dice: [4] }),
      player: '0',
      yourTurn: true,
    });
    expect(barActions[0]).toMatchObject({
      id: 'play-0-0',
      label: 'bar → 21 (4)',
    });

    const home = emptyPoints();
    home[2] = 1;
    const bear = getBackgammonActions({
      G: G({ points: home, borne: [14, 0], hasRolled: true, dice: [2] }),
      player: '0',
      yourTurn: true,
    });
    expect(bear[0]).toMatchObject({
      id: 'play-2-0',
      label: 'Bear off point 2 (2)',
    });
  });
});
