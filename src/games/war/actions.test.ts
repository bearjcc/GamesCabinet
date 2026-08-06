import { describe, expect, it } from 'vitest';
import { makeCard } from '../shared/cards';
import { getWarActions } from './actions';
import { createEmptyWarState } from './game';

describe('getWarActions', () => {
  it('exposes an enabled Fight intent on turn with war-action-play test id', () => {
    const actions = getWarActions({
      G: createEmptyWarState({
        decks: [[makeCard('hearts', 'A')], [makeCard('spades', '2')]],
      }),
      yourTurn: true,
    });
    expect(actions).toEqual([
      expect.objectContaining({
        id: 'play',
        kind: 'confirm',
        label: 'Fight',
        testId: 'war-action-play',
        disabled: false,
      }),
    ]);
  });

  it('disables Fight off-turn', () => {
    const [play] = getWarActions({
      G: createEmptyWarState({
        decks: [[makeCard('hearts', 'A')], [makeCard('spades', '2')]],
      }),
      yourTurn: false,
    });
    expect(play).toMatchObject({
      disabled: true,
      disabledReason: 'Wait for your turn',
    });
  });

  it('disables Fight when a deck is empty', () => {
    const [play] = getWarActions({
      G: createEmptyWarState({
        decks: [[makeCard('hearts', 'A')], []],
      }),
      yourTurn: true,
    });
    expect(play).toMatchObject({
      disabled: true,
      disabledReason: 'No cards left to fight',
    });
  });
});
