import { describe, expect, it } from 'vitest';
import { getNimActions } from './actions';
import type { NimState } from './game';

function baseG(heap = 13): NimState {
  return { heap };
}

describe('getNimActions', () => {
  it('offers Take 1 / Take 2 / Take 3 on your turn when heap allows', () => {
    const actions = getNimActions({ G: baseG(5), yourTurn: true });
    expect(actions).toEqual([
      expect.objectContaining({
        id: 'take-1',
        kind: 'move',
        label: 'Take 1',
        variant: 'primary',
        disabled: false,
        testId: 'nim-action-take-1',
      }),
      expect.objectContaining({
        id: 'take-2',
        label: 'Take 2',
        disabled: false,
        testId: 'nim-action-take-2',
      }),
      expect.objectContaining({
        id: 'take-3',
        label: 'Take 3',
        disabled: false,
        testId: 'nim-action-take-3',
      }),
    ]);
  });

  it('disables takes that exceed the heap with a reason', () => {
    const actions = getNimActions({ G: baseG(2), yourTurn: true });
    expect(actions[0]).toMatchObject({ id: 'take-1', disabled: false });
    expect(actions[1]).toMatchObject({ id: 'take-2', disabled: false });
    expect(actions[2]).toMatchObject({
      id: 'take-3',
      disabled: true,
      disabledReason: 'Only 2 stones left',
      testId: 'nim-action-take-3',
    });
  });

  it('uses singular copy when one stone remains', () => {
    const actions = getNimActions({ G: baseG(1), yourTurn: true });
    expect(actions[0]).toMatchObject({ id: 'take-1', disabled: false });
    expect(actions[1]).toMatchObject({
      id: 'take-2',
      disabled: true,
      disabledReason: 'Only 1 stone left',
    });
  });

  it('disables all takes off-turn with a reason', () => {
    const actions = getNimActions({ G: baseG(13), yourTurn: false });
    expect(actions).toHaveLength(3);
    for (const action of actions) {
      expect(action.disabled).toBe(true);
      expect(action.disabledReason).toBe('Wait for your turn');
    }
  });

  it('prefers off-turn reason over heap-exceeded when both apply', () => {
    const actions = getNimActions({ G: baseG(1), yourTurn: false });
    expect(actions[2]).toMatchObject({
      id: 'take-3',
      disabled: true,
      disabledReason: 'Wait for your turn',
    });
  });
});
