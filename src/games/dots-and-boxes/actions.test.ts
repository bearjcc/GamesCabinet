import { describe, expect, it } from 'vitest';
import { getDotsAndBoxesActions } from './actions';
import { allLineKeys, createInitialState, type DotsAndBoxesState, lineKey } from './game';

function baseG(overrides?: Partial<DotsAndBoxesState>): DotsAndBoxesState {
  return { ...createInitialState(), ...overrides };
}

describe('getDotsAndBoxesActions', () => {
  it('lists enabled Claim intents for every open line on turn', () => {
    const G = baseG();
    G.lines[lineKey('h', 0, 0)] = '0';
    const actions = getDotsAndBoxesActions({ G, yourTurn: true });
    expect(actions).toHaveLength(allLineKeys().length - 1);
    expect(actions.map((a) => a.id)).not.toContain('claim-h-0-0');
    expect(actions[0]).toMatchObject({
      kind: 'move',
      disabled: false,
      variant: 'primary',
    });
    expect(actions[0].id.startsWith('claim-')).toBe(true);
    expect(actions[0].testId?.startsWith('dab-action-')).toBe(true);
  });

  it('disables claim intents off-turn with a reason', () => {
    const actions = getDotsAndBoxesActions({ G: baseG(), yourTurn: false });
    expect(actions).toHaveLength(24);
    for (const action of actions) {
      expect(action.disabled).toBe(true);
      expect(action.disabledReason).toBe('Wait for your turn');
    }
  });

  it('omits claimed lines', () => {
    const G = baseG();
    for (const key of allLineKeys()) G.lines[key] = '0';
    const actions = getDotsAndBoxesActions({ G, yourTurn: true });
    expect(actions).toEqual([]);
  });
});
