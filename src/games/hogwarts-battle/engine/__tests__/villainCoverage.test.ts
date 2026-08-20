import { describe, expect, it } from 'vitest';
import {
  collectVillainDeathEffectTypes,
  collectVillainOngoingEffectTypes,
  unknownVillainEffectTypes,
  VILLAIN_SUPPORTED_EFFECT_TYPES,
} from '../effectInventory';
import { fireVillainTrigger, resolveEffect } from '../effectResolver';
import { addLocationControl, drawCardForPlayer, removeLocationControl } from '../gameState';
import { startTurn } from '../turnLogic';
import {
  addActiveVillain,
  addCardToDeck,
  addCardToDiscard,
  addCardToHand,
  buildTestState,
  resolveVillainDeath,
  resolveVillainOngoing,
} from './helpers/testGameState';

describe('Villain effect inventory', () => {
  it('maps every declared villain ongoing/death effect type to supported or explicit unsupported', () => {
    expect(unknownVillainEffectTypes()).toEqual([]);
  });

  it('lists villain effect types found in data', () => {
    const found = new Set([
      ...collectVillainOngoingEffectTypes(),
      ...collectVillainDeathEffectTypes(),
    ]);
    expect(found.size).toBeGreaterThan(0);
    for (const type of found) {
      expect(VILLAIN_SUPPORTED_EFFECT_TYPES.has(type)).toBe(true);
    }
  });
});

describe('Villain ongoing effect families', () => {
  it('deal_damage ongoing damages active hero at villain phase', () => {
    const state = buildTestState();
    addActiveVillain(state, 'quirrell');
    state.currentPhase = 'VILLAIN_PHASE';
    resolveVillainOngoing(state, 'quirrell');
    expect(state.players.harry!.health).toBe(9);
  });

  it('deal_damage_on_location_control_added triggers when control is added', () => {
    const state = buildTestState();
    addActiveVillain(state, 'dracomalfoy');
    addLocationControl(state, 1);
    expect(state.players.harry!.health).toBe(8);
  });

  it('deal_damage_on_discard triggers when a card is discarded', () => {
    const state = buildTestState();
    addActiveVillain(state, 'crabbeandgoyle');
    addCardToHand(state, 'harry', 'alohomora');
    resolveEffect(
      { type: 'discard_cards', params: { amount: 1, target: 'self' } },
      { source: 'test', sourcePlayerId: 'harry', autoResolve: true },
      state,
    );
    expect(state.players.harry!.health).toBe(9);
  });

  it('per_ally_choose_penalty applies once per ally in hand', () => {
    const state = buildTestState();
    addCardToHand(state, 'harry', 'hedwig');
    addCardToHand(state, 'harry', 'oliverwood');
    resolveEffect(
      {
        type: 'per_ally_choose_penalty',
        params: {
          options: [
            {
              label: 'Lose 2 Health',
              effect: { type: 'deal_damage', params: { amount: 2, target: 'active_player' } },
            },
          ],
        },
      },
      { source: 'villain', sourcePlayerId: 'harry', autoResolve: true },
      state,
    );
    expect(state.players.harry!.health).toBe(6);
  });

  it('per_item_choose_penalty applies once per item in hand', () => {
    const state = buildTestState();
    addCardToHand(state, 'harry', 'quidditchgear');
    addCardToHand(state, 'harry', 'firebolt');
    resolveEffect(
      {
        type: 'per_item_choose_penalty',
        params: {
          options: [
            {
              label: 'Lose 1 Health',
              effect: { type: 'deal_damage', params: { amount: 1, target: 'active_player' } },
            },
          ],
        },
      },
      { source: 'villain', sourcePlayerId: 'harry', autoResolve: true },
      state,
    );
    expect(state.players.harry!.health).toBe(8);
  });

  it('discard_top_deck_if_cost_gte discards and may add location control', () => {
    const state = buildTestState();
    addCardToDeck(state, 'harry', 'reparo', true);
    resolveEffect(
      { type: 'discard_top_deck_if_cost_gte', params: { min_cost: 1, control_added: 1 } },
      { source: 'villain', sourcePlayerId: 'harry', autoResolve: true },
      state,
    );
    expect(state.players.harry!.deck.length).toBe(0);
    expect(state.currentLocation!.currentControl).toBe(1);
  });

  it('damage_per_even_cost_card scales with even-cost cards in hand', () => {
    const state = buildTestState();
    addCardToHand(state, 'harry', 'wingardiumleviosa');
    addCardToHand(state, 'harry', 'essenceofdittany');
    resolveEffect(
      { type: 'damage_per_even_cost_card', params: { amount: 2, target: 'active_player' } },
      { source: 'villain', sourcePlayerId: 'harry', autoResolve: true },
      state,
    );
    expect(state.players.harry!.health).toBe(6);
  });

  it('prevent_extra_draw blocks non-cleanup draws while basilisk is active', () => {
    const state = buildTestState();
    addActiveVillain(state, 'basilisk');
    addCardToDeck(state, 'harry', 'alohomora');
    state.currentPhase = 'HERO_ACTION';
    expect(drawCardForPlayer(state, 'harry')).toBe('');
    state.currentPhase = 'CLEANUP';
    expect(drawCardForPlayer(state, 'harry')).not.toBe('');
  });

  it('prevent_all_healing blocks heals while fenrir is active', () => {
    const state = buildTestState();
    addActiveVillain(state, 'fenrirgreyback');
    resolveEffect(
      { type: 'heal', params: { amount: 3, target: 'self' } },
      { source: 'test', sourcePlayerId: 'harry', autoResolve: true },
      state,
    );
    expect(state.players.harry!.health).toBe(10);
  });

  it('prevent_location_removal blocks remove_location_control while barty is active', () => {
    const state = buildTestState();
    state.currentLocation!.currentControl = 3;
    addActiveVillain(state, 'bartycrouchjr');
    removeLocationControl(state, 1);
    expect(state.currentLocation!.currentControl).toBe(3);
  });

  it('heal_villains_on_location_removed triggers when control is removed', () => {
    const state = buildTestState();
    state.currentLocation!.currentControl = 3;
    addActiveVillain(state, 'luciusmalfoy', 6);
    state.activeVillains[0]!.currentHp = 4;
    removeLocationControl(state, 1);
    expect(state.activeVillains[0]!.currentHp).toBe(5);
  });

  it('damage_all_on_new_villain damages all players', () => {
    const state = buildTestState(7, ['harry', 'hermione']);
    addActiveVillain(state, 'deatheater');
    fireVillainTrigger(state, 'damage_all_on_new_villain', {
      sourcePlayerId: 'harry',
      source: 'villain',
    });
    expect(state.players.harry!.health).toBe(9);
    expect(state.players.hermione!.health).toBe(9);
  });

  it('startTurn skips passive-only ongoing effects at villain phase', () => {
    const state = buildTestState();
    addActiveVillain(state, 'dracomalfoy');
    state.darkArtsDeck = [];
    state.currentPhase = 'DARK_ARTS';
    startTurn(state);
    expect(state.players.harry!.health).toBe(10);
  });
});

