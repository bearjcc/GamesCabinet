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
    ...overrides,
  };
}

describe('get2048Actions', () => {
  it('returns keep going and try again while win is paused', () => {
    const actions = get2048Actions({
      G: baseG({ won: true, winPaused: true }),
      playable: false,
      gameover: undefined,
    });
    expect(actions.map((a) => a.id)).toEqual(['keep-going', 'try-again']);
    expect(actions[0]).toMatchObject({
      id: 'keep-going',
      kind: 'confirm',
      label: 'Keep going',
      testId: 'g2048-keep-going',
    });
    expect(actions[1]).toMatchObject({
      id: 'try-again',
      kind: 'dismiss',
      label: 'Try again',
      testId: 'g2048-try-again',
    });
  });

  it('returns new game and undo during play', () => {
    const actions = get2048Actions({
      G: baseG({
        history: [{ cells: Array(16).fill(2), score: 4, won: false, winPaused: false }],
      }),
      playable: true,
      gameover: undefined,
    });
    expect(actions.map((a) => a.id)).toEqual(['new-game', 'undo']);
    expect(actions[0]).toMatchObject({
      id: 'new-game',
      label: 'New game',
      testId: 'g2048-new-game',
    });
    expect(actions[1]).toMatchObject({
      id: 'undo',
      kind: 'dismiss',
      label: 'Undo',
      testId: 'g2048-action-undo',
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

  it('disables undo when gameover', () => {
    const [undo] = get2048Actions({
      G: baseG({
        history: [{ cells: Array(16).fill(2), score: 4, won: false, winPaused: false }],
      }),
      playable: false,
      gameover: { score: 4, won: false },
    });
    expect(undo).toMatchObject({
      id: 'undo',
      disabled: true,
      disabledReason: expect.any(String),
    });
  });
});
