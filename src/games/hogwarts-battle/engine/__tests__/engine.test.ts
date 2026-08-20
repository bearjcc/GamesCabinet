import { describe, expect, it } from 'vitest';
import { resolveEffect, resolveEffects } from '../effectResolver';
import {
  addLocationControl,
  createCardInstance,
  getCardInstance,
  initializeRng,
  refillMarket,
} from '../gameState';
import {
  attackVillainWithAmount,
  buyCard,
  completeDarkArtsPhase,
  endTurn,
  playAllCards,
  playCard,
  resolveChoice,
  setupGame,
  startTurn,
} from '../turnLogic';
import { createInitialGameState } from '../types';
import { addMarketCard, buildTestState } from './helpers/testGameState';

function faceUpMarketCardIds(state: ReturnType<typeof createInitialGameState>): string[] {
  return state.market.availableCards
    .filter(Boolean)
    .map((instanceId) => getCardInstance(state, instanceId)?.cardId ?? '');
}

function buildCleanupState() {
  const state = createInitialGameState();
  initializeRng(7, state);
  const player = {
    name: 'Harry',
    characterId: 'harry',
    proficiencyId: '',
    health: 10,
    maxHealth: 10,
    attackTokens: 0,
    moneyTokens: 0,
    moneyTokensSpentThisTurn: 0,
    deck: [],
    hand: [],
    discard: [],
    playArea: [],
    isStunned: false,
    spellsPlayedThisTurn: 0,
    itemsPlayedThisTurn: 0,
    alliesPlayedThisTurn: 0,
    villainsKilledThisTurn: 0,
    hasHealedThisTurn: false,
    abilityUsedThisTurn: false,
    firstCardDrawnThisTurn: false,
    proficiencyUsedThisTurn: false,
    healAmountThisTurn: 0,
    attackedCreatureThisTurn: false,
    destroyedHorcruxIds: [],
    patronusId: '',
    patronusUsedThisTurn: false,
    patronusCharges: 0,
    patronusShield: false,
    charmUsedThisTurn: false,
    hasCycledMarket: false,
    gatheredIngredients: [],
    darkArtsPotionId: null,
    villainsAttackedThisTurn: {},
  };
  state.players.harry = player;
  state.currentPlayerId = 'harry';
  state.turnOrder = ['harry'];
  state.villainDeck = ['draco'];
  state.darkArtsDeck = [];
  state.market.availableCards = ['', '', '', '', '', ''];
  state.marketSpaces = 6;
  state.currentLocation = {
    locationId: 'castlegates',
    currentControl: 0,
    maxControl: 5,
    darkArtsToReveal: 1,
  };
  state.currentPhase = 'HERO_ACTION';
  return state;
}

describe('GameState', () => {
  it('roundtrips via structuredClone', () => {
    const state = createInitialGameState();
    initializeRng(42, state);
    state.players.harry = {
      ...buildCleanupState().players.harry!,
      health: 7,
      attackTokens: 3,
    };
    state.currentPlayerId = 'harry';
    state.turnNumber = 2;
    const copy = structuredClone(state);
    expect(copy.players.harry?.health).toBe(7);
    expect(copy.rngSeed).toBe(42);
  });

  it('caps location control at max', () => {
    const state = buildCleanupState();
    state.currentLocation!.currentControl = 4;
    addLocationControl(state, 3);
    expect(state.currentLocation!.currentControl).toBe(5);
  });
});

describe('Stun sequence', () => {
  it('stuns hero and discards half hand', () => {
    const state = buildCleanupState();
    const player = state.players.harry!;
    player.health = 2;
    for (let i = 0; i < 5; i += 1) {
      const card = createCardInstance(state, `test_${i}`);
      card.ownerPlayer = 'harry';
      card.zone = 'hand';
      player.hand.push(card.instanceId);
    }
    resolveEffect(
      { type: 'deal_damage', params: { amount: 3, target: 'active_player' } },
      { source: 'test', sourcePlayerId: 'harry' },
      state,
    );
    expect(player.isStunned).toBe(true);
    expect(player.hand.length).toBe(3);
    expect(state.currentLocation!.currentControl).toBe(1);
  });
});