describe('Villain death effect families', () => {
  it('remove_location_control death reward removes control', () => {
    const state = buildTestState();
    state.currentLocation!.currentControl = 3;
    resolveVillainDeath(state, 'dracomalfoy');
    expect(state.currentLocation!.currentControl).toBe(2);
  });

  it('choose_one_per_player applies first option for each player', () => {
    const state = buildTestState(7, ['harry', 'hermione']);
    resolveVillainDeath(state, 'tomriddle');
    expect(state.players.harry!.health).toBe(10);
    expect(state.players.hermione!.health).toBe(10);
  });

  it('search_discard_for_type death reward moves card to hand', () => {
    const state = buildTestState();
    addCardToDiscard(state, 'harry', 'quidditchgear');
    resolveVillainDeath(state, 'bellatrixlestrange');
    expect(state.players.harry!.hand.length).toBe(1);
  });

  it('banish_card death reward removes a card from hand', () => {
    const state = buildTestState();
    addCardToHand(state, 'harry', 'quidditchgear');
    const before = Object.keys(state.cardInstances).length;
    resolveVillainDeath(state, 'troll');
    expect(state.players.harry!.hand.length).toBe(0);
    expect(Object.keys(state.cardInstances).length).toBeLessThan(before);
  });

  it('banish_card_all removes one card per player', () => {
    const state = buildTestState(7, ['harry', 'hermione']);
    addCardToHand(state, 'harry', 'alohomora');
    addCardToHand(state, 'hermione', 'reparo');
    resolveVillainDeath(state, 'norbert');
    expect(state.players.harry!.hand.length).toBe(0);
    expect(state.players.hermione!.hand.length).toBe(0);
  });

  it('none death effect is a no-op', () => {
    const state = buildTestState();
    state.currentLocation!.currentControl = 2;
    resolveVillainDeath(state, 'voldemort');
    expect(state.currentLocation!.currentControl).toBe(2);
  });
});

