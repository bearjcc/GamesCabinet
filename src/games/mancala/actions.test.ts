import { describe, expect, it } from 'vitest';
import { getMancalaActions } from './actions';
import { createInitialPits, type MancalaState } from './game';

function baseG(pits?: number[]): MancalaState {
  return { pits: pits ?? createInitialPits() };
}

describe('getMancalaActions', () => {
  it('lists enabled Sow intents for every non-empty own pit on turn', () => {
    const pits = createInitialPits();
    pits[1] = 0;
    pits[4] = 0;
    const actions = getMancalaActions({ G: baseG(pits), player: '0', yourTurn: true });
    expect(actions.map((a) => a.id)).toEqual(['sow-0', 'sow-2', 'sow-3', 'sow-5']);
    expect(actions[0]).toMatchObject({
      kind: 'move',
      label: 'Sow pit 0',
      disabled: false,
      testId: 'mancala-action-0',
      variant: 'primary',
    });
  });

  it('lists player 1 own pits', () => {
    const actions = getMancalaActions({ G: baseG(), player: '1', yourTurn: true });
    expect(actions.map((a) => a.id)).toEqual([
      'sow-7',
      'sow-8',
      'sow-9',
      'sow-10',
      'sow-11',
      'sow-12',
    ]);
    expect(actions[0]).toMatchObject({
      kind: 'move',
      testId: 'mancala-action-7',
    });
  });

  it('disables sow intents off-turn with a reason', () => {
    const actions = getMancalaActions({ G: baseG(), player: '0', yourTurn: false });
    expect(actions).toHaveLength(6);
    for (const action of actions) {
      expect(action.disabled).toBe(true);
      expect(action.disabledReason).toBe('Wait for your turn');
    }
  });

  it('omits empty own pits', () => {
    const pits = createInitialPits();
    for (const pit of [0, 1, 2, 3, 4, 5]) pits[pit] = 0;
    const actions = getMancalaActions({ G: baseG(pits), player: '0', yourTurn: true });
    expect(actions).toEqual([]);
  });
});
