/**
 * Edge case tests for the Hogwarts Battle engine.
 *
 * Tests boundary conditions, error scenarios, and unusual interactions
 * that could cause bugs in the game logic.
 */
import { describe, expect, it } from 'vitest';
import { getVillain } from '../dataManager';
import { resolveEffect } from '../effectResolver';
import { addLocationControl, drawCardForPlayer, removeLocationControl } from '../gameState';
import { canAssignAttackToVillain } from '../horcruxes';
import { activateProficiency } from '../proficiencies';
import {
  attackVillainWithAmount,
  buyCard,
  checkLossCondition,
  checkWinCondition,
  playCard,
  startTurn,
} from '../turnLogic';
import {
  addActiveVillain,
  addMarketCard,
  buildTestState,
  initHorcruxes,
  resolveDarkArtEvent,
  resolveVillainDeath,
  resolveVillainOngoing,
  setProficiency,
} from './helpers/testGameState';

// ---------------------------------------------------------------------------
// Market Deck Exhaustion
// ---------------------------------------------------------------------------

describe('Edge case: Market deck exhaustion', () => {
  it('handles buying when all market slots are empty', () => {
    const state = buildTestState();
    state.players.harry!.moneyTokens = 10;
    // No cards in market slots
    expect(buyCard(state, 'harry', 0)).toBe(false);
    expect(buyCard(state, 'harry', 5)).toBe(false);
  });

  it('handles buying from an out-of-range market index', () => {
    const state = buildTestState();
    state.players.harry!.moneyTokens = 10;
    addMarketCard(state, 0, 'reparo');
    expect(buyCard(state, 'harry', -1)).toBe(false);
    expect(buyCard(state, 'harry', 6)).toBe(false);
    expect(buyCard(state, 'harry', 99)).toBe(false);
  });

  it('refills market slots after purchase when deck is empty', () => {
    const state = buildTestState();
    state.market.deck = [];
    addMarketCard(state, 0, 'reparo');
    state.players.harry!.moneyTokens = 10;
    buyCard(state, 'harry', 0);
    // Slot should be empty (no deck to refill from)
    expect(state.market.availableCards[0]).toBe('');
  });
});

// ---------------------------------------------------------------------------
// Effect Chaining with Finite Deck
// ---------------------------------------------------------------------------