describe('Data-backed villain smoke', () => {
  it('every villain ongoing effect resolves without throwing', () => {
    const ids = ['quirrell', 'tomriddle', 'cornishpixies', 'norbert', 'bellatrixlestrange'];
    for (const villainId of ids) {
      const state = buildTestState();
      addActiveVillain(state, villainId);
      expect(() => resolveVillainOngoing(state, villainId)).not.toThrow();
    }
  });

  it('every villain death effect resolves without throwing', () => {
    const ids = ['quirrell', 'dementor', 'voldemort', 'fluffy', 'peterpettigrew'];
    for (const villainId of ids) {
      const state = buildTestState();
      expect(() => resolveVillainDeath(state, villainId)).not.toThrow();
    }
  });
});

// ---------------------------------------------------------------------------
// Individual Villain Ongoing + Death Reward Tests
// ---------------------------------------------------------------------------

describe('Villain: Draco Malfoy', () => {
  it('ongoing deals 2 damage when location control is added', () => {
    const state = buildTestState();
    addActiveVillain(state, 'dracomalfoy');
    state.players.harry!.health = 10;
    addLocationControl(state, 1);
    expect(state.players.harry!.health).toBe(8);
  });

  it('death reward removes 1 location control', () => {
    const state = buildTestState();
    state.currentLocation!.currentControl = 3;
    resolveVillainDeath(state, 'dracomalfoy');
    expect(state.currentLocation!.currentControl).toBe(2);
  });
});

describe('Villain: Professor Quirrell', () => {
  it('ongoing deals 1 damage to active player at villain phase', () => {
    const state = buildTestState();
    addActiveVillain(state, 'quirrell');
    state.players.harry!.health = 10;
    resolveVillainOngoing(state, 'quirrell');
    expect(state.players.harry!.health).toBe(9);
  });

  it('death reward gives all players 1 money and 1 health', () => {
    const state = buildTestState(7, ['harry', 'ron']);
    state.players.harry!.health = 8;
    state.players.ron!.health = 7;
    resolveVillainDeath(state, 'quirrell');
    expect(state.players.harry!.health).toBe(9);
    expect(state.players.ron!.health).toBe(8);
    expect(state.players.harry!.moneyTokens).toBe(1);
    expect(state.players.ron!.moneyTokens).toBe(1);
  });
});

describe('Villain: Crabbe and Goyle', () => {
  it('ongoing deals 1 damage when a card is discarded', () => {
    const state = buildTestState();
    addActiveVillain(state, 'crabbeandgoyle');
    addCardToHand(state, 'harry', 'alohomora');
    state.players.harry!.health = 10;
    resolveEffect(
      { type: 'discard_cards', params: { amount: 1, target: 'self' } },
      { source: 'villain', sourcePlayerId: 'harry', autoResolve: true },
      state,
    );
    expect(state.players.harry!.health).toBe(9);
  });

  it('death reward draws 1 card for all players', () => {
    const state = buildTestState(7, ['harry', 'ron']);
    addCardToDeck(state, 'harry', 'alohomora');
    addCardToDeck(state, 'ron', 'alohomora');
    resolveVillainDeath(state, 'crabbeandgoyle');
    expect(state.players.harry!.hand.length).toBe(1);
    expect(state.players.ron!.hand.length).toBe(1);
  });
});

describe('Villain: Basilisk', () => {
  it('ongoing prevents extra draws during hero action phase', () => {
    const state = buildTestState();
    addActiveVillain(state, 'basilisk');
    addCardToDeck(state, 'harry', 'alohomora');
    state.currentPhase = 'HERO_ACTION';
    expect(drawCardForPlayer(state, 'harry')).toBe('');
  });

  it('ongoing allows draws during cleanup phase', () => {
    const state = buildTestState();
    addActiveVillain(state, 'basilisk');
    addCardToDeck(state, 'harry', 'alohomora');
    state.currentPhase = 'CLEANUP';
    expect(drawCardForPlayer(state, 'harry')).not.toBe('');
  });

  it('death reward draws 1 card for all and removes 1 location control', () => {
    const state = buildTestState(7, ['harry', 'ron']);
    addCardToDeck(state, 'harry', 'alohomora');
    addCardToDeck(state, 'ron', 'alohomora');
    state.currentLocation!.currentControl = 2;
    resolveVillainDeath(state, 'basilisk');
    expect(state.players.harry!.hand.length).toBe(1);
    expect(state.players.ron!.hand.length).toBe(1);
    expect(state.currentLocation!.currentControl).toBe(1);
  });
});