describe('Villain replacement', () => {
  it('waits until cleanup to replace defeated villain', () => {
    const state = buildCleanupState();
    const player = state.players.harry!;
    player.attackTokens = 1;
    state.villainDeck = ['quirrell'];
    state.activeVillains = [
      {
        villainId: 'dracomalfoy',
        currentHp: 1,
        maxHp: 1,
        isActive: true,
        isBlocked: false,
        controlTokens: 0,
      },
    ];
    expect(attackVillainWithAmount(state, 'harry', 0, 1)).toBe(true);
    expect(state.activeVillains[0]!.isActive).toBe(false);
    expect(state.villainDeck).toEqual(['quirrell']);

    endTurn(state);
    expect(state.villainDiscard).toContain('dracomalfoy');
    expect(state.activeVillains[0]!.villainId).toBe('quirrell');
    expect(state.activeVillains[0]!.isActive).toBe(true);
  });
});

describe('Purchase passives', () => {
  it('puts matching items on top of deck with wingardium leviosa', () => {
    const state = buildCleanupState();
    const player = state.players.harry!;
    player.moneyTokens = 3;
    const passive = createCardInstance(state, 'wingardiumleviosa');
    passive.zone = 'play_area';
    player.playArea.push(passive.instanceId);
    const item = createCardInstance(state, 'quidditchgear');
    item.zone = 'market';
    state.market.availableCards[0] = item.instanceId;

    expect(buyCard(state, 'harry', 0)).toBe(true);
    expect(player.deck[0]).toBe(item.instanceId);
    expect(item.zone).toBe('deck');
  });
});

describe('choose_one', () => {
  it('auto-resolves first option', () => {
    const state = buildCleanupState();
    resolveEffect(
      {
        type: 'choose_one',
        params: {
          options: [
            { label: 'Gain 2 attack', effect: { type: 'gain_attack', params: { amount: 2 } } },
            { label: 'Gain 1 attack', effect: { type: 'gain_attack', params: { amount: 1 } } },
          ],
        },
      },
      { source: 'test', sourcePlayerId: 'harry', autoResolve: true },
      state,
    );
    expect(state.players.harry!.attackTokens).toBe(2);
  });

  it('creates pending choice and resolveChoice applies selected option', () => {
    const state = buildCleanupState();
    resolveEffect(
      {
        type: 'choose_one',
        params: {
          options: [
            { label: 'Gain 2 attack', effect: { type: 'gain_attack', params: { amount: 2 } } },
            { label: 'Gain 1 attack', effect: { type: 'gain_attack', params: { amount: 1 } } },
          ],
        },
      },
      { source: 'card_play', sourcePlayerId: 'harry', autoResolve: false },
      state,
    );
    expect(state.pendingChoice).not.toBeNull();
    expect(state.players.harry!.attackTokens).toBe(0);
    expect(resolveChoice(state, 1)).toBe(true);
    expect(state.pendingChoice).toBeNull();
    expect(state.players.harry!.attackTokens).toBe(1);
  });
});

describe('playAllCards', () => {
  it('plays automatic cards before queueing decision cards one at a time', () => {
    const state = buildCleanupState();
    const player = state.players.harry!;
    const firstChoice = createCardInstance(state, 'pigwidgeon');
    const autoCard = createCardInstance(state, 'alohomora');
    const secondChoice = createCardInstance(state, 'crookshanks');

    for (const card of [firstChoice, autoCard, secondChoice]) {
      card.ownerPlayer = 'harry';
      card.zone = 'hand';
      player.hand.push(card.instanceId);
    }

    expect(playAllCards(state, 'harry')).toBe(true);
    expect(player.moneyTokens).toBe(1);
    expect(player.hand).toEqual([secondChoice.instanceId]);
    expect(player.playArea).toEqual([autoCard.instanceId, firstChoice.instanceId]);
    expect(state.pendingChoice).not.toBeNull();
    expect(state.playAllDecisionQueue).toEqual([secondChoice.instanceId]);

    expect(resolveChoice(state, 0)).toBe(true);
    expect(player.attackTokens).toBe(1);
    expect(player.hand).toEqual([]);
    expect(player.playArea).toEqual([
      autoCard.instanceId,
      firstChoice.instanceId,
      secondChoice.instanceId,
    ]);
    expect(state.pendingChoice).not.toBeNull();
    expect(state.playAllDecisionQueue).toEqual([]);

    expect(resolveChoice(state, 1)).toBe(true);
    expect(state.pendingChoice).toBeNull();
  });
});