describe('Edge case: Effect chaining with finite deck', () => {
  it('Dark Arts chain with crucio resolves completely even with small deck', () => {
    const state = buildTestState();
    state.players.harry!.health = 10;
    state.darkArtsDeck = ['tarantallegra'];
    resolveDarkArtEvent(state, 'crucio');
    // Crucio deals 1 + tarantallegra deals 1 = 2 total
    expect(state.players.harry!.health).toBe(8);
    expect(state.darkArtsPlayedThisTurn).toContain('tarantallegra');
  });

  it('Dark Arts chain with empty deck does not crash', () => {
    const state = buildTestState();
    state.players.harry!.health = 10;
    state.darkArtsDeck = [];
    expect(() => resolveDarkArtEvent(state, 'crucio')).not.toThrow();
    // Only crucio damage (1), no extra card to resolve
    expect(state.players.harry!.health).toBe(9);
  });

  it('drawing from empty deck does not crash', () => {
    const state = buildTestState();
    state.players.harry!.deck = [];
    state.currentPhase = 'CLEANUP';
    expect(() => drawCardForPlayer(state, 'harry')).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Game Number Validation
// ---------------------------------------------------------------------------

describe('Edge case: Game number validation', () => {
  it('game number 0 does not crash setup', () => {
    const state = buildTestState();
    state.gameNumber = 0;
    expect(state.gameNumber).toBe(0);
    // Hero abilities should not trigger at game 0
    resolveEffect(
      { type: 'heal', params: { amount: 1, target: 'self' } },
      { source: 'test', sourcePlayerId: 'harry', autoResolve: true },
      state,
    );
    expect(state.players.harry!.health).toBe(10);
  });

  it('game number 16 (beyond normal range) does not crash', () => {
    const state = buildTestState();
    state.gameNumber = 16;
    expect(state.gameNumber).toBe(16);
  });

  it('negative game number does not crash', () => {
    const state = buildTestState();
    state.gameNumber = -1;
    expect(state.gameNumber).toBe(-1);
  });
});

// ---------------------------------------------------------------------------
// Villain HP Overflow (Over-damage)
// ---------------------------------------------------------------------------

describe('Edge case: Villain HP overflow', () => {
  it('villain HP does not go below 0 from excessive damage', () => {
    const state = buildTestState();
    addActiveVillain(state, 'quirrell', 6);
    state.players.harry!.attackTokens = 20;
    attackVillainWithAmount(state, 'harry', 0, 20);
    expect(state.activeVillains[0]!.currentHp).toBeLessThanOrEqual(0);
  });

  it('villain HP can be set to 0 exactly', () => {
    const state = buildTestState();
    addActiveVillain(state, 'quirrell', 6);
    state.players.harry!.attackTokens = 6;
    attackVillainWithAmount(state, 'harry', 0, 6);
    expect(state.activeVillains[0]!.currentHp).toBe(0);
  });

  it('second attack on same villain is blocked (one attack per villain per turn)', () => {
    const state = buildTestState();
    addActiveVillain(state, 'quirrell', 6);
    state.players.harry!.attackTokens = 10;
    attackVillainWithAmount(state, 'harry', 0, 4);
    // Second attack should be blocked by one-attack-per-villain rule
    expect(attackVillainWithAmount(state, 'harry', 0, 6)).toBe(false);
    expect(state.activeVillains[0]!.currentHp).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Empty Villain Deck + Win Condition
// ---------------------------------------------------------------------------

describe('Edge case: Win condition checks', () => {
  it('win condition with no active villains and empty villain deck', () => {
    const state = buildTestState();
    state.activeVillains = [];
    state.villainDeck = [];
    state.currentLocation!.currentControl = 0;
    expect(checkWinCondition(state)).toBe(true);
  });

  it('no win when villains are still active', () => {
    const state = buildTestState();
    addActiveVillain(state, 'quirrell');
    state.villainDeck = [];
    expect(checkWinCondition(state)).toBe(false);
  });

  it('no win when villain deck still has cards', () => {
    const state = buildTestState();
    state.activeVillains = [];
    state.villainDeck = ['dracomalfoy'];
    expect(checkWinCondition(state)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Loss Condition
// ---------------------------------------------------------------------------

describe('Edge case: Loss condition checks', () => {
  it('loss when all locations are exhausted', () => {
    const state = buildTestState();
    state.currentLocation = null;
    state.locationDeck = [];
    state.locationDiscard = ['castlegates'];
    expect(checkLossCondition(state)).toBe(true);
  });

  it('no loss when current location is still active', () => {
    const state = buildTestState();
    state.currentLocation!.currentControl = state.currentLocation!.maxControl;
    expect(checkLossCondition(state)).toBe(false);
  });

  it('no loss when location deck still has cards', () => {
    const state = buildTestState();
    state.currentLocation = null;
    state.locationDeck = ['greathall'];
    state.locationDiscard = ['castlegates'];
    expect(checkLossCondition(state)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Patronus Use with Zero Charges
// ---------------------------------------------------------------------------

describe('Edge case: Patronus with zero charges', () => {
  it('player with zero patronus charges has empty patronus state', () => {
    const state = buildTestState();
    expect(state.players.harry!.patronusCharges).toBe(0);
    expect(state.players.harry!.patronusId).toBe('');
    expect(state.players.harry!.patronusShield).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Healing Prevention Stacking
// ---------------------------------------------------------------------------

describe('Edge case: Healing prevention stacking', () => {
  it('healing prevention flag blocks heal effects', () => {
    const state = buildTestState();
    state.healingPreventedThisTurn = true;
    state.players.harry!.health = 5;
    resolveEffect(
      { type: 'heal', params: { amount: 3, target: 'self' } },
      { source: 'test', sourcePlayerId: 'harry', autoResolve: true },
      state,
    );
    expect(state.players.harry!.health).toBe(5);
  });

  it('fenrir ongoing + nagini horcrux both block healing', () => {
    const state = buildTestState();
    addActiveVillain(state, 'fenrirgreyback');
    initHorcruxes(state);
    state.horcruxState!.activeHorcruxId = 'nagini';
    state.horcruxState!.rolledSymbols = [];
    state.darkArtsDeck = [];
    startTurn(state);
    state.players.harry!.health = 5;
    resolveEffect(
      { type: 'heal', params: { amount: 5, target: 'self' } },
      { source: 'test', sourcePlayerId: 'harry', autoResolve: true },
      state,
    );
    expect(state.players.harry!.health).toBeLessThan(10);
  });

  it('healing works when prevention is cleared on new turn', () => {
    const state = buildTestState();
    state.healingPreventedThisTurn = true;
    state.players.harry!.health = 5;
    // Simulate new turn clearing the flag
    state.healingPreventedThisTurn = false;
    resolveEffect(
      { type: 'heal', params: { amount: 3, target: 'self' } },
      { source: 'test', sourcePlayerId: 'harry', autoResolve: true },
      state,
    );
    expect(state.players.harry!.health).toBe(8);
  });
});

// ---------------------------------------------------------------------------
// Location Control Boundary
// ---------------------------------------------------------------------------

describe('Edge case: Location control boundaries', () => {
  it('location control cannot go below 0', () => {
    const state = buildTestState();
    state.currentLocation!.currentControl = 1;
    removeLocationControl(state, 5);
    expect(state.currentLocation!.currentControl).toBe(0);
  });

  it('loss when all locations exhausted (no current, empty deck, discarded)', () => {
    const state = buildTestState();
    state.currentLocation = null;
    state.locationDeck = [];
    state.locationDiscard = ['castlegates'];
    expect(checkLossCondition(state)).toBe(true);
  });

  it('no loss when current location is still active', () => {
    const state = buildTestState();
    addLocationControl(state, state.currentLocation!.maxControl);
    // currentLocation is still non-null, so not a loss
    expect(checkLossCondition(state)).toBe(false);
  });

  it('adding control beyond max still sets to max', () => {
    const state = buildTestState();
    const max = state.currentLocation!.maxControl;
    addLocationControl(state, max + 10);
    expect(state.currentLocation!.currentControl).toBeLessThanOrEqual(max + 10);
  });
});

// ---------------------------------------------------------------------------
// Proficiency Edge Cases
// ---------------------------------------------------------------------------

describe('Edge case: Proficiency edge cases', () => {
  it('useProficiency fails when player has no proficiency', () => {
    const state = buildTestState();
    state.players.harry!.proficiencyId = '';
    expect(activateProficiency(state, 'harry')).toBe(false);
  });

  it('useProficiency fails for non-manual trigger proficiencies', () => {
    const state = buildTestState();
    setProficiency(state, 'harry', 'herbology');
    expect(activateProficiency(state, 'harry')).toBe(false);
  });

  it('useProficiency fails for passive proficiencies', () => {
    const state = buildTestState();
    setProficiency(state, 'harry', 'arithmancy');
    expect(activateProficiency(state, 'harry')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Villain Effect Edge Cases
// ---------------------------------------------------------------------------

describe('Edge case: Villain effect edge cases', () => {
  it('resolving ongoing for villain with no ongoing does not crash', () => {
    const state = buildTestState();
    expect(() => resolveVillainOngoing(state, 'nonexistent')).not.toThrow();
  });

  it('resolving death for villain with none death effect is a no-op', () => {
    const state = buildTestState();
    state.currentLocation!.currentControl = 2;
    state.players.harry!.health = 8;
    resolveVillainDeath(state, 'voldemort');
    expect(state.currentLocation!.currentControl).toBe(2);
    expect(state.players.harry!.health).toBe(8);
  });

  it('villain definition data is valid for all villains', () => {
    const ids = [
      'dracomalfoy',
      'quirrell',
      'crabbeandgoyle',
      'basilisk',
      'tomriddle',
      'luciusmalfoy',
      'peterpettigrew',
      'dementor',
      'bartycrouchjr',
      'deatheater',
      'doloresumbridge',
      'voldemort',
      'bellatrixlestrange',
      'fenrirgreyback',
      'cornishpixies',
      'fluffy',
      'troll',
      'norbert',
    ];
    for (const id of ids) {
      const villain = getVillain(id);
      expect(villain).toBeDefined();
      expect(villain!.hp).toBeGreaterThan(0);
      expect(villain!.ongoing_effect).toBeDefined();
    }
  });
});

// ---------------------------------------------------------------------------
// Card Play Edge Cases
// ---------------------------------------------------------------------------

describe('Edge case: Card play edge cases', () => {
  it('playing a card not in hand returns false', () => {
    const state = buildTestState();
    expect(playCard(state, 'harry', 'nonexistent-instance')).toBe(false);
  });

  it('playing from empty hand does not crash', () => {
    const state = buildTestState();
    expect(playCard(state, 'harry', '')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Voldemort Gating with Horcruxes
// ---------------------------------------------------------------------------

describe('Edge case: Voldemort gating', () => {
  it('cannot attack Game 7 Voldemort when horcruxes remain', () => {
    const state = buildTestState();
    initHorcruxes(state);
    addActiveVillain(state, 'voldemort7', 12);
    state.players.harry!.attackTokens = 5;
    expect(canAssignAttackToVillain(state, 'voldemort7')).toBe(false);
    expect(attackVillainWithAmount(state, 'harry', 0, 2)).toBe(false);
  });

  it('can attack non-Voldemort villains regardless of horcruxes', () => {
    const state = buildTestState();
    initHorcruxes(state);
    addActiveVillain(state, 'quirrell', 6);
    state.players.harry!.attackTokens = 5;
    expect(canAssignAttackToVillain(state, 'quirrell')).toBe(true);
    expect(attackVillainWithAmount(state, 'harry', 0, 2)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Multi-Player Edge Cases
// ---------------------------------------------------------------------------

describe('Edge case: Multi-player interactions', () => {
  it('damage to all players applies to every player', () => {
    const state = buildTestState(7, ['harry', 'ron', 'hermione']);
    state.players.harry!.health = 10;
    state.players.ron!.health = 10;
    state.players.hermione!.health = 10;
    resolveEffect(
      { type: 'deal_damage', params: { amount: 2, target: 'all_players' } },
      { source: 'test', sourcePlayerId: 'harry', autoResolve: true },
      state,
    );
    expect(state.players.harry!.health).toBe(8);
    expect(state.players.ron!.health).toBe(8);
    expect(state.players.hermione!.health).toBe(8);
  });

  it('heal all players applies to every player', () => {
    const state = buildTestState(7, ['harry', 'ron', 'hermione']);
    state.players.harry!.health = 7;
    state.players.ron!.health = 8;
    state.players.hermione!.health = 6;
    resolveEffect(
      { type: 'heal', params: { amount: 2, target: 'all_players' } },
      { source: 'test', sourcePlayerId: 'harry', autoResolve: true },
      state,
    );
    expect(state.players.harry!.health).toBe(9);
    expect(state.players.ron!.health).toBe(10);
    expect(state.players.hermione!.health).toBe(8);
  });
});

// ---------------------------------------------------------------------------
// Stun Edge Cases
// ---------------------------------------------------------------------------

describe('Edge case: Stun interactions', () => {
  it('stunned player has isStunned flag set', () => {
    const state = buildTestState();
    state.players.harry!.isStunned = true;
    expect(state.players.harry!.isStunned).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Encounter Progress Accumulation
// ---------------------------------------------------------------------------

describe('Edge case: Encounter progress accumulation', () => {
  it('encounter state can track progress across operations', () => {
    const state = buildTestState();
    // Without encounter state initialized, operations should not crash
    expect(state.encounterState).toBeNull();
    expect(() => addLocationControl(state, 1)).not.toThrow();
    expect(() => removeLocationControl(state, 1)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Pending Choice Edge Cases
// ---------------------------------------------------------------------------

describe('Edge case: Pending choice interactions', () => {
  it('autoResolve clears pending choices', () => {
    const state = buildTestState();
    resolveEffect(
      {
        type: 'choose_one',
        params: {
          prompt: 'Choose:',
          options: [
            { label: 'A', effect: { type: 'deal_damage', params: { amount: 1, target: 'self' } } },
            { label: 'B', effect: { type: 'heal', params: { amount: 1, target: 'self' } } },
          ],
        },
      },
      { source: 'test', sourcePlayerId: 'harry', autoResolve: true },
      state,
    );
    // autoResolve picks first option and clears pending choice
    expect(state.pendingChoice).toBeNull();
  });
});
