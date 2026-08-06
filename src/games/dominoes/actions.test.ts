import { describe, expect, it } from 'vitest';
import { getDominoesActions } from './actions';
import type { DominoesState, Tile } from './game';

function tile(a: number, b: number): Tile {
  return { a, b, id: `${a}-${b}` };
}

function baseG(partial: Partial<DominoesState> = {}): DominoesState {
  return {
    hands: [[tile(1, 2)], [tile(3, 4)]],
    boneyard: [tile(5, 6)],
    ends: [{ id: 'e0', value: 6, x: 0, y: 0, dir: 'E' }],
    board: [{ tile: tile(6, 6), x: 0, y: 0, rot: 0 }],
    spinnerId: '6-6',
    ...partial,
  };
}

describe('getDominoesActions', () => {
  it('returns draw and pass intents with stable test ids', () => {
    const actions = getDominoesActions({ G: baseG(), player: 0, yourTurn: true });
    expect(actions.map((a) => a.id)).toEqual(['draw', 'pass']);
    expect(actions.find((a) => a.id === 'draw')).toMatchObject({
      kind: 'draw',
      testId: 'dom-draw',
      label: 'Draw',
    });
    expect(actions.find((a) => a.id === 'pass')).toMatchObject({
      kind: 'dismiss',
      testId: 'dom-pass',
      label: 'Pass',
    });
  });

  it('disables both actions off-turn with a reason', () => {
    const actions = getDominoesActions({ G: baseG(), player: 0, yourTurn: false });
    for (const action of actions) {
      expect(action.disabled).toBe(true);
      expect(action.disabledReason).toBe('Wait for your turn');
    }
  });

  it('disables draw and pass when the hand can already play', () => {
    const G = baseG({
      hands: [[tile(6, 1)], [tile(0, 0)]],
      ends: [{ id: 'e0', value: 6, x: 1, y: 0, dir: 'E' }],
    });
    const actions = getDominoesActions({ G, player: 0, yourTurn: true });
    expect(actions.find((a) => a.id === 'draw')).toMatchObject({
      disabled: true,
      disabledReason: 'You can play a tile',
    });
    expect(actions.find((a) => a.id === 'pass')).toMatchObject({
      disabled: true,
      disabledReason: 'You can play a tile',
    });
  });

  it('enables draw when the boneyard has tiles and nothing is playable', () => {
    const G = baseG({
      hands: [[tile(1, 2)], [tile(3, 4)]],
      boneyard: [tile(0, 0)],
      ends: [{ id: 'e0', value: 6, x: 1, y: 0, dir: 'E' }],
    });
    const actions = getDominoesActions({ G, player: 0, yourTurn: true });
    expect(actions.find((a) => a.id === 'draw')).toMatchObject({ disabled: false });
    expect(actions.find((a) => a.id === 'pass')).toMatchObject({
      disabled: true,
      disabledReason: 'Draw from the boneyard first',
    });
  });

  it('enables pass when the boneyard is empty and nothing is playable', () => {
    const G = baseG({
      hands: [[tile(1, 2)], [tile(3, 4)]],
      boneyard: [],
      ends: [{ id: 'e0', value: 6, x: 1, y: 0, dir: 'E' }],
    });
    const actions = getDominoesActions({ G, player: 0, yourTurn: true });
    expect(actions.find((a) => a.id === 'draw')).toMatchObject({
      disabled: true,
      disabledReason: 'Boneyard is empty',
    });
    expect(actions.find((a) => a.id === 'pass')).toMatchObject({ disabled: false });
  });
});