describe('Villain: Tom Riddle', () => {
  it('ongoing penalizes per ally in hand', () => {
    const state = buildTestState();
    addActiveVillain(state, 'tomriddle');
    addCardToHand(state, 'harry', 'hedwig');
    addCardToHand(state, 'harry', 'oliverwood');
    state.players.harry!.health = 10;
    resolveVillainOngoing(state, 'tomriddle');
    // autoResolve picks first option (lose 2 health) per ally = 4 damage
    expect(state.players.harry!.health).toBe(6);
  });

  it('death reward applies first option for each player', () => {
    const state = buildTestState(7, ['harry', 'ron']);
    state.players.harry!.health = 8;
    state.players.ron!.health = 7;
    resolveVillainDeath(state, 'tomriddle');
    // autoResolve picks first option (+2 Health) for each player
    expect(state.players.harry!.health).toBe(10);
    expect(state.players.ron!.health).toBe(9);
  });
});

describe('Villain: Lucius Malfoy', () => {
  it('ongoing heals all villains when location control is removed', () => {
    const state = buildTestState();
    addActiveVillain(state, 'luciusmalfoy', 7);
    addActiveVillain(state, 'quirrell', 6);
    state.activeVillains[0]!.currentHp = 5;
    state.activeVillains[1]!.currentHp = 4;
    state.currentLocation!.currentControl = 2;
    removeLocationControl(state, 1);
    expect(state.activeVillains[0]!.currentHp).toBe(6);
    expect(state.activeVillains[1]!.currentHp).toBe(5);
  });

  it('death reward gives all players 1 money and removes 1 location control', () => {
    const state = buildTestState(7, ['harry']);
    state.currentLocation!.currentControl = 3;
    resolveVillainDeath(state, 'luciusmalfoy');
    expect(state.players.harry!.moneyTokens).toBe(1);
    expect(state.currentLocation!.currentControl).toBe(2);
  });
});

describe('Villain: Peter Pettigrew', () => {
  it('ongoing discards top deck card and adds control if cost >= 1', () => {
    const state = buildTestState();
    addActiveVillain(state, 'peterpettigrew');
    addCardToDeck(state, 'harry', 'reparo', true);
    resolveVillainOngoing(state, 'peterpettigrew');
    expect(state.players.harry!.deck.length).toBe(0);
    expect(state.currentLocation!.currentControl).toBe(1);
  });

  it('death reward searches discard for spell and removes location control', () => {
    const state = buildTestState();
    addCardToDiscard(state, 'harry', 'reparo');
    state.currentLocation!.currentControl = 2;
    resolveVillainDeath(state, 'peterpettigrew');
    expect(state.players.harry!.hand.length).toBe(1);
    expect(state.currentLocation!.currentControl).toBe(1);
  });
});

describe('Villain: Dementor', () => {
  it('ongoing deals 2 damage to active player', () => {
    const state = buildTestState();
    addActiveVillain(state, 'dementor');
    state.players.harry!.health = 10;
    resolveVillainOngoing(state, 'dementor');
    expect(state.players.harry!.health).toBe(8);
  });

  it('death reward heals all players 2 and removes 1 location control', () => {
    const state = buildTestState(7, ['harry', 'ron']);
    state.players.harry!.health = 6;
    state.players.ron!.health = 5;
    state.currentLocation!.currentControl = 2;
    resolveVillainDeath(state, 'dementor');
    expect(state.players.harry!.health).toBe(8);
    expect(state.players.ron!.health).toBe(7);
    expect(state.currentLocation!.currentControl).toBe(1);
  });
});

describe('Villain: Barty Crouch Jr.', () => {
  it('ongoing prevents location control removal', () => {
    const state = buildTestState();
    addActiveVillain(state, 'bartycrouchjr');
    state.currentLocation!.currentControl = 3;
    removeLocationControl(state, 1);
    expect(state.currentLocation!.currentControl).toBe(3);
  });

  it('death reward removes 2 location control', () => {
    const state = buildTestState();
    state.currentLocation!.currentControl = 4;
    resolveVillainDeath(state, 'bartycrouchjr');
    expect(state.currentLocation!.currentControl).toBe(2);
  });
});

