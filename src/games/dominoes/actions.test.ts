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

  it('lists Play on end N intents for the selected playable tile', () => {
    const G = baseG({
      hands: [[tile(6, 1)], [tile(0, 0)]],
      ends: [
        { id: 'e0', value: 6, x: 1, y: 0, dir: 'E' },
        { id: 'e1', value: 3, x: -1, y: 0, dir: 'W' },
      ],
    });
    const actions = getDominoesActions({
      G,
      player: 0,
      yourTurn: true,
      handIndex: 0,
    });
    expect(actions.find((a) => a.id === 'play-end-0')).toMatchObject({
      kind: 'move',
      label: 'Play on end 0',
      disabled: false,
      testId: 'dom-play-end-0',
      variant: 'primary',
    });
    expect(actions.find((a) => a.id === 'play-end-1')).toBeUndefined();
    expect(actions.map((a) => a.id).slice(0, 1)).toEqual(['play-end-0']);
  });

  it('lists a Play starter intent when the board is empty and a tile is selected', () => {
    const G = baseG({
      hands: [[tile(3, 4)], [tile(0, 0)]],
      board: [],
      ends: [],
      spinnerId: null,
    });
    const actions = getDominoesActions({
      G,
      player: 0,
      yourTurn: true,
      handIndex: 0,
    });
    expect(actions.find((a) => a.id === 'play-starter')).toMatchObject({
      kind: 'move',
      label: 'Play starter',
      disabled: false,
      testId: 'dom-play-starter',
      variant: 'primary',
    });
    expect(actions.some((a) => a.id.startsWith('play-end-'))).toBe(false);
  });

  it('omits play intents when no hand tile is selected', () => {
    const G = baseG({
      hands: [[tile(6, 1)], [tile(0, 0)]],
      ends: [{ id: 'e0', value: 6, x: 1, y: 0, dir: 'E' }],
    });
    const actions = getDominoesActions({ G, player: 0, yourTurn: true, handIndex: null });
    expect(actions.some((a) => a.id.startsWith('play-'))).toBe(false);
  });

  it('omits play intents off-turn even with a selected tile', () => {
    const G = baseG({
      hands: [[tile(6, 1)], [tile(0, 0)]],
      ends: [{ id: 'e0', value: 6, x: 1, y: 0, dir: 'E' }],
    });
    const actions = getDominoesActions({
      G,
      player: 0,
      yourTurn: false,
      handIndex: 0,
    });
    expect(actions.some((a) => a.id.startsWith('play-'))).toBe(false);
  });

  it('omits play intents when the selected hand index is missing', () => {
    const G = baseG({
      hands: [[tile(6, 1)], [tile(0, 0)]],
      ends: [{ id: 'e0', value: 6, x: 1, y: 0, dir: 'E' }],
    });
    const actions = getDominoesActions({
      G,
      player: 0,
      yourTurn: true,
      handIndex: 9,
    });
    expect(actions.some((a) => a.id.startsWith('play-'))).toBe(false);
  });

  it('lists every playable end for a double that matches both arms', () => {
    const G = baseG({
      hands: [[tile(6, 6)], [tile(0, 0)]],
      ends: [
        { id: 'e0', value: 6, x: 1, y: 0, dir: 'E' },
        { id: 'e1', value: 6, x: -1, y: 0, dir: 'W' },
      ],
    });
    const actions = getDominoesActions({
      G,
      player: 0,
      yourTurn: true,
      handIndex: 0,
    });
    expect(actions.filter((a) => a.id.startsWith('play-end-')).map((a) => a.id)).toEqual([
      'play-end-0',
      'play-end-1',
    ]);
  });
});