describe('discard_cards', () => {
  it('discards from hand end for active player', () => {
    const state = buildCleanupState();
    const player = state.players.harry!;
    for (let i = 0; i < 3; i += 1) {
      const card = createCardInstance(state, `discard_${i}`);
      card.ownerPlayer = 'harry';
      card.zone = 'hand';
      player.hand.push(card.instanceId);
    }
    resolveEffect(
      { type: 'discard_cards', params: { amount: 2, target: 'active_player' } },
      { source: 'dark_arts', sourcePlayerId: 'harry', autoResolve: true },
      state,
    );
    expect(player.hand.length).toBe(1);
    expect(player.discard.length).toBe(2);
  });
});

describe('Attack application', () => {
  it('defeats villain when applying assigned damage amount', () => {
    const state = buildCleanupState();
    const player = state.players.harry!;
    player.attackTokens = 3;
    state.attackAssignments['0'] = 2;
    state.activeVillains = [
      {
        villainId: 'dracomalfoy',
        currentHp: 2,
        maxHp: 2,
        isActive: true,
        isBlocked: false,
        controlTokens: 0,
      },
    ];
    expect(attackVillainWithAmount(state, 'harry', 0, 2)).toBe(true);
    expect(player.attackTokens).toBe(1);
    expect(state.activeVillains[0]!.isActive).toBe(false);
    state.attackAssignments['0'] = 0;
    endTurn(state);
    expect(state.villainDiscard).toContain('dracomalfoy');
  });
});

describe('Conditional effects', () => {
  it('resolves data-backed conditions', () => {
    const state = buildCleanupState();
    const player = state.players.harry!;
    player.itemsPlayedThisTurn = 1;
    player.alliesPlayedThisTurn = 1;
    const fred = createCardInstance(state, 'fredweasley');
    fred.zone = 'play_area';
    player.playArea.push(fred.instanceId);
    state.activeVillains = [
      {
        villainId: 'deatheater',
        currentHp: 5,
        maxHp: 5,
        isActive: true,
        isBlocked: false,
        controlTokens: 0,
      },
    ];

    const gainIf = (condition: Record<string, unknown>) => ({
      type: 'conditional' as const,
      condition,
      then: { type: 'gain_attack', params: { amount: 1 } },
    });

    const ctx = { source: 'test', sourcePlayerId: 'harry', autoResolve: true };
    resolveEffects(
      [
        gainIf({ type: 'ally_played_this_turn' }),
        gainIf({ type: 'card_type_played_this_turn', card_type: 'item' }),
        gainIf({ type: 'card_in_play', card_id: 'fredweasley' }),
        gainIf({ type: 'at_max_health' }),
        gainIf({ type: 'villain_in_play', villain_id: 'deatheater' }),
      ],
      ctx,
      state,
    );
    expect(player.attackTokens).toBe(5);
  });
});

describe('Dark Arts lifecycle', () => {
  it('reveals count from location on startTurn and discards each draw', () => {
    const state = buildTestState();
    state.currentLocation!.darkArtsToReveal = 3;
    state.darkArtsDeck = ['expulso', 'flipendo', 'tarantallegra'];
    state.darkArtsDiscard = [];
    startTurn(state);
    completeDarkArtsPhase(state);
    expect(state.darkArtsPlayedThisTurn).toEqual(['expulso', 'flipendo', 'tarantallegra']);
    expect(state.darkArtsDiscard).toEqual(['expulso', 'flipendo', 'tarantallegra']);
    expect(state.darkArtsDeck).toEqual([]);
  });

  it('clears visible list on next startTurn before new reveals', () => {
    const state = buildTestState(7, ['harry', 'hermione']);
    state.currentLocation!.darkArtsToReveal = 1;
    state.darkArtsDeck = ['expulso', 'flipendo'];
    state.currentPlayerId = 'harry';
    startTurn(state);
    completeDarkArtsPhase(state);
    expect(state.darkArtsPlayedThisTurn).toEqual(['expulso']);

    state.currentPlayerId = 'hermione';
    state.darkArtsDeck = ['flipendo'];
    startTurn(state);
    completeDarkArtsPhase(state);
    expect(state.darkArtsPlayedThisTurn).toEqual(['flipendo']);
    expect(state.darkArtsDiscard).toContain('expulso');
  });

  it('chains reveal_extra_dark_arts during dark arts phase', () => {
    const state = buildTestState();
    state.currentLocation!.darkArtsToReveal = 1;
    state.darkArtsDeck = ['crucio', 'expulso'];
    state.darkArtsDiscard = [];
    startTurn(state);
    completeDarkArtsPhase(state);
    expect(state.darkArtsPlayedThisTurn).toEqual(['crucio', 'expulso']);
    expect(state.darkArtsDiscard).toEqual(['crucio', 'expulso']);
  });
});

