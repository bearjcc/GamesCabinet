import { describe, expect, it } from 'vitest';
import { getBattleshipActions } from './actions';
import { type BattleshipState, type PlayerBoard, SIZE } from './game';

function board(partial?: Partial<PlayerBoard>): PlayerBoard {
  return {
    ships: [],
    shots: Array(SIZE * SIZE).fill(null),
    ready: false,
    ...partial,
  };
}

function emptyG(): BattleshipState {
  return { boards: { '0': board(), '1': board() } };
}

describe('getBattleshipActions', () => {
  it('exposes rotate and disabled Ready during setup before fleet is placed', () => {
    const actions = getBattleshipActions({
      G: emptyG(),
      player: '0',
      yourTurn: true,
      phase: 'setup',
      orientation: 'H',
    });
    expect(actions.map((a) => a.id)).toEqual(['rotate', 'confirmSetup']);
    expect(actions[0]).toMatchObject({
      testId: 'battleship-action-rotate',
      disabled: false,
      label: 'Orient: horizontal',
    });
    expect(actions[1]).toMatchObject({
      testId: 'battleship-action-ready',
      disabled: true,
      disabledReason: 'Place all ships first',
    });
  });

  it('enables Ready when all ships are placed', () => {
    const G = emptyG();
    G.boards['0'] = board({
      ships: [0, 1, 2, 3, 4].map((id) => ({ id, cells: [id], sunk: false })),
    });
    const actions = getBattleshipActions({
      G,
      player: '0',
      yourTurn: true,
      phase: 'setup',
      orientation: 'V',
    });
    expect(actions.find((a) => a.id === 'confirmSetup')).toMatchObject({
      disabled: false,
      label: 'Ready',
    });
    expect(actions.find((a) => a.id === 'rotate')?.label).toBe('Orient: vertical');
  });

  it('returns no battle pew intents (fire via board)', () => {
    const actions = getBattleshipActions({
      G: emptyG(),
      player: '0',
      yourTurn: true,
      phase: 'battle',
      orientation: 'H',
    });
    expect(actions).toEqual([]);
  });

  it('disables setup actions off-turn and when already ready', () => {
    const offTurn = getBattleshipActions({
      G: emptyG(),
      player: '0',
      yourTurn: false,
      phase: 'setup',
      orientation: 'H',
    });
    expect(offTurn.find((a) => a.id === 'rotate')).toMatchObject({
      disabled: true,
      disabledReason: 'Wait for your turn',
    });
    expect(offTurn.find((a) => a.id === 'confirmSetup')).toMatchObject({
      disabled: true,
      disabledReason: 'Place all ships first',
    });

    const G = emptyG();
    G.boards['0'] = board({
      ready: true,
      ships: [0, 1, 2, 3, 4].map((id) => ({ id, cells: [id], sunk: false })),
    });
    const ready = getBattleshipActions({
      G,
      player: '0',
      yourTurn: true,
      phase: 'setup',
      orientation: 'H',
    });
    expect(ready.find((a) => a.id === 'rotate')).toMatchObject({
      disabled: true,
      disabledReason: 'Fleet ready',
    });
    expect(ready.find((a) => a.id === 'confirmSetup')).toMatchObject({
      disabled: true,
      disabledReason: 'Already ready',
    });

    // All-placed path with off-turn Ready reason
    const G2 = emptyG();
    G2.boards['0'] = board({
      ships: [0, 1, 2, 3, 4].map((id) => ({ id, cells: [id], sunk: false })),
    });
    const readyOff = getBattleshipActions({
      G: G2,
      player: '0',
      yourTurn: false,
      phase: 'setup',
      orientation: 'H',
    });
    expect(readyOff.find((a) => a.id === 'confirmSetup')).toMatchObject({
      disabled: true,
      disabledReason: 'Wait for your turn',
    });

    const missingBoard = getBattleshipActions({
      G: emptyG(),
      player: '9',
      yourTurn: true,
      phase: 'setup',
      orientation: 'H',
    });
    expect(missingBoard.find((a) => a.id === 'confirmSetup')).toMatchObject({
      disabled: true,
      disabledReason: 'Place all ships first',
    });
  });
});
