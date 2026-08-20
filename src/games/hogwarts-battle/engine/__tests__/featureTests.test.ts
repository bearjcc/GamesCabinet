/**
 * Feature / integration tests for the Hogwarts Battle engine.
 *
 * These tests verify that complete game mechanics work together correctly,
 * exercising multiple subsystems (turn flow, market, villains, locations,
 * dark arts) in coordinated scenarios rather than testing individual effects.
 *
 * @module featureTests
 */

import { describe, expect, it } from 'vitest';
import { resolveEffect } from '../effectResolver';
import { createCardInstance, getCardInstance, refillMarket } from '../gameState';
import {
  attackVillainWithAmount,
  buyCard,
  checkLossCondition,
  checkWinCondition,
  completeDarkArtsPhase,
  endTurn,
  playCard,
  setupGame,
  startTurn,
} from '../turnLogic';
import { createInitialGameState } from '../types';
import {
  addActiveVillain,
  addCardToDeck,
  addCardToDiscard,
  addCardToHand,
  addCardToPlayArea,
  addMarketCard,
  buildTestState,
} from './helpers/testGameState';

// ---------------------------------------------------------------------------
// 1. Full Turn Cycle
// ---------------------------------------------------------------------------

describe('Full Turn Cycle', () => {
  /**
   * Verify a complete turn from startTurn through endTurn:
   * - Dark arts phase resolves events
   * - Villain ongoing effects fire
   * - Hero action phase: play cards, buy, attack
   * - Cleanup: discard hand/play area, draw new hand, check location
   */
  it('should complete a full turn cycle with dark arts, villain, hero action, and cleanup', () => {
    const state = buildTestState(42);
    const player = state.players.harry!;

    // Seed a dark arts event that deals 2 damage
    state.darkArtsDeck = ['expulso']; // deals 2 damage to active player
    state.darkArtsDiscard = [];

    // Set up a villain with an ongoing effect (quirrell: deals 1 damage)
    state.activeVillains = [];
    addActiveVillain(state, 'quirrell', 6);

    // Give the player some cards in hand
    addCardToHand(state, 'harry', 'alohomora'); // gain 1 money
    addCardToHand(state, 'harry', 'descendo'); // gain 2 attack (cost 5, but we play from hand)

    // Put cards in deck for redraw
    for (let i = 0; i < 6; i += 1) {
      addCardToDeck(state, 'harry', 'alohomora');
    }

    // Location setup
    state.currentLocation = {
      locationId: 'castlegates',
      currentControl: 0,
      maxControl: 5,
      darkArtsToReveal: 1,
    };

    // Start turn: dark arts + villain phase run together
    startTurn(state);
    completeDarkArtsPhase(state);

    // Dark arts phase: expulso deals 2 damage
    // Villain phase: quirrell ongoing deals 1 damage
    // Total: 10 - 2 - 1 = 7
    expect(player.health).toBe(7);
    expect(state.darkArtsPlayedThisTurn).toEqual(['expulso']);

    // Hero action phase should be active
    expect(state.currentPhase).toBe('HERO_ACTION');

    // Play alohomora (gain 1 money)
    const alohomoraInstanceId = player.hand.find(
      (id) => state.cardInstances[id]?.cardId === 'alohomora',
    )!;
    expect(playCard(state, 'harry', alohomoraInstanceId)).toBe(true);
    expect(player.moneyTokens).toBe(1);
    expect(player.playArea).toContain(alohomoraInstanceId);

    // End turn
    endTurn(state);

    // Cleanup: hand and play area should be discarded, new hand drawn
    expect(player.playArea.length).toBe(0);
    expect(player.hand.length).toBe(5); // drew 5 new cards

    // Attack tokens and money reset
    expect(player.attackTokens).toBe(0);
    expect(player.moneyTokens).toBe(0);

    // Phase should be back to non-HERO_ACTION (CLEANUP or GAME_OVER)
    expect(state.currentPhase).not.toBe('HERO_ACTION');
  });

  it('should progress turn number on each startTurn', () => {
    const state = buildTestState(7);
    state.darkArtsDeck = [];
    state.activeVillains = [];
    state.currentLocation = {
      locationId: 'castlegates',
      currentControl: 0,
      maxControl: 5,
      darkArtsToReveal: 1,
    };

    expect(state.turnNumber).toBe(0);
    startTurn(state);
    expect(state.turnNumber).toBe(1);
    startTurn(state);
    expect(state.turnNumber).toBe(2);
  });

  it('should reset turn counters at the start of each turn', () => {
    const state = buildTestState(7);
    const player = state.players.harry!;
    player.attackTokens = 5;
    player.moneyTokens = 3;
    player.spellsPlayedThisTurn = 2;
    player.villainsKilledThisTurn = 1;
    state.darkArtsDeck = [];
    state.activeVillains = [];
    state.currentLocation = {
      locationId: 'castlegates',
      currentControl: 0,
      maxControl: 5,
      darkArtsToReveal: 1,
    };

    startTurn(state);

    expect(player.attackTokens).toBe(0);
    expect(player.moneyTokens).toBe(0);
    expect(player.spellsPlayedThisTurn).toBe(0);
    expect(player.villainsKilledThisTurn).toBe(0);
  });

  it('should discard hand and play area cards during cleanup, then draw new hand', () => {
    const state = buildTestState(7);
    const player = state.players.harry!;
    state.darkArtsDeck = [];
    state.activeVillains = [];
    state.currentLocation = {
      locationId: 'castlegates',
      currentControl: 0,
      maxControl: 5,
      darkArtsToReveal: 1,
    };

    // Put cards in hand and play area
    const handCard = addCardToHand(state, 'harry', 'alohomora');
    const playCard1 = addCardToPlayArea(state, 'harry', 'descendo');

    // Seed deck for redraw
    for (let i = 0; i < 6; i += 1) {
      addCardToDeck(state, 'harry', 'alohomora');
    }

    state.currentPhase = 'HERO_ACTION';
    endTurn(state);

    // Hand and play area cards should be in discard now
    expect(player.playArea).toEqual([]);
    expect(player.discard).toContain(handCard);
    expect(player.discard).toContain(playCard1);

    // New hand drawn
    expect(player.hand.length).toBe(5);
  });

  it('should recycle discard pile into deck when deck is empty during draw', () => {
    const state = buildTestState(7);
    const player = state.players.harry!;
    state.darkArtsDeck = [];
    state.activeVillains = [];
    state.currentLocation = {
      locationId: 'castlegates',
      currentControl: 0,
      maxControl: 5,
      darkArtsToReveal: 1,
    };

    // Deck is empty, but discard has cards
    player.deck = [];
    for (let i = 0; i < 10; i += 1) {
      addCardToDiscard(state, 'harry', 'alohomora');
    }

    state.currentPhase = 'HERO_ACTION';
    endTurn(state);

    // Should have drawn 5 cards (from recycled discard)
    expect(player.hand.length).toBe(5);
    // Discard should have been shuffled into deck
    expect(player.deck.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 2. Multi-Player Turn Rotation
// ---------------------------------------------------------------------------

describe('Multi-Player Turn Rotation', () => {
  it('should maintain independent hands, decks, and discards per player', () => {
    const state = buildTestState(7, ['harry', 'hermione']);
    const harry = state.players.harry!;
    const hermione = state.players.hermione!;

    // Each player gets their own cards
    addCardToHand(state, 'harry', 'alohomora');
    addCardToHand(state, 'hermione', 'descendo');
    addCardToDeck(state, 'harry', 'incendio');
    addCardToDeck(state, 'hermione', 'reparo');
    addCardToDiscard(state, 'harry', 'quidditchgear');
    addCardToDiscard(state, 'hermione', 'essenceofdittany');

    expect(harry.hand.length).toBe(1);
    expect(hermione.hand.length).toBe(1);
    expect(harry.deck.length).toBe(1);
    expect(hermione.deck.length).toBe(1);
    expect(harry.discard.length).toBe(1);
    expect(hermione.discard.length).toBe(1);

    // Different card IDs in each player's zones
    const harryHandCard = state.cardInstances[harry.hand[0]!]?.cardId;
    const hermioneHandCard = state.cardInstances[hermione.hand[0]!]?.cardId;
    expect(harryHandCard).toBe('alohomora');
    expect(hermioneHandCard).toBe('descendo');
  });

  it('should reset only the active player tokens during their turn cleanup', () => {
    const state = buildTestState(7, ['harry', 'hermione']);
    const harry = state.players.harry!;
    const hermione = state.players.hermione!;

    harry.attackTokens = 3;
    harry.moneyTokens = 2;
    hermione.attackTokens = 5;
    hermione.moneyTokens = 4;

    state.darkArtsDeck = [];
    state.activeVillains = [];
    state.currentLocation = {
      locationId: 'castlegates',
      currentControl: 0,
      maxControl: 5,
      darkArtsToReveal: 1,
    };

    // Harry ends his turn
    state.currentPlayerId = 'harry';
    state.currentPhase = 'HERO_ACTION';

    // Seed deck for redraw
    for (let i = 0; i < 6; i += 1) {
      addCardToDeck(state, 'harry', 'alohomora');
    }

    endTurn(state);

    // Harry's tokens reset
    expect(harry.attackTokens).toBe(0);
    expect(harry.moneyTokens).toBe(0);

    // Hermione's tokens are NOT reset (she hasn't taken her turn yet)
    expect(hermione.attackTokens).toBe(5);
    expect(hermione.moneyTokens).toBe(4);
  });

  it('should allow each player to play cards independently on their own turn', () => {
    const state = buildTestState(7, ['harry', 'hermione']);
    const harry = state.players.harry!;

    state.darkArtsDeck = [];
    state.activeVillains = [];
    state.currentLocation = {
      locationId: 'castlegates',
      currentControl: 0,
      maxControl: 5,
      darkArtsToReveal: 1,
    };

    // Harry's turn
    state.currentPlayerId = 'harry';
    state.currentPhase = 'HERO_ACTION';
    const harryCard = addCardToHand(state, 'harry', 'alohomora');
    expect(playCard(state, 'harry', harryCard)).toBe(true);
    expect(harry.moneyTokens).toBe(1);
    expect(harry.playArea).toContain(harryCard);

    // Note: The engine layer playCard() does NOT enforce currentPlayerId matching.
    // That check is done at the boardgame.io move level in hogwartsBattle.ts.
    // Here we verify that hermione's card is in her own hand (independent zones).
    const hermioneCard = addCardToHand(state, 'hermione', 'alohomora');
    expect(state.players.hermione!.hand).toContain(hermioneCard);
    expect(state.players.harry!.hand).not.toContain(hermioneCard);
  });

  it('should revive stunned players at end of cleanup', () => {
    const state = buildTestState(7, ['harry', 'hermione']);
    const hermione = state.players.hermione!;

    state.darkArtsDeck = [];
    state.activeVillains = [];
    state.currentLocation = {
      locationId: 'castlegates',
      currentControl: 0,
      maxControl: 5,
      darkArtsToReveal: 1,
    };

    // Hermione is stunned
    hermione.isStunned = true;
    hermione.health = 0;

    // Seed deck for harry's redraw
    for (let i = 0; i < 6; i += 1) {
      addCardToDeck(state, 'harry', 'alohomora');
    }

    state.currentPhase = 'HERO_ACTION';
    endTurn(state);

    // Hermione should be revived
    expect(hermione.isStunned).toBe(false);
    expect(hermione.health).toBe(hermione.maxHealth);
  });

  it('should clear stunned status at start of stunned player turn', () => {
    const state = buildTestState(7, ['harry']);
    const player = state.players.harry!;

    state.darkArtsDeck = [];
    state.activeVillains = [];
    state.currentLocation = {
      locationId: 'castlegates',
      currentControl: 0,
      maxControl: 5,
      darkArtsToReveal: 1,
    };

    // Player is stunned from previous turn
    player.isStunned = true;
    player.health = 0;

    startTurn(state);

    // Stun cleared, health restored
    expect(player.isStunned).toBe(false);
    expect(player.health).toBe(player.maxHealth);
  });
});

// ---------------------------------------------------------------------------
// 3. Location Control
// ---------------------------------------------------------------------------

describe('Location Control', () => {
  it('should add control tokens through card effects', () => {
    const state = buildTestState(7);
    state.currentLocation = {
      locationId: 'castlegates',
      currentControl: 0,
      maxControl: 5,
      darkArtsToReveal: 1,
    };

    resolveEffect(
      { type: 'add_location_control', params: { amount: 2 } },
      { source: 'test', sourcePlayerId: 'harry', autoResolve: true },
      state,
    );

    expect(state.currentLocation!.currentControl).toBe(2);
  });

  it('should cap control at max and not exceed it', () => {
    const state = buildTestState(7);
    state.currentLocation = {
      locationId: 'castlegates',
      currentControl: 4,
      maxControl: 5,
      darkArtsToReveal: 1,
    };

    resolveEffect(
      { type: 'add_location_control', params: { amount: 3 } },
      { source: 'test', sourcePlayerId: 'harry', autoResolve: true },
      state,
    );

    expect(state.currentLocation!.currentControl).toBe(5);
  });

  it('should reveal next location when control reaches max during cleanup', () => {
    const state = buildTestState(7);
    state.darkArtsDeck = [];
    state.activeVillains = [];
    addActiveVillain(state, 'dracomalfoy', 6);
    state.villainDeck = ['quirrell'];
    state.locationDeck = ['hagridshut', 'greathall'];
    state.currentLocation = {
      locationId: 'castlegates',
      currentControl: 5, // at max
      maxControl: 5,
      darkArtsToReveal: 1,
    };

    // Seed deck for redraw
    for (let i = 0; i < 6; i += 1) {
      addCardToDeck(state, 'harry', 'alohomora');
    }

    state.currentPhase = 'HERO_ACTION';
    endTurn(state);

    // Old location should be in discard, new location revealed
    expect(state.locationDiscard).toContain('castlegates');
    expect(state.currentLocation!.locationId).toBe('hagridshut');
    expect(state.currentLocation!.currentControl).toBe(0);
    expect(state.isGameOver).toBe(false);
  });

  it('should trigger game over (loss) when final location is captured', () => {
    const state = buildTestState(7);
    state.darkArtsDeck = [];
    state.activeVillains = [];
    addActiveVillain(state, 'dracomalfoy', 6);
    state.villainDeck = ['quirrell'];
    state.locationDeck = []; // no more locations
    state.currentLocation = {
      locationId: 'castlegates',
      currentControl: 5,
      maxControl: 5,
      darkArtsToReveal: 1,
    };

    // Seed deck for redraw
    for (let i = 0; i < 6; i += 1) {
      addCardToDeck(state, 'harry', 'alohomora');
    }

    state.currentPhase = 'HERO_ACTION';
    endTurn(state);

    expect(state.isGameOver).toBe(true);
    expect(state.isVictory).toBe(false);
    expect(state.currentPhase).toBe('GAME_OVER');
  });

  it('should remove location control through effects', () => {
    const state = buildTestState(7);
    state.currentLocation = {
      locationId: 'castlegates',
      currentControl: 3,
      maxControl: 5,
      darkArtsToReveal: 1,
    };

    resolveEffect(
      { type: 'remove_location_control', params: { amount: 2 } },
      { source: 'test', sourcePlayerId: 'harry', autoResolve: true },
      state,
    );

    expect(state.currentLocation!.currentControl).toBe(1);
  });

  it('should not reduce control below 0', () => {
    const state = buildTestState(7);
    state.currentLocation = {
      locationId: 'castlegates',
      currentControl: 1,
      maxControl: 5,
      darkArtsToReveal: 1,
    };

    resolveEffect(
      { type: 'remove_location_control', params: { amount: 5 } },
      { source: 'test', sourcePlayerId: 'harry', autoResolve: true },
      state,
    );

    expect(state.currentLocation!.currentControl).toBe(0);
  });

  it('should progress through multiple locations in sequence', () => {
    const state = buildTestState(7);
    state.darkArtsDeck = [];
    state.activeVillains = [];
    state.locationDeck = ['hagridshut', 'greathall'];
    state.currentLocation = {
      locationId: 'castlegates',
      currentControl: 5,
      maxControl: 5,
      darkArtsToReveal: 1,
    };

    for (let i = 0; i < 6; i += 1) {
      addCardToDeck(state, 'harry', 'alohomora');
    }

    state.currentPhase = 'HERO_ACTION';
    endTurn(state);

    // First location captured, second revealed
    expect(state.currentLocation!.locationId).toBe('hagridshut');
    expect(state.locationDiscard).toEqual(['castlegates']);

    // Now capture the second location
    state.currentLocation!.currentControl = 6; // hagridshut max is 6
    state.currentPhase = 'HERO_ACTION';
    for (let i = 0; i < 6; i += 1) {
      addCardToDeck(state, 'harry', 'alohomora');
    }
    endTurn(state);

    expect(state.currentLocation!.locationId).toBe('greathall');
    expect(state.locationDiscard).toEqual(['castlegates', 'hagridshut']);
  });
});

// ---------------------------------------------------------------------------
// 4. Win/Loss Conditions
// ---------------------------------------------------------------------------

describe('Win/Loss Conditions', () => {
  it('should win when all villains are defeated and villain deck is empty', () => {
    const state = buildTestState(7);
    state.villainDeck = [];
    state.activeVillains = [
      {
        villainId: 'dracomalfoy',
        currentHp: 0,
        maxHp: 6,
        isActive: false, // defeated
        isBlocked: false,
        controlTokens: 0,
      },
    ];
    state.encounterState = null;

    expect(checkWinCondition(state)).toBe(true);
    expect(state.isGameOver).toBe(true);
    expect(state.isVictory).toBe(true);
  });

  it('should not win when villains remain in the deck', () => {
    const state = buildTestState(7);
    state.villainDeck = ['quirrell'];
    state.activeVillains = [
      {
        villainId: 'dracomalfoy',
        currentHp: 0,
        maxHp: 6,
        isActive: false,
        isBlocked: false,
        controlTokens: 0,
      },
    ];
    state.encounterState = null;

    expect(checkWinCondition(state)).toBe(false);
    expect(state.isGameOver).toBe(false);
  });

  it('should not win when active villains remain', () => {
    const state = buildTestState(7);
    state.villainDeck = [];
    state.activeVillains = [
      {
        villainId: 'dracomalfoy',
        currentHp: 3,
        maxHp: 6,
        isActive: true, // still active
        isBlocked: false,
        controlTokens: 0,
      },
    ];
    state.encounterState = null;

    expect(checkWinCondition(state)).toBe(false);
  });

  it('should lose when all locations are controlled (no location and empty deck)', () => {
    const state = buildTestState(7);
    state.currentLocation = null;
    state.locationDeck = [];
    state.locationDiscard = ['castlegates', 'hagridshut', 'greathall'];

    expect(checkLossCondition(state)).toBe(true);
    expect(state.isGameOver).toBe(true);
    expect(state.isVictory).toBe(false);
  });

  it('should not lose when locations remain in the deck', () => {
    const state = buildTestState(7);
    state.currentLocation = null;
    state.locationDeck = ['greathall'];
    state.locationDiscard = ['castlegates'];

    expect(checkLossCondition(state)).toBe(false);
  });

  it('should not lose when a current location is active', () => {
    const state = buildTestState(7);
    state.currentLocation = {
      locationId: 'castlegates',
      currentControl: 2,
      maxControl: 5,
      darkArtsToReveal: 1,
    };
    state.locationDeck = [];
    state.locationDiscard = [];

    expect(checkLossCondition(state)).toBe(false);
  });

  it('should stun hero instead of killing when health reaches 0', () => {
    const state = buildTestState(7);
    const player = state.players.harry!;
    player.health = 2;

    // Deal enough damage to stun (health <= 0 triggers stun)
    resolveEffect(
      { type: 'deal_damage', params: { amount: 5, target: 'active_player' } },
      { source: 'test', sourcePlayerId: 'harry', autoResolve: true },
      state,
    );

    // Player should be stunned, not dead
    expect(player.isStunned).toBe(true);
    expect(player.health).toBe(0);
    // Game should NOT be over from hero stun
    expect(state.isGameOver).toBe(false);
  });

  it('should trigger game over during cleanup when final location captured', () => {
    const state = buildTestState(7);
    state.darkArtsDeck = [];
    state.activeVillains = [];
    addActiveVillain(state, 'dracomalfoy', 6);
    state.villainDeck = ['quirrell'];
    state.locationDeck = [];
    state.locationDiscard = ['castlegates', 'hagridshut'];
    state.currentLocation = {
      locationId: 'greathall',
      currentControl: 7, // max for greathall
      maxControl: 7,
      darkArtsToReveal: 3,
    };

    for (let i = 0; i < 6; i += 1) {
      addCardToDeck(state, 'harry', 'alohomora');
    }

    state.currentPhase = 'HERO_ACTION';
    endTurn(state);

    expect(state.isGameOver).toBe(true);
    expect(state.isVictory).toBe(false);
    expect(state.currentPhase).toBe('GAME_OVER');
  });

  it('should trigger victory during cleanup when last villain defeated', () => {
    const state = buildTestState(7);
    state.darkArtsDeck = [];
    state.locationDeck = ['hagridshut'];
    state.currentLocation = {
      locationId: 'castlegates',
      currentControl: 0,
      maxControl: 5,
      darkArtsToReveal: 1,
    };

    // Only villain, already defeated
    state.activeVillains = [
      {
        villainId: 'dracomalfoy',
        currentHp: 0,
        maxHp: 6,
        isActive: false,
        isBlocked: false,
        controlTokens: 0,
      },
    ];
    state.villainDeck = [];
    state.encounterState = null;

    for (let i = 0; i < 6; i += 1) {
      addCardToDeck(state, 'harry', 'alohomora');
    }

    state.currentPhase = 'HERO_ACTION';
    endTurn(state);

    expect(state.isGameOver).toBe(true);
    expect(state.isVictory).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 5. Market Mechanics
// ---------------------------------------------------------------------------

describe('Market Mechanics', () => {
  it('should add purchased card to discard pile', () => {
    const state = buildTestState(7);
    const player = state.players.harry!;
    player.moneyTokens = 3;

    // Put a card in the market
    addMarketCard(state, 0, 'quidditchgear'); // cost 3

    state.currentPhase = 'HERO_ACTION';
    expect(buyCard(state, 'harry', 0)).toBe(true);

    // Card should be in discard
    const purchasedId = state.market.availableCards[0];
    expect(purchasedId).toBe(''); // slot emptied
    expect(player.discard.length).toBe(1);

    const discardedCard = getCardInstance(state, player.discard[0]!);
    expect(discardedCard?.cardId).toBe('quidditchgear');
  });

  it('should deduct cost from money tokens on purchase', () => {
    const state = buildTestState(7);
    const player = state.players.harry!;
    player.moneyTokens = 5;

    addMarketCard(state, 0, 'wingardiumleviosa'); // cost 2

    state.currentPhase = 'HERO_ACTION';
    expect(buyCard(state, 'harry', 0)).toBe(true);

    expect(player.moneyTokens).toBe(3); // 5 - 2
    expect(player.moneyTokensSpentThisTurn).toBe(2);
  });

  it('should not allow purchase when player has insufficient money', () => {
    const state = buildTestState(7);
    const player = state.players.harry!;
    player.moneyTokens = 1;

    addMarketCard(state, 0, 'quidditchgear'); // cost 3

    state.currentPhase = 'HERO_ACTION';
    expect(buyCard(state, 'harry', 0)).toBe(false);

    // Card should still be in market
    expect(state.market.availableCards[0]).not.toBe('');
    expect(player.discard.length).toBe(0);
    expect(player.moneyTokens).toBe(1); // unchanged
  });

  it('should refill market slot after purchase', () => {
    const state = buildTestState(7);
    const player = state.players.harry!;
    player.moneyTokens = 10;

    // Set up market with a card and deck with replacements
    addMarketCard(state, 0, 'alohomora');
    const replacement = createCardInstance(state, 'descendo');
    replacement.zone = 'market';
    state.market.deck = [replacement.instanceId];

    state.currentPhase = 'HERO_ACTION';
    expect(buyCard(state, 'harry', 0)).toBe(true);

    // Slot should be refilled from deck
    const newCard = getCardInstance(state, state.market.availableCards[0]!);
    expect(newCard?.cardId).toBe('descendo');
  });

  it('should not allow buying from an empty market slot', () => {
    const state = buildTestState(7);
    const player = state.players.harry!;
    player.moneyTokens = 10;

    // Slot 0 is empty (default)
    state.market.availableCards[0] = '';
    state.currentPhase = 'HERO_ACTION';

    expect(buyCard(state, 'harry', 0)).toBe(false);
    expect(player.moneyTokens).toBe(10); // unchanged
  });

  it('should not allow duplicate card types in face-up market after refill', () => {
    const state = buildTestState(7);

    // Put reparo in slot 0
    addMarketCard(state, 0, 'reparo');

    // Deck has a duplicate reparo and a distinct incendio
    const reparoDup = createCardInstance(state, 'reparo');
    reparoDup.zone = 'market';
    const incendio = createCardInstance(state, 'incendio');
    incendio.zone = 'market';
    state.market.deck = [reparoDup.instanceId, incendio.instanceId];

    // Empty slots 1-5
    state.market.availableCards = [state.market.availableCards[0]!, '', '', '', '', ''];

    refillMarket(state);

    // Slot 1 should get incendio, not the duplicate reparo
    const slot1Card = getCardInstance(state, state.market.availableCards[1]!);
    expect(slot1Card?.cardId).toBe('incendio');
  });

  it('should set up game 1 with 4 unique face-up market cards', () => {
    const state = createInitialGameState();
    setupGame(state, 1, ['harry'], 42);

    expect(state.marketSpaces).toBe(4);
    expect(state.market.availableCards.length).toBe(4);
    const faceUpCards = state.market.availableCards.filter(Boolean);
    expect(faceUpCards.length).toBe(4);

    const cardIds = faceUpCards.map((id) => getCardInstance(state, id)?.cardId ?? '');
    expect(new Set(cardIds).size).toBe(4); // all unique
  });

  it('should not allow buying outside hero action phase', () => {
    const state = buildTestState(7);
    const player = state.players.harry!;
    player.moneyTokens = 10;

    addMarketCard(state, 0, 'alohomora');

    state.currentPhase = 'DARK_ARTS';
    expect(buyCard(state, 'harry', 0)).toBe(false);

    state.currentPhase = 'CLEANUP';
    expect(buyCard(state, 'harry', 0)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 6. Villain Defeat Chain
// ---------------------------------------------------------------------------

describe('Villain Defeat Chain', () => {
  it('should defeat villain when attack reduces HP to 0', () => {
    const state = buildTestState(7);
    const player = state.players.harry!;
    player.attackTokens = 5;

    state.activeVillains = [];
    addActiveVillain(state, 'dracomalfoy', 3); // only 3 HP

    state.currentPhase = 'HERO_ACTION';
    expect(attackVillainWithAmount(state, 'harry', 0, 3)).toBe(true);

    expect(state.activeVillains[0]!.currentHp).toBe(0);
    expect(state.activeVillains[0]!.isActive).toBe(false);
    expect(player.attackTokens).toBe(2); // 5 - 3
    expect(player.villainsKilledThisTurn).toBe(1);
  });

  it('should resolve villain death effect on defeat', () => {
    const state = buildTestState(7);
    const player = state.players.harry!;
    player.attackTokens = 10;

    // Quirrell death effect: all players gain 1 money and 1 health
    state.activeVillains = [];
    addActiveVillain(state, 'quirrell', 2);
    player.health = 5; // damaged, so healing is visible

    state.currentPhase = 'HERO_ACTION';
    expect(attackVillainWithAmount(state, 'harry', 0, 2)).toBe(true);

    // Death effect: gain 1 influence + heal 1
    expect(player.moneyTokens).toBe(1);
    expect(player.health).toBe(6);
  });

  it('should replace defeated villain from deck during cleanup', () => {
    const state = buildTestState(7);
    const player = state.players.harry!;
    player.attackTokens = 10;

    state.activeVillains = [];
    addActiveVillain(state, 'dracomalfoy', 1);
    state.villainDeck = ['quirrell'];
    state.darkArtsDeck = [];
    state.currentLocation = {
      locationId: 'castlegates',
      currentControl: 0,
      maxControl: 5,
      darkArtsToReveal: 1,
    };

    for (let i = 0; i < 6; i += 1) {
      addCardToDeck(state, 'harry', 'alohomora');
    }

    state.currentPhase = 'HERO_ACTION';
    expect(attackVillainWithAmount(state, 'harry', 0, 1)).toBe(true);
    expect(state.activeVillains[0]!.isActive).toBe(false);

    // Villain deck should still have quirrell before cleanup
    expect(state.villainDeck).toEqual(['quirrell']);

    endTurn(state);

    // Defeated villain should be in discard, new villain from deck
    expect(state.villainDiscard).toContain('dracomalfoy');
    expect(state.activeVillains[0]!.villainId).toBe('quirrell');
    expect(state.activeVillains[0]!.isActive).toBe(true);
    expect(state.villainDeck).toEqual([]);
  });

  it('should not replace villain when villain deck is empty', () => {
    const state = buildTestState(7);
    const player = state.players.harry!;
    player.attackTokens = 10;

    state.activeVillains = [];
    addActiveVillain(state, 'dracomalfoy', 1);
    state.villainDeck = []; // empty
    state.darkArtsDeck = [];
    state.currentLocation = {
      locationId: 'castlegates',
      currentControl: 0,
      maxControl: 5,
      darkArtsToReveal: 1,
    };

    for (let i = 0; i < 6; i += 1) {
      addCardToDeck(state, 'harry', 'alohomora');
    }

    state.currentPhase = 'HERO_ACTION';
    expect(attackVillainWithAmount(state, 'harry', 0, 1)).toBe(true);

    endTurn(state);

    // Villain should be in discard, but no replacement
    expect(state.villainDiscard).toContain('dracomalfoy');
    expect(state.activeVillains[0]!.isActive).toBe(false);
    expect(state.villainDeck).toEqual([]);
  });

  it('should not allow attacking an inactive (defeated) villain', () => {
    const state = buildTestState(7);
    const player = state.players.harry!;
    player.attackTokens = 5;

    state.activeVillains = [
      {
        villainId: 'dracomalfoy',
        currentHp: 0,
        maxHp: 6,
        isActive: false,
        isBlocked: false,
        controlTokens: 0,
      },
    ];

    state.currentPhase = 'HERO_ACTION';
    expect(attackVillainWithAmount(state, 'harry', 0, 3)).toBe(false);
    expect(player.attackTokens).toBe(5); // unchanged
  });

  it('should not allow attacking with 0 attack tokens', () => {
    const state = buildTestState(7);
    const player = state.players.harry!;
    player.attackTokens = 0;

    state.activeVillains = [];
    addActiveVillain(state, 'dracomalfoy', 6);

    state.currentPhase = 'HERO_ACTION';
    expect(attackVillainWithAmount(state, 'harry', 0, 1)).toBe(false);
  });

  it('should track villains killed this turn for conditional effects', () => {
    const state = buildTestState(7);
    const player = state.players.harry!;
    player.attackTokens = 20;

    state.activeVillains = [];
    addActiveVillain(state, 'dracomalfoy', 1);
    state.villainDeck = [];

    state.currentPhase = 'HERO_ACTION';
    attackVillainWithAmount(state, 'harry', 0, 1);

    expect(player.villainsKilledThisTurn).toBe(1);

    // This counter should be used by conditional effects like
    // "if villain killed this turn"
    resolveEffect(
      {
        type: 'conditional',
        condition: { type: 'villain_killed_this_turn' },
        then: { type: 'gain_influence', params: { amount: 2 } },
      },
      { source: 'test', sourcePlayerId: 'harry', autoResolve: true },
      state,
    );
    expect(player.moneyTokens).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// 7. Dark Arts Phase
// ---------------------------------------------------------------------------

describe('Dark Arts Phase', () => {
  it('should reveal events based on location darkArtsToReveal setting', () => {
    const state = buildTestState(7);
    state.currentLocation = {
      locationId: 'hagridshut',
      currentControl: 0,
      maxControl: 6,
      darkArtsToReveal: 2, // hagridshut reveals 2
    };
    state.darkArtsDeck = ['expulso', 'petrification'];
    state.darkArtsDiscard = [];
    state.activeVillains = [];

    startTurn(state);
    completeDarkArtsPhase(state);

    expect(state.darkArtsPlayedThisTurn).toEqual(['expulso', 'petrification']);
    expect(state.darkArtsDiscard).toEqual(['expulso', 'petrification']);
  });

  it('should reveal 3 events for greathall location', () => {
    const state = buildTestState(7);
    state.currentLocation = {
      locationId: 'greathall',
      currentControl: 0,
      maxControl: 7,
      darkArtsToReveal: 3,
    };
    state.darkArtsDeck = ['expulso', 'flipendo', 'hewhomustnotbenamed'];
    state.darkArtsDiscard = [];
    state.activeVillains = [];

    startTurn(state);
    completeDarkArtsPhase(state);

    expect(state.darkArtsPlayedThisTurn.length).toBe(3);
  });

  it('should resolve dark arts effects on the active player', () => {
    const state = buildTestState(7);
    const player = state.players.harry!;
    state.currentLocation = {
      locationId: 'castlegates',
      currentControl: 0,
      maxControl: 5,
      darkArtsToReveal: 1,
    };
    state.darkArtsDeck = ['expulso']; // deals 2 damage to active player
    state.darkArtsDiscard = [];
    state.activeVillains = [];

    startTurn(state);
    completeDarkArtsPhase(state);

    expect(player.health).toBe(8); // 10 - 2
  });

  it('should add location control from dark arts events', () => {
    const state = buildTestState(7);
    state.currentLocation = {
      locationId: 'castlegates',
      currentControl: 0,
      maxControl: 5,
      darkArtsToReveal: 1,
    };
    state.darkArtsDeck = ['hewhomustnotbenamed']; // adds 1 control
    state.darkArtsDiscard = [];
    state.activeVillains = [];

    startTurn(state);
    completeDarkArtsPhase(state);

    expect(state.currentLocation!.currentControl).toBe(1);
  });

  it('should handle dark arts events that damage all players', () => {
    const state = buildTestState(7, ['harry', 'hermione']);
    state.currentLocation = {
      locationId: 'castlegates',
      currentControl: 0,
      maxControl: 5,
      darkArtsToReveal: 1,
    };
    state.darkArtsDeck = ['petrification']; // deals 1 damage to all players
    state.darkArtsDiscard = [];
    state.activeVillains = [];

    startTurn(state);
    completeDarkArtsPhase(state);

    expect(state.players.harry!.health).toBe(9); // 10 - 1
    expect(state.players.hermione!.health).toBe(9); // 10 - 1
  });

  it('should recycle dark arts discard when deck is empty', () => {
    const state = buildTestState(7);
    state.currentLocation = {
      locationId: 'castlegates',
      currentControl: 0,
      maxControl: 5,
      darkArtsToReveal: 1,
    };
    state.darkArtsDeck = []; // empty deck
    state.darkArtsDiscard = ['expulso', 'flipendo']; // cards in discard
    state.activeVillains = [];

    startTurn(state);
    completeDarkArtsPhase(state);

    // Should have drawn from recycled discard
    expect(state.darkArtsPlayedThisTurn.length).toBe(1);
    expect(state.darkArtsDeck.length).toBe(1); // one left after drawing one
  });

  it('should clear darkArtsPlayedThisTurn at the start of each new turn', () => {
    const state = buildTestState(7);
    state.currentLocation = {
      locationId: 'castlegates',
      currentControl: 0,
      maxControl: 5,
      darkArtsToReveal: 1,
    };
    state.darkArtsDeck = ['expulso'];
    state.darkArtsDiscard = [];
    state.activeVillains = [];

    startTurn(state);
    completeDarkArtsPhase(state);
    expect(state.darkArtsPlayedThisTurn).toEqual(['expulso']);

    // Second turn
    state.darkArtsDeck = ['flipendo'];
    startTurn(state);
    completeDarkArtsPhase(state);
    expect(state.darkArtsPlayedThisTurn).toEqual(['flipendo']);
    // Previous turn's events should be in discard, not in playedThisTurn
  });

  it('should chain reveal_extra_dark_arts effects', () => {
    const state = buildTestState(7);
    state.currentLocation = {
      locationId: 'castlegates',
      currentControl: 0,
      maxControl: 5,
      darkArtsToReveal: 1,
    };
    // crucio has reveal_extra_dark_arts which draws another event
    state.darkArtsDeck = ['crucio', 'expulso'];
    state.darkArtsDiscard = [];
    state.activeVillains = [];

    startTurn(state);
    completeDarkArtsPhase(state);

    // Should have played both: crucio + the chained extra event
    expect(state.darkArtsPlayedThisTurn).toEqual(['crucio', 'expulso']);
  });

  it('should handle empty dark arts deck and discard gracefully', () => {
    const state = buildTestState(7);
    state.currentLocation = {
      locationId: 'castlegates',
      currentControl: 0,
      maxControl: 5,
      darkArtsToReveal: 1,
    };
    state.darkArtsDeck = [];
    state.darkArtsDiscard = [];
    state.activeVillains = [];

    // Should not throw
    startTurn(state);
    completeDarkArtsPhase(state);
    expect(state.darkArtsPlayedThisTurn).toEqual([]);
    expect(state.currentPhase).toBe('HERO_ACTION');
  });
});

// ---------------------------------------------------------------------------
// 8. Setup Game Integration
// ---------------------------------------------------------------------------

describe('Full Game Setup Integration', () => {
  it('should set up game 1 with correct starting state for single player', () => {
    const state = createInitialGameState();
    setupGame(state, 1, ['harry'], 42);

    // Player state
    expect(state.currentPlayerId).toBe('harry');
    expect(state.players.harry).toBeDefined();
    expect(state.players.harry!.health).toBeGreaterThan(0);
    expect(state.players.harry!.hand.length).toBe(5);

    // Villains
    expect(state.activeVillains.length).toBe(1); // game 1 has 1 villain slot
    expect(state.activeVillains[0]!.isActive).toBe(true);

    // Location
    expect(state.currentLocation).not.toBeNull();
    expect(state.currentLocation!.locationId).toBe('castlegates');

    // Market
    expect(state.marketSpaces).toBe(4);
    expect(state.market.availableCards.length).toBe(4);
    const faceUpCards = state.market.availableCards.filter(Boolean);
    expect(faceUpCards.length).toBe(4);

    // Decks
    expect(state.villainDeck.length).toBeGreaterThan(0);
    expect(state.darkArtsDeck.length).toBeGreaterThan(0);
    expect(state.locationDeck.length).toBeGreaterThan(0);

    // Game state
    expect(state.isGameOver).toBe(false);
    expect(state.isVictory).toBe(false);
    expect(state.gameNumber).toBe(1);
  });

  it('should set up game 1 with correct starting state for multiple players', () => {
    const state = createInitialGameState();
    setupGame(state, 1, ['harry', 'ron'], 42);

    expect(state.turnOrder).toEqual(['harry', 'ron']);
    expect(state.players.harry).toBeDefined();
    expect(state.players.ron).toBeDefined();
    expect(state.players.harry!.hand.length).toBe(5);
    expect(state.players.ron!.hand.length).toBe(5);
  });

  it('should set up game 3 with 2 villain slots', () => {
    const state = createInitialGameState();
    setupGame(state, 3, ['harry'], 42);

    expect(state.activeVillains.length).toBe(2);
    expect(state.activeVillains.every((v) => v.isActive)).toBe(true);
  });

  it('should produce deterministic setup with the same seed', () => {
    const state1 = createInitialGameState();
    setupGame(state1, 1, ['harry'], 999);

    const state2 = createInitialGameState();
    setupGame(state2, 1, ['harry'], 999);

    // Same seed should produce same villain order
    expect(state1.activeVillains[0]!.villainId).toBe(state2.activeVillains[0]!.villainId);
    expect(state1.darkArtsDeck).toEqual(state2.darkArtsDeck);

    // Same market cards
    const market1 = state1.market.availableCards.map((id) => getCardInstance(state1, id)?.cardId);
    const market2 = state2.market.availableCards.map((id) => getCardInstance(state2, id)?.cardId);
    expect(market1).toEqual(market2);
  });
});
