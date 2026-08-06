import { describe, expect, it } from 'vitest';
import { get2048Actions } from './actions';
import type { Game2048State } from './game';

function baseG(overrides: Partial<Game2048State> = {}): Game2048State {
  return {
    cells: Array(16).fill(null),
    score: 0,
    won: false,
    history: [],
    ...overrides,
  };
}

describe('get2048Actions', () => {
  it('returns four swipe move intents and undo', () => {
    const actions = get2048Actions({
      G: baseG({
        history: [{ cells: Array(16).fill(2), score: 4, won: false }],
      }),
      playable: true,
      gameover: undefined,
    });
    expect(actions.map((a) => a.id)).toEqual([
      'swipe-up',
      'swipe-down',
      'swipe-left',
      'swipe-right',
      'undo',
    ]);
    expect(actions.slice(0, 4)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'swipe-up',
          kind: 'move',
          label: 'Up',
          testId: 'g2048-action-up',
          disabled: false,
        }),
        expect.objectContaining({
          id: 'swipe-down',
          kind: 'move',
          label: 'Down',
          testId: 'g2048-action-down',
          disabled: false,
        }),
        expect.objectContaining({
          id: 'swipe-left',
          kind: 'move',
          label: 'Left',
          testId: 'g2048-action-left',
          disabled: false,
        }),
        expect.objectContaining({
          id: 'swipe-right',
          kind: 'move',
          label: 'Right',
          testId: 'g2048-action-right',
          disabled: false,
        }),
      ]),
    );
    expect(actions[4]).toMatchObject({
      id: 'undo',
      kind: 'dismiss',
      label: 'Undo',
      testId: 'g2048-action-undo',
      disabled: false,
    });
  });

  it('disables swipes when not playable', () => {
    const actions = get2048Actions({
      G: baseG(),
      playable: false,
      gameover: { score: 0, won: false },
    });
    for (const swipe of actions.slice(0, 4)) {
      expect(swipe).toMatchObject({
        disabled: true,
        disabledReason: expect.any(String),
      });
      expect(swipe.disabledReason?.length).toBeGreaterThan(0);
    }
  });

  it('disables undo when history is empty', () => {
    const [, , , , undo] = get2048Actions({
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
    const [, , , , undo] = get2048Actions({
      G: baseG({
        history: [{ cells: Array(16).fill(2), score: 4, won: false }],
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
