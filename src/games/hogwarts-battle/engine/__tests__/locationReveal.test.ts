/**
 * G2: Location cards can declare on_reveal effects that fire when revealed.
 * Uses a mocked location definition since no shipped location data uses the
 * field yet (the FAQ confirms printed Year 4/5 locations have reveal effects).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../dataManager', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../dataManager')>();
  return {
    ...actual,
    getLocation: (id: string) =>
      id === 'testloc'
        ? {
            id: 'testloc',
            name: 'Test Location',
            image: '',
            max_control: 3,
            on_reveal: [{ type: 'deal_damage', params: { amount: 1, target: 'all_players' } }],
          }
        : actual.getLocation(id),
  };
});

import { revealNextLocation } from '../turnLogic';
import { buildTestState } from './helpers/testGameState';

describe('FAQ G2: location on_reveal effects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fires on_reveal effects when the location is revealed', () => {
    const state = buildTestState(7, ['harry', 'ron']);
    state.locationDeck = ['testloc'];

    revealNextLocation(state);

    expect(state.currentLocation?.locationId).toBe('testloc');
    expect(state.players.harry!.health).toBe(9);
    expect(state.players.ron!.health).toBe(9);
  });

  it('locations without on_reveal effects reveal normally', () => {
    const state = buildTestState(7, ['harry', 'ron']);
    state.locationDeck = ['greathall'];

    revealNextLocation(state);

    expect(state.currentLocation?.locationId).toBe('greathall');
    expect(state.players.harry!.health).toBe(10);
    expect(state.players.ron!.health).toBe(10);
  });
});
