import { describe, expect, it } from 'vitest';
import { get2048Actions } from './actions';
import type { Game2048State } from './game';

function baseG(overrides: Partial<Game2048State> = {}): Game2048State {
  return {
    cells: Array(16).fill(null),
    score: 0,
    won: false,
    winPaused: false,
    history: [],
    future: [],
    ...overrides,
  };
}

describe('get2048Actions', () => {
  it('returns keep going and try again when win paused', () => {
    const actions = get2048Actions({
      G: baseG({ winPaused: true }),
      playable: false,
      gameover: undefined,
    });
    expect(actions.map((a) => a.id)).toEqual(['keep-going', 'try-again']);
    expect(actions[0]).toMatchObject({
      label: 'Keep going',
      testId: 'g2048-keep-going',
    });
    expect(actions[1]).toMatchObject({
      label: 'Try again',
      testId: 'g2048-try-again',
    });
  });

  it('returns new game, undo, and redo during play', () => {
    const actions = get2048Actions({
      G: baseG({
        history: [{ cells: Array(16).fill(2), score: 4, won: false, winPaused: false }],
        future: [{ cells: Array(16).fill(4), score: 8, won: false, winPaused: false }],
      }),
      playable: true,
      gameover: undefined,
    });
    expect(actions.map((a) => a.id)).toEqual(['new-game', 'undo', 'redo']);
    expect(actions[1]).toMatchObject({
      id: 'undo',
      label: 'Undo',
      testId: 'g2048-action-undo',
      disabled: false,
    });
    expect(actions[2]).toMatchObject({
      id: 'redo',
      label: 'Redo',
      testId: 'g2048-action-redo',
      disabled: false,
    });
  });

  it('disables undo when history is empty', () => {
    const [, undo] = get2048Actions({
      G: baseG({ history: [] }),
      playable: true,
      gameover: undefined,
    });
    expect(undo).toMatchObject({
      id: 'undo',
      disabled: true,
      disabledReason: expect.any(String),
    });
    expect(undo.disabledReason?.length).toBeGreaterThan(0);
  });

  it('disables redo when future is empty', () => {
    const [, , redo] = get2048Actions({
      G: baseG({ future: [] }),
      playable: true,
      gameover: undefined,
    });
    expect(redo).toMatchObject({
      id: 'redo',
      disabled: true,
      disabledReason: expect.any(String),
    });
  });

  it('disables undo and redo when gameover', () => {
    const [undo, redo] = get2048Actions({
      G: baseG({
        history: [{ cells: Array(16).fill(2), score: 4, won: false, winPaused: false }],
        future: [{ cells: Array(16).fill(4), score: 8, won: false, winPaused: false }],
      }),
      playable: false,
      gameover: { score: 4, won: false },
    });
    expect(undo).toMatchObject({ disabled: true });
    expect(redo).toMatchObject({ disabled: true });
  });
});