describe('market face-up uniqueness', () => {
  it('setup has no duplicate card types in face-up market', () => {
    for (const seed of [1, 42, 99, 12345]) {
      const state = createInitialGameState();
      setupGame(state, 1, ['harry'], seed);
      const cardIds = faceUpMarketCardIds(state);
      expect(new Set(cardIds).size).toBe(cardIds.length);
    }
  });

  it('refill leaves slot empty when deck only has duplicates of face-up cards', () => {
    const state = buildTestState();
    addMarketCard(state, 0, 'reparo');
    const reparoA = createCardInstance(state, 'reparo');
    const reparoB = createCardInstance(state, 'reparo');
    reparoA.zone = 'market';
    reparoB.zone = 'market';
    state.market.deck = [reparoA.instanceId, reparoB.instanceId];
    state.market.availableCards = [state.market.availableCards[0]!, '', '', '', '', ''];
    refillMarket(state);
    expect(state.market.availableCards[1]).toBe('');
    expect(state.market.deck).toHaveLength(2);
  });

  it('refill skips duplicate and reveals next distinct card', () => {
    const state = buildTestState();
    addMarketCard(state, 0, 'reparo');
    const reparoDup = createCardInstance(state, 'reparo');
    const incendio = createCardInstance(state, 'incendio');
    reparoDup.zone = 'market';
    incendio.zone = 'market';
    state.market.deck = [reparoDup.instanceId, incendio.instanceId];
    state.market.availableCards = [state.market.availableCards[0]!, '', '', '', '', ''];
    refillMarket(state);
    expect(getCardInstance(state, state.market.availableCards[1]!)?.cardId).toBe('incendio');
    expect(state.market.deck).toEqual([reparoDup.instanceId]);
  });
});

describe('start_game smoke', () => {
  it('sets up game 1 for harry', () => {
    const state = createInitialGameState();
    setupGame(state, 1, ['harry'], 12345);
    expect(state.currentPlayerId).toBe('harry');
    expect(state.players.harry?.hand.length).toBeGreaterThan(0);
    expect(state.activeVillains.length).toBe(1);
    expect(state.marketSpaces).toBe(4);
    expect(state.market.availableCards.length).toBe(4);
    expect(state.market.availableCards.filter(Boolean).length).toBe(4);
    expect(new Set(faceUpMarketCardIds(state)).size).toBe(4);
  });

  it('starts at location 1 of the campaign stack (ordered, not shuffled)', () => {
    for (const seed of [1, 42, 99, 12345]) {
      const state = createInitialGameState();
      setupGame(state, 1, ['harry'], seed);
      expect(state.currentLocation?.locationId).toBe('castlegates');
      expect(state.locationDeck).toEqual(['hagridshut', 'greathall']);
      expect(state.locationDiscard).toEqual([]);
    }
  });
});

describe('Hero play and end turn', () => {
  it('plays card and redraws on cleanup', () => {
    const state = createInitialGameState();
    setupGame(state, 1, ['harry'], 99);
    state.currentPhase = 'HERO_ACTION';
    const player = state.players.harry!;
    const handBefore = player.hand.length;
    const cardId = player.hand[0]!;
    expect(playCard(state, 'harry', cardId)).toBe(true);
    expect(player.playArea).toContain(cardId);
    endTurn(state);
    expect(player.hand.length).toBeGreaterThanOrEqual(handBefore - 1);
  });
});

describe('Location loss', () => {
  it('advances location when deck remains', () => {
    const state = buildCleanupState();
    state.locationDeck = ['hagridshut'];
    state.currentLocation!.currentControl = 5;
    endTurn(state);
    expect(state.isGameOver).toBe(false);
    expect(state.locationDiscard).toContain('castlegates');
    expect(state.currentLocation!.locationId).toBe('hagridshut');
  });

  it('loses when final location captured', () => {
    const state = buildCleanupState();
    state.locationDeck = [];
    state.currentLocation!.currentControl = 5;
    endTurn(state);
    expect(state.isGameOver).toBe(true);
    expect(state.isVictory).toBe(false);
  });
});

describe('Stun recovery at cleanup', () => {
  it('revives stunned hero at cleanup', () => {
    const state = buildCleanupState();
    const player = state.players.harry!;
    player.health = 0;
    player.isStunned = true;
    endTurn(state);
    expect(player.isStunned).toBe(false);
    expect(player.health).toBe(10);
  });
});
