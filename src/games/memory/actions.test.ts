import { describe, expect, it } from 'vitest';
import { getMemoryActions } from './actions';
import type { MemoryCard, MemoryState } from './game';

function card(pairId: number, faceUp = false): MemoryCard {
  return { pairId, faceUp };
}

function baseG(cards: MemoryCard[]): MemoryState {
  return { cards, scores: [0, 0], firstFlip: null };
}

describe('getMemoryActions', () => {
  it('lists enabled Flip card intents for every face-down card on turn', () => {
    const G = baseG([
      card(0, true),
      card(0, false),
      card(1, false),
      card(1, true),
      card(2, false),
      card(2, false),
      card(3, true),
      card(3, true),
      card(4, false),
      card(4, false),
      card(5, false),
      card(5, false),
      card(6, false),
      card(6, false),
      card(7, false),
      card(7, false),
    ]);
    const actions = getMemoryActions({ G, yourTurn: true });
    expect(actions.map((a) => a.id)).toEqual([
      'flip-1',
      'flip-2',
      'flip-4',
      'flip-5',
      'flip-8',
      'flip-9',
      'flip-10',
      'flip-11',
      'flip-12',
      'flip-13',
      'flip-14',
      'flip-15',
    ]);
    expect(actions[0]).toMatchObject({
      kind: 'move',
      label: 'Flip card 2',
      disabled: false,
      testId: 'memory-action-1',
      variant: 'primary',
    });
  });

  it('disables face-down intents off-turn with a reason', () => {
    const G = baseG([
      card(0, false),
      card(0, true),
      ...Array.from({ length: 14 }, (_, i) => card(Math.floor((i + 2) / 2), false)),
    ]);
    const actions = getMemoryActions({ G, yourTurn: false });
    expect(actions.map((a) => a.id)).toContain('flip-0');
    expect(actions.map((a) => a.id)).not.toContain('flip-1');
    for (const action of actions) {
      expect(action.disabled).toBe(true);
      expect(action.disabledReason).toBe('Wait for your turn');
    }
  });

  it('returns empty when all cards are face-up', () => {
    const G = baseG(Array.from({ length: 16 }, (_, i) => card(Math.floor(i / 2), true)));
    const actions = getMemoryActions({ G, yourTurn: true });
    expect(actions).toEqual([]);
  });
});