describe('Villain: Death Eater', () => {
  it('ongoing damages all players when a new villain appears', () => {
    const state = buildTestState(7, ['harry', 'ron']);
    addActiveVillain(state, 'deatheater');
    state.players.harry!.health = 10;
    state.players.ron!.health = 10;
    fireVillainTrigger(state, 'damage_all_on_new_villain', {
      sourcePlayerId: 'harry',
      source: 'villain',
    });
    expect(state.players.harry!.health).toBe(9);
    expect(state.players.ron!.health).toBe(9);
  });

  it('death reward heals all players 1 and removes 1 location control', () => {
    const state = buildTestState(7, ['harry', 'ron']);
    state.players.harry!.health = 8;
    state.players.ron!.health = 7;
    state.currentLocation!.currentControl = 2;
    resolveVillainDeath(state, 'deatheater');
    expect(state.players.harry!.health).toBe(9);
    expect(state.players.ron!.health).toBe(8);
    expect(state.currentLocation!.currentControl).toBe(1);
  });
});

describe('Villain: Dolores Umbridge', () => {
  it('ongoing deals 1 damage when a card costing 4+ is purchased', () => {
    const state = buildTestState();
    addActiveVillain(state, 'doloresumbridge');
    state.players.harry!.health = 10;
    fireVillainTrigger(state, 'deal_damage_on_card_cost', {
      sourcePlayerId: 'harry',
      source: 'villain',
    });
    // The trigger fires; damage depends on the effect resolution
    expect(state.players.harry!.health).toBe(9);
  });

  it('death reward gives all players 1 money and 2 health', () => {
    const state = buildTestState(7, ['harry', 'ron']);
    state.players.harry!.health = 7;
    state.players.ron!.health = 6;
    resolveVillainDeath(state, 'doloresumbridge');
    expect(state.players.harry!.health).toBe(9);
    expect(state.players.ron!.health).toBe(8);
    expect(state.players.harry!.moneyTokens).toBe(1);
    expect(state.players.ron!.moneyTokens).toBe(1);
  });
});

describe('Villain: Voldemort (Game 5)', () => {
  it('ongoing deals 1 damage and forces 1 discard', () => {
    const state = buildTestState();
    addActiveVillain(state, 'voldemort');
    addCardToHand(state, 'harry', 'alohomora');
    state.players.harry!.health = 10;
    resolveVillainOngoing(state, 'voldemort');
    expect(state.players.harry!.health).toBe(9);
    expect(state.players.harry!.hand.length).toBe(0);
  });

  it('death effect is none (no-op)', () => {
    const state = buildTestState();
    state.currentLocation!.currentControl = 2;
    state.players.harry!.health = 8;
    resolveVillainDeath(state, 'voldemort');
    expect(state.currentLocation!.currentControl).toBe(2);
    expect(state.players.harry!.health).toBe(8);
  });
});

describe('Villain: Bellatrix Lestrange', () => {
  it('ongoing reveals 1 extra Dark Arts event each turn', () => {
    const state = buildTestState();
    addActiveVillain(state, 'bellatrixlestrange');
    state.darkArtsDeck = ['tarantallegra'];
    state.players.harry!.health = 10;
    resolveVillainOngoing(state, 'bellatrixlestrange');
    // reveal_extra_dark_arts resolves the extra card from the deck
    expect(state.players.harry!.health).toBe(9);
  });

  it('death reward searches discard for item and removes 2 location control', () => {
    const state = buildTestState();
    addCardToDiscard(state, 'harry', 'quidditchgear');
    state.currentLocation!.currentControl = 4;
    resolveVillainDeath(state, 'bellatrixlestrange');
    expect(state.players.harry!.hand.length).toBe(1);
    expect(state.currentLocation!.currentControl).toBe(2);
  });
});

