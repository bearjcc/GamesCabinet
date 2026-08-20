/**
 * Tests for recently fixed rule adherence bugs.
 *
 * Section 1: Attack-Per-Villain-Per-Turn Limit
 * Section 2: Detention Safe Discard
 * Section 3: Patronus Protect
 * Section 4: Play Before Dark Arts
 */
import { describe, expect, it } from 'vitest';
import { fireOnDiscardEffect, resolveEffect } from '../effectResolver';
import { resetTurnCounters, stunPlayer } from '../gameState';
import {
  attackVillainWithAmount,
  executeVillainPhase,
  executeVillainPhaseBeforeDarkArts,
} from '../turnLogic';
import { addActiveVillain, addCardToHand, buildTestState } from './helpers/testGameState';

// ---------------------------------------------------------------------------
// Section 1: Attack-Per-Villain-Per-Turn Limit
// ---------------------------------------------------------------------------

describe('Attack-Per-Villain-Per-Turn Limit', () => {
  it('allows attacking a villain once per turn', () => {
    const state = buildTestState();
    addActiveVillain(state, 'dracomalfoy', 6);
    state.players.harry!.attackTokens = 3;

    const result = attackVillainWithAmount(state, 'harry', 0, 2);
    expect(result).toBe(true);
    expect(state.activeVillains[0]!.currentHp).toBe(4);
    expect(state.players.harry!.attackTokens).toBe(1);
    expect(state.players.harry!.villainsAttackedThisTurn.dracomalfoy).toBe(1);
  });

  it('rejects attacking the same villain again in the same turn', () => {
    const state = buildTestState();
    addActiveVillain(state, 'dracomalfoy', 6);
    state.players.harry!.attackTokens = 5;

    const first = attackVillainWithAmount(state, 'harry', 0, 2);
    expect(first).toBe(true);

    // Second attack on the same villain should be rejected
    const second = attackVillainWithAmount(state, 'harry', 0, 2);
    expect(second).toBe(false);
    // HP should not have changed from the second attempt
    expect(state.activeVillains[0]!.currentHp).toBe(4);
  });

  it('allows attacking different villains each once per turn', () => {
    const state = buildTestState();
    addActiveVillain(state, 'dracomalfoy', 6);
    addActiveVillain(state, 'quirrell', 6);
    state.players.harry!.attackTokens = 6;

    const first = attackVillainWithAmount(state, 'harry', 0, 2);
    expect(first).toBe(true);

    // Attacking a different villain should succeed
    const second = attackVillainWithAmount(state, 'harry', 1, 2);
    expect(second).toBe(true);

    expect(state.activeVillains[0]!.currentHp).toBe(4);
    expect(state.activeVillains[1]!.currentHp).toBe(4);
    expect(state.players.harry!.attackTokens).toBe(2);
  });

  it('allows re-attacking the same villain when bypassAttackLimit is true', () => {
    const state = buildTestState();
    addActiveVillain(state, 'dracomalfoy', 6);
    state.players.harry!.attackTokens = 6;

    const first = attackVillainWithAmount(state, 'harry', 0, 2, false);
    expect(first).toBe(true);

    // Normal re-attack should fail
    const second = attackVillainWithAmount(state, 'harry', 0, 2, false);
    expect(second).toBe(false);

    // Bypass attack limit should succeed
    const third = attackVillainWithAmount(state, 'harry', 0, 2, true);
    expect(third).toBe(true);

    expect(state.activeVillains[0]!.currentHp).toBe(2);
  });

  it('resets the attack counter at the start of a new turn', () => {
    const state = buildTestState();
    addActiveVillain(state, 'dracomalfoy', 6);
    state.players.harry!.attackTokens = 5;

    // Attack once
    attackVillainWithAmount(state, 'harry', 0, 2);
    expect(state.players.harry!.villainsAttackedThisTurn.dracomalfoy).toBe(1);

    // Second attack should fail
    const second = attackVillainWithAmount(state, 'harry', 0, 2);
    expect(second).toBe(false);

    // Simulate new turn: reset counters
    resetTurnCounters(state);
    state.players.harry!.attackTokens = 5;

    // After reset, attacking the same villain should succeed again
    const afterReset = attackVillainWithAmount(state, 'harry', 0, 2);
    expect(afterReset).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Section 2: Detention Safe Discard
// ---------------------------------------------------------------------------

describe('Detention Safe Discard', () => {
  it('skips detention card on_discard_effect during cleanup discard', () => {
    const state = buildTestState();
    const instanceId = addCardToHand(state, 'harry', 'detention');
    state.players.harry!.health = 10;

    // Fire on-discard as cleanup
    fireOnDiscardEffect(state, instanceId, 'harry', true);

    // Health should NOT have been reduced (detention damage skipped during cleanup)
    expect(state.players.harry!.health).toBe(10);
  });

  it('fires detention card on_discard_effect during normal play discard', () => {
    const state = buildTestState();
    const instanceId = addCardToHand(state, 'harry', 'detention');
    state.players.harry!.health = 10;

    // Fire on-discard as normal play (not cleanup)
    fireOnDiscardEffect(state, instanceId, 'harry', false);

    // Health should have been reduced by 2 (detention damage fires during normal play)
    expect(state.players.harry!.health).toBe(8);
  });

  it('does not reduce health when isCleanup is true for detention card', () => {
    const state = buildTestState();
    const instanceId = addCardToHand(state, 'harry', 'detention');
    state.players.harry!.health = 5;

    // Cleanup discard should NOT trigger detention damage
    fireOnDiscardEffect(state, instanceId, 'harry', true);
    expect(state.players.harry!.health).toBe(5);
  });

  it('default isCleanup parameter is false (fires effect)', () => {
    const state = buildTestState();
    const instanceId = addCardToHand(state, 'harry', 'detention');
    state.players.harry!.health = 10;

    // Calling without isCleanup parameter defaults to false
    fireOnDiscardEffect(state, instanceId, 'harry');

    // Effect should fire (default isCleanup = false)
    expect(state.players.harry!.health).toBe(8);
  });

  it('does not fire on_discard_effect for non-detention cards during cleanup', () => {
    // FAQ (manual p.14, Remembrall example): cards discarded at the end of the
    // turn do not trigger their discard effects - the isCleanup guard applies
    // to every card, not just detention.
    const state = buildTestState();
    const instanceId = addCardToHand(state, 'harry', 'remembrall');
    state.players.harry!.moneyTokens = 0;

    // Cleanup discard fires nothing, even for a non-detention card
    fireOnDiscardEffect(state, instanceId, 'harry', true);
    expect(state.players.harry!.moneyTokens).toBe(0);

    // The same card fires normally outside cleanup
    fireOnDiscardEffect(state, instanceId, 'harry', false);
    expect(state.players.harry!.moneyTokens).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Section 3: Patronus Protect
// ---------------------------------------------------------------------------

describe('Patronus Protect', () => {
  it('sets patronusShield to true when patronus_protect resolves', () => {
    const state = buildTestState();
    expect(state.players.harry!.patronusShield).toBe(false);

    resolveEffect(
      { type: 'patronus_protect', params: { target: 'self' } },
      { sourcePlayerId: 'harry', source: 'test', autoResolve: true },
      state,
    );

    expect(state.players.harry!.patronusShield).toBe(true);
  });

  it('prevents stun when patronusShield is true and clears the shield', () => {
    const state = buildTestState();
    state.players.harry!.patronusShield = true;
    state.players.harry!.health = 10;

    const result = stunPlayer(state, 'harry');

    // Stun should be prevented
    expect(result).toBe(false);
    expect(state.players.harry!.isStunned).toBe(false);
    // Shield should be cleared
    expect(state.players.harry!.patronusShield).toBe(false);
    // Health should not be set to 0
    expect(state.players.harry!.health).toBe(10);
  });

  it('resets patronusShield at end of turn via resetTurnCounters', () => {
    const state = buildTestState();
    state.players.harry!.patronusShield = true;

    resetTurnCounters(state);

    expect(state.players.harry!.patronusShield).toBe(false);
  });

  it('allows stun to work normally without the shield', () => {
    const state = buildTestState();
    state.players.harry!.patronusShield = false;
    state.players.harry!.health = 10;
    // Add cards to hand so discard-on-stun has something to work with
    addCardToHand(state, 'harry', 'alohomora');
    addCardToHand(state, 'harry', 'alohomora');

    const result = stunPlayer(state, 'harry');

    expect(result).toBe(true);
    expect(state.players.harry!.isStunned).toBe(true);
    expect(state.players.harry!.health).toBe(0);
  });

  it('sets patronusShield on other_players target', () => {
    const state = buildTestState(7, ['harry', 'ron']);
    state.players.ron!.patronusShield = false;

    resolveEffect(
      { type: 'patronus_protect', params: { target: 'other_players' } },
      { sourcePlayerId: 'harry', source: 'test', autoResolve: true },
      state,
    );

    // Harry should NOT have the shield (he is the source)
    expect(state.players.harry!.patronusShield).toBe(false);
    // Ron should have the shield
    expect(state.players.ron!.patronusShield).toBe(true);
  });

  it('sets patronusShield on all_players target', () => {
    const state = buildTestState(7, ['harry', 'ron']);

    resolveEffect(
      { type: 'patronus_protect', params: { target: 'all_players' } },
      { sourcePlayerId: 'harry', source: 'test', autoResolve: true },
      state,
    );

    expect(state.players.harry!.patronusShield).toBe(true);
    expect(state.players.ron!.patronusShield).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Section 4: Play Before Dark Arts
// ---------------------------------------------------------------------------

describe('Play Before Dark Arts', () => {
  it('does not fire non-flagged villain ongoing in before-dark-arts phase', () => {
    const state = buildTestState();
    // Dementor has play_before_dark_arts: false and a phase-resolving ongoing:
    // deal_damage 2 to active_player
    addActiveVillain(state, 'dementor', 8);
    state.players.harry!.health = 10;

    executeVillainPhaseBeforeDarkArts(state);

    // Dementor should NOT fire before dark arts (no flag)
    expect(state.players.harry!.health).toBe(10);
  });

  it('fires non-flagged villain ongoing in the normal villain phase', () => {
    const state = buildTestState();
    // Dementor has play_before_dark_arts: false and ongoing: deal_damage 2
    addActiveVillain(state, 'dementor', 8);
    state.players.harry!.health = 10;

    executeVillainPhase(state);

    // Dementor should fire in the normal villain phase
    expect(state.players.harry!.health).toBe(8);
    expect(state.currentPhase).toBe('HERO_ACTION');
  });

  it('skips flagged villain in normal villain phase to avoid double-firing', () => {
    const state = buildTestState();
    // Add both a flagged villain (dracomalfoy) and a non-flagged one (dementor)
    addActiveVillain(state, 'dracomalfoy', 6);
    addActiveVillain(state, 'dementor', 8);
    state.players.harry!.health = 10;

    // Before dark arts: dracomalfoy is iterated (trigger-only effect, no damage)
    executeVillainPhaseBeforeDarkArts(state);

    // Normal villain phase: dracomalfoy should be skipped, dementor should fire
    executeVillainPhase(state);

    // Only dementor's damage (2) should apply from the normal villain phase
    expect(state.players.harry!.health).toBe(8);
  });

  it('handles inactive villains gracefully in before-dark-arts phase', () => {
    const state = buildTestState();
    addActiveVillain(state, 'dracomalfoy', 6);
    // Mark villain as inactive (defeated)
    state.activeVillains[0]!.isActive = false;
    state.players.harry!.health = 10;

    executeVillainPhaseBeforeDarkArts(state);

    // No effect should occur from inactive villain
    expect(state.players.harry!.health).toBe(10);
  });

  it('runs before-dark-arts for flagged villain without error', () => {
    const state = buildTestState();
    // Draco has play_before_dark_arts: true and ongoing: deal_damage_on_location_control_added
    // This is a trigger-only effect (fires on events, not at villain phase), so it won't
    // deal damage here. But the function should still iterate and handle it gracefully.
    addActiveVillain(state, 'dracomalfoy', 6);
    state.players.harry!.health = 10;

    expect(() => executeVillainPhaseBeforeDarkArts(state)).not.toThrow();
    // No damage from trigger-only effect at villain phase
    expect(state.players.harry!.health).toBe(10);
  });

  it('completes full villain phase flow with mixed flagged and non-flagged villains', () => {
    const state = buildTestState();
    // Add multiple villains: dracomalfoy (flagged), fenrirgreyback (flagged), dementor (not flagged)
    addActiveVillain(state, 'dracomalfoy', 6);
    addActiveVillain(state, 'fenrirgreyback', 8);
    addActiveVillain(state, 'dementor', 8);
    state.players.harry!.health = 10;

    // Before dark arts: flagged villains are iterated (trigger-only/passive, no direct damage)
    executeVillainPhaseBeforeDarkArts(state);
    expect(state.players.harry!.health).toBe(10);

    // Normal villain phase: only non-flagged villains fire
    executeVillainPhase(state);
    // Only dementor deals 2 damage
    expect(state.players.harry!.health).toBe(8);
    expect(state.currentPhase).toBe('HERO_ACTION');
  });
});
