import { describe, expect, it } from 'vitest';
import { getNineMensMorrisActions } from './actions';
import { type Cell, createInitialState, type NmmState } from './game';

function setupG(partial: Partial<NmmState> = {}): NmmState {
  return { ...createInitialState(), ...partial };
}

describe('getNineMensMorrisActions', () => {
  it('lists place intents for every empty point in place phase', () => {
    const points = Array(24).fill(null) as Cell[];
    points[0] = '1';
    const actions = getNineMensMorrisActions({
      G: setupG({ points, piecesRemainingToPlace: [9, 8] }),
      player: '0',
      yourTurn: true,
    });
    expect(actions).toHaveLength(23);
    expect(actions[0]).toMatchObject({
      id: 'place-1',
      kind: 'move',
      label: 'Place at 1',
      disabled: false,
      testId: 'nmm-action-place-1',
      variant: 'primary',
    });
    expect(actions.map((a) => a.id)).not.toContain('place-0');
  });

  it('lists remove intents while pendingRemoval', () => {
    const points = Array(24).fill(null) as Cell[];
    points[0] = '0';
    points[1] = '0';
    points[2] = '0';
    points[8] = '1';
    points[10] = '1';
    const actions = getNineMensMorrisActions({
      G: setupG({
        points,
        piecesRemainingToPlace: [0, 0],
        phase: 'move',
        pendingRemoval: true,
      }),
      player: '0',
      yourTurn: true,
    });
    expect(actions.map((a) => a.id).sort()).toEqual(['remove-10', 'remove-8']);
    expect(actions.find((a) => a.id === 'remove-8')).toMatchObject({
      kind: 'move',
      testId: 'nmm-action-remove-8',
    });
  });

  it('lists select intents when no piece is selected in move phase', () => {
    const points = Array(24).fill(null) as Cell[];
    points[0] = '0';
    points[4] = '0';
    points[8] = '1';
    points[10] = '1';
    points[12] = '1';
    const actions = getNineMensMorrisActions({
      G: setupG({
        points,
        piecesRemainingToPlace: [0, 0],
        phase: 'move',
        selected: null,
      }),
      player: '0',
      yourTurn: true,
    });
    expect(actions.map((a) => a.id)).toEqual(['select-0', 'select-4']);
    expect(actions[0]).toMatchObject({
      kind: 'select',
      testId: 'nmm-action-select-0',
      variant: 'secondary',
    });
  });

  it('lists move-to intents for the selected piece', () => {
    const points = Array(24).fill(null) as Cell[];
    points[0] = '0';
    points[8] = '1';
    points[10] = '1';
    points[12] = '1';
    const actions = getNineMensMorrisActions({
      G: setupG({
        points,
        piecesRemainingToPlace: [0, 0],
        phase: 'move',
        selected: 0,
      }),
      player: '0',
      yourTurn: true,
    });
    expect(actions.map((a) => a.id).sort()).toEqual(['move-to-1', 'move-to-7']);
    expect(actions.find((a) => a.id === 'move-to-1')).toMatchObject({
      kind: 'move',
      label: 'Move to 1',
      testId: 'nmm-action-to-1',
      variant: 'primary',
    });
  });

  it('disables intents off-turn with a reason', () => {
    const actions = getNineMensMorrisActions({
      G: setupG(),
      player: '0',
      yourTurn: false,
    });
    expect(actions.length).toBeGreaterThan(0);
    for (const action of actions) {
      expect(action.disabled).toBe(true);
      expect(action.disabledReason).toBe('Wait for your turn');
    }
  });
});