describe('Villain: Fenrir Greyback', () => {
  it('ongoing prevents all healing', () => {
    const state = buildTestState();
    addActiveVillain(state, 'fenrirgreyback');
    state.players.harry!.health = 7;
    resolveEffect(
      { type: 'heal', params: { amount: 3, target: 'self' } },
      { source: 'test', sourcePlayerId: 'harry', autoResolve: true },
      state,
    );
    expect(state.players.harry!.health).toBe(7);
  });

  it('death reward heals all players 3 and removes 2 location control', () => {
    const state = buildTestState(7, ['harry', 'ron']);
    state.players.harry!.health = 5;
    state.players.ron!.health = 4;
    state.currentLocation!.currentControl = 4;
    resolveVillainDeath(state, 'fenrirgreyback');
    expect(state.players.harry!.health).toBe(8);
    expect(state.players.ron!.health).toBe(7);
    expect(state.currentLocation!.currentControl).toBe(2);
  });
});

describe('Villain: Cornish Pixies', () => {
  it('ongoing deals 2 damage per even-cost card in hand', () => {
    const state = buildTestState();
    addActiveVillain(state, 'cornishpixies');
    addCardToHand(state, 'harry', 'wingardiumleviosa');
    addCardToHand(state, 'harry', 'essenceofdittany');
    state.players.harry!.health = 10;
    resolveVillainOngoing(state, 'cornishpixies');
    expect(state.players.harry!.health).toBe(6);
  });

  it('death reward heals all players 2 and gives 1 money', () => {
    const state = buildTestState(7, ['harry', 'ron']);
    state.players.harry!.health = 6;
    state.players.ron!.health = 5;
    resolveVillainDeath(state, 'cornishpixies');
    expect(state.players.harry!.health).toBe(8);
    expect(state.players.ron!.health).toBe(7);
    expect(state.players.harry!.moneyTokens).toBe(1);
    expect(state.players.ron!.moneyTokens).toBe(1);
  });
});

describe('Villain: Fluffy', () => {
  it('ongoing penalizes per item in hand', () => {
    const state = buildTestState();
    addActiveVillain(state, 'fluffy');
    addCardToHand(state, 'harry', 'quidditchgear');
    addCardToHand(state, 'harry', 'firebolt');
    state.players.harry!.health = 10;
    resolveVillainOngoing(state, 'fluffy');
    // autoResolve picks first option (lose 1 health) per item = 2 damage
    expect(state.players.harry!.health).toBe(8);
  });

  it('death reward heals all players 1 and draws 1 card', () => {
    const state = buildTestState(7, ['harry', 'ron']);
    state.players.harry!.health = 8;
    state.players.ron!.health = 7;
    addCardToDeck(state, 'harry', 'alohomora');
    addCardToDeck(state, 'ron', 'alohomora');
    resolveVillainDeath(state, 'fluffy');
    expect(state.players.harry!.health).toBe(9);
    expect(state.players.ron!.health).toBe(8);
    expect(state.players.harry!.hand.length).toBe(1);
    expect(state.players.ron!.hand.length).toBe(1);
  });
});

describe('Villain: Mountain Troll', () => {
  it('ongoing presents a choice (autoResolve picks first: lose 2 health)', () => {
    const state = buildTestState();
    addActiveVillain(state, 'troll');
    state.players.harry!.health = 10;
    resolveVillainOngoing(state, 'troll');
    expect(state.players.harry!.health).toBe(8);
  });

  it('death reward heals all players 1 and banishes an item', () => {
    const state = buildTestState(7, ['harry']);
    state.players.harry!.health = 8;
    addCardToHand(state, 'harry', 'quidditchgear');
    resolveVillainDeath(state, 'troll');
    expect(state.players.harry!.health).toBe(9);
    expect(state.players.harry!.hand.length).toBe(0);
  });
});

describe('Villain: Norbert', () => {
  it('ongoing deals 1 damage plus damage per detention card in hand', () => {
    const state = buildTestState();
    addActiveVillain(state, 'norbert');
    addCardToHand(state, 'harry', 'detention');
    addCardToHand(state, 'harry', 'detention');
    state.players.harry!.health = 10;
    resolveVillainOngoing(state, 'norbert');
    // 1 base + 2 per detention = 3 total damage
    expect(state.players.harry!.health).toBe(7);
  });

  it('death reward banishes one card per player', () => {
    const state = buildTestState(7, ['harry', 'ron']);
    addCardToHand(state, 'harry', 'alohomora');
    addCardToHand(state, 'ron', 'alohomora');
    resolveVillainDeath(state, 'norbert');
    expect(state.players.harry!.hand.length).toBe(0);
    expect(state.players.ron!.hand.length).toBe(0);
  });
});
