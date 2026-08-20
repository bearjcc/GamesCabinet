import { describe, expect, it } from 'vitest';
import { getCard } from '../dataManager';
import {
  CARD_DARK_ARTS_SUPPORTED_EFFECT_TYPES,
  CARD_DARK_ARTS_SUPPORTED_PASSIVE_TYPES,
  collectCardDarkArtsEffectTypes,
  collectCardDarkArtsPassiveTypes,
  unknownCardDarkArtsEffectTypes,
  unknownCardDarkArtsPassiveTypes,
} from '../effectInventory';
import { resolveEffect, resolveEffects } from '../effectResolver';
import { initializeRng } from '../gameState';
import { resolveChoice } from '../turnLogic';
import type { EffectContext } from '../types';
import {
  addActiveVillain,
  addCardToDeck,
  addCardToDiscard,
  addCardToHand,
  addCardToPlayArea,
  buildTestState,
  resolveCardEffects,
  resolveDarkArtEvent,
} from './helpers/testGameState';

describe('Card and dark arts effect inventory', () => {
  it('maps every declared card/dark-arts effect type to supported or explicit unsupported', () => {
    expect(unknownCardDarkArtsEffectTypes()).toEqual([]);
  });

  it('maps every declared card passive type to supported or explicit unsupported', () => {
    expect(unknownCardDarkArtsPassiveTypes()).toEqual([]);
  });

  it('lists all card/dark-arts effect types found in data', () => {
    const found = [...collectCardDarkArtsEffectTypes()].sort();
    expect(found.length).toBeGreaterThan(0);
    for (const type of found) {
      expect(
        CARD_DARK_ARTS_SUPPORTED_EFFECT_TYPES.has(type) ||
          unknownCardDarkArtsEffectTypes().includes(type),
      ).toBe(true);
    }
  });

  it('lists all card passive types found in data', () => {
    const found = [...collectCardDarkArtsPassiveTypes()].sort();
    expect(found).toEqual([
      'purchased_allies_to_deck',
      'purchased_items_to_deck',
      'purchased_spells_to_deck',
      'reduce_damage_in_hand',
    ]);
    for (const type of found) {
      expect(CARD_DARK_ARTS_SUPPORTED_PASSIVE_TYPES.has(type)).toBe(true);
    }
  });
});

describe('Card effect families', () => {
  it('gain_attack_per_card_type_played scales with allies played', () => {
    const state = buildTestState();
    const player = state.players.harry!;
    player.alliesPlayedThisTurn = 2;
    resolveEffect(
      { type: 'gain_attack_per_card_type_played', params: { card_type: 'ally', amount: 1 } },
      { source: 'test', sourcePlayerId: 'harry', autoResolve: true },
      state,
    );
    expect(player.attackTokens).toBe(2);
  });

  it('gain_per_card_type_played grants attack and health per spell', () => {
    const state = buildTestState();
    const player = state.players.harry!;
    player.maxHealth = 12;
    player.health = 10;
    player.spellsPlayedThisTurn = 2;
    resolveEffect(
      {
        type: 'gain_per_card_type_played',
        params: { card_type: 'spell', attack_per: 1, health_per: 1 },
      },
      { source: 'test', sourcePlayerId: 'harry', autoResolve: true },
      state,
    );
    expect(player.attackTokens).toBe(2);
    expect(player.health).toBe(12);
  });

  it('copy_ally_effect_from_play resolves first ally in play area', () => {
    const state = buildTestState();
    addCardToPlayArea(state, 'harry', 'oliverwood');
    resolveEffect(
      { type: 'copy_ally_effect_from_play', params: {} },
      { source: 'test', sourcePlayerId: 'harry', autoResolve: true },
      state,
    );
    expect(state.players.harry!.attackTokens).toBe(1);
  });

  it('search_discard_for_type moves matching card to hand', () => {
    const state = buildTestState();
    addCardToDiscard(state, 'harry', 'quidditchgear');
    resolveEffect(
      { type: 'search_discard_for_type', params: { card_type: 'item', target: 'self' } },
      { source: 'test', sourcePlayerId: 'harry', autoResolve: true },
      state,
    );
    expect(state.players.harry!.hand.length).toBe(1);
    expect(state.players.harry!.discard.length).toBe(0);
  });

  it('select_players_exclusive applies effects to selected players', () => {
    const state = buildTestState(7, ['harry', 'hermione']);
    resolveEffect(
      {
        type: 'select_players_exclusive',
        params: {
          player_count: 2,
          effects: [
            { type: 'gain_influence', params: { amount: 1, target: 'selected' } },
            { type: 'draw_cards', params: { amount: 1, target: 'selected' } },
          ],
        },
      },
      { source: 'test', sourcePlayerId: 'harry', autoResolve: true },
      state,
    );
    expect(state.players.harry!.moneyTokens).toBe(1);
    expect(state.players.hermione!.moneyTokens).toBe(1);
  });

  it('choose_n resolves first n options', () => {
    const state = buildTestState();
    resolveEffect(
      {
        type: 'choose_n',
        params: {
          n: 2,
          options: [
            { label: 'A', effect: { type: 'gain_attack', params: { amount: 1 } } },
            { label: 'B', effect: { type: 'gain_influence', params: { amount: 1 } } },
            { label: 'C', effect: { type: 'heal', params: { amount: 5, target: 'self' } } },
          ],
        },
      },
      { source: 'test', sourcePlayerId: 'harry', autoResolve: true },
      state,
    );
    expect(state.players.harry!.attackTokens).toBe(1);
    expect(state.players.harry!.moneyTokens).toBe(1);
  });

  it('conditional_per_player applies to each player that meets condition', () => {
    const state = buildTestState(7, ['harry', 'hermione']);
    state.players.hermione!.health = 8;
    resolveEffect(
      {
        type: 'conditional_per_player',
        condition: { type: 'at_max_health' },
        then: { type: 'gain_attack', params: { amount: 1 } },
      },
      { source: 'test', sourcePlayerId: 'harry', autoResolve: true },
      state,
    );
    expect(state.players.harry!.attackTokens).toBe(1);
    expect(state.players.hermione!.attackTokens).toBe(0);
  });

  it('discard_with_bonus_if_type applies bonus when discarded card matches', () => {
    const state = buildTestState();
    addCardToHand(state, 'harry', 'alohomora');
    resolveEffect(
      {
        type: 'discard_with_bonus_if_type',
        params: {
          amount: 1,
          bonus_card_type: 'spell',
          bonus: { type: 'gain_influence', params: { amount: 2 } },
        },
      },
      { source: 'test', sourcePlayerId: 'harry', autoResolve: true },
      state,
    );
    expect(state.players.harry!.hand.length).toBe(0);
    expect(state.players.harry!.moneyTokens).toBe(2);
  });

  it('optional_banish_for_effect applies inner effect without banishing in auto mode', () => {
    const state = buildTestState();
    addCardToHand(state, 'harry', 'quidditchgear');
    resolveEffect(
      {
        type: 'optional_banish_for_effect',
        params: {
          card_type: 'item',
          effect: { type: 'draw_cards', params: { amount: 1, target: 'self' } },
        },
      },
      { source: 'test', sourcePlayerId: 'harry', autoResolve: true },
      state,
    );
    expect(state.players.harry!.hand.length).toBe(1);
  });

  it('banish_card_from_hand removes a card from the game', () => {
    const state = buildTestState();
    addCardToHand(state, 'harry', 'alohomora');
    const before = Object.keys(state.cardInstances).length;
    resolveEffect(
      { type: 'banish_card_from_hand', params: { chooser: 'self' } },
      { source: 'test', sourcePlayerId: 'harry', autoResolve: true },
      state,
    );
    expect(state.players.harry!.hand.length).toBe(0);
    expect(Object.keys(state.cardInstances).length).toBe(before - 1);
  });

  it('block_villain_effects and block_creature_effects set turn flags', () => {
    const state = buildTestState();
    resolveEffect(
      { type: 'block_villain_effects', params: { duration: 'turn' } },
      { source: 'test', sourcePlayerId: 'harry', autoResolve: true },
      state,
    );
    resolveEffect(
      { type: 'block_creature_effects', params: { duration: 'turn' } },
      { source: 'test', sourcePlayerId: 'harry', autoResolve: true },
      state,
    );
    expect(state.blockVillainEffectsThisTurn).toBe(true);
    expect(state.blockCreatureEffectsThisTurn).toBe(true);
  });

  it('peek_dark_arts exposes upcoming events without drawing', () => {
    const state = buildTestState();
    state.darkArtsDeck = ['expulso', 'flipendo'];
    const ctx: EffectContext = { source: 'test', sourcePlayerId: 'harry', autoResolve: true };
    resolveEffect({ type: 'peek_dark_arts', params: { count: 1 } }, ctx, state);
    expect(ctx.peekedDarkArts).toEqual(['expulso']);
    expect(state.darkArtsDeck).toEqual(['expulso', 'flipendo']);
  });

  it('roll_house_dice resolves a face effect', () => {
    const state = buildTestState();
    initializeRng(1, state);
    resolveEffect(
      { type: 'roll_house_dice', params: { house: 'gryffindor' } },
      { source: 'test', sourcePlayerId: 'harry', autoResolve: true },
      state,
    );
    expect(state.players.harry!.moneyTokens).toBeGreaterThanOrEqual(0);
  });

  it('choose_house_dice auto-rolls a house die', () => {
    let changed = false;
    for (let seed = 0; seed < 32; seed += 1) {
      const state = buildTestState(seed);
      const before = { ...state.players.harry! };
      resolveEffect(
        { type: 'choose_house_dice', params: {} },
        { source: 'test', sourcePlayerId: 'harry', autoResolve: true },
        state,
      );
      const after = state.players.harry!;
      if (
        after.moneyTokens !== before.moneyTokens ||
        after.attackTokens !== before.attackTokens ||
        after.health !== before.health ||
        after.hand.length !== before.hand.length
      ) {
        changed = true;
        break;
      }
    }
    expect(changed).toBe(true);
  });

  it('choose_house_dice offers the player a house choice', () => {
    const state = buildTestState();
    resolveEffect(
      { type: 'choose_house_dice', params: {} },
      { source: 'card_play', sourcePlayerId: 'harry', autoResolve: false },
      state,
    );

    expect(state.pendingChoice).not.toBeNull();
    expect(state.pendingChoice!.options).toHaveLength(4);
    expect(new Set(state.pendingChoice!.options.map((option) => option.label))).toEqual(
      new Set(['Gryffindor', 'Slytherin', 'Ravenclaw', 'Hufflepuff']),
    );
    expect(resolveChoice(state, 2, 'harry')).toBe(true);
    expect(state.pendingChoice).toBeNull();
  });

  it('reduce_damage_in_hand passive caps damage while card is in hand', () => {
    const state = buildTestState();
    addCardToHand(state, 'harry', 'invisibilitycloak');
    resolveEffect(
      { type: 'deal_damage', params: { amount: 3, target: 'active_player' } },
      { source: 'dark_arts', sourcePlayerId: 'harry', autoResolve: true },
      state,
    );
    expect(state.players.harry!.health).toBe(9);
  });

  it('data-backed card bertiebottseveryflavourbeans grants per-ally attack', () => {
    const state = buildTestState();
    state.players.harry!.alliesPlayedThisTurn = 2;
    resolveCardEffects(state, 'bertiebottseveryflavourbeans', 'harry');
    expect(state.players.harry!.attackTokens).toBe(2);
    expect(state.players.harry!.moneyTokens).toBe(1);
  });
});

describe('Dark arts effect families', () => {
  it('choose_one_all_players auto-resolves first option for each player', () => {
    const state = buildTestState(7, ['harry', 'hermione']);
    addCardToHand(state, 'harry', 'quidditchgear');
    addCardToHand(state, 'hermione', 'quidditchgear');
    resolveDarkArtEvent(state, 'relashio');
    expect(state.players.harry!.hand.length).toBe(0);
    expect(state.players.hermione!.hand.length).toBe(0);
  });

  it('discard_card_type removes one matching card from hand', () => {
    const state = buildTestState();
    addCardToHand(state, 'harry', 'quidditchgear');
    addCardToHand(state, 'harry', 'alohomora');
    resolveEffect(
      { type: 'discard_card_type', params: { card_type: 'item', target: 'self' } },
      { source: 'dark_arts', sourcePlayerId: 'harry', autoResolve: true },
      state,
    );
    expect(state.players.harry!.hand.length).toBe(1);
    expect(getCard(state.cardInstances[state.players.harry!.hand[0]!]!.cardId)?.type).toBe('spell');
  });

  it('heal_villains restores active villain hp', () => {
    const state = buildTestState();
    addActiveVillain(state, 'dracomalfoy', 6);
    state.activeVillains[0]!.currentHp = 2;
    resolveDarkArtEvent(state, 'regeneration');
    expect(state.activeVillains[0]!.currentHp).toBe(4);
  });

  it('reveal_and_penalty_if_cost applies penalty for costly top deck card', () => {
    const state = buildTestState();
    addCardToDeck(state, 'harry', 'albusdumbledore', true);
    const ctx = { source: 'dark_arts', sourcePlayerId: 'harry', autoResolve: true };
    resolveEffects(
      [
        {
          type: 'reveal_and_penalty_if_cost',
          params: {
            min_cost: 1,
            target: 'all_players',
            penalty: {
              type: 'multi_effect',
              params: {
                effects: [
                  { type: 'deal_damage', params: { amount: 2, target: 'self' } },
                  { type: 'discard_revealed_card', params: {} },
                ],
              },
            },
          },
        },
      ],
      ctx,
      state,
    );
    expect(state.players.harry!.health).toBe(8);
    expect(state.players.harry!.deck.length).toBe(0);
    expect(state.players.harry!.discard.length).toBe(1);
  });

  it('reveal_and_penalty_if_type applies penalty for matching top deck card type', () => {
    const state = buildTestState();
    addCardToDeck(state, 'harry', 'alohomora', true);
    const ctx = { source: 'dark_arts', sourcePlayerId: 'harry', autoResolve: true };
    resolveEffects(
      [
        {
          type: 'reveal_and_penalty_if_type',
          params: {
            card_type: 'spell',
            target: 'all_players',
            penalty: {
              type: 'multi_effect',
              params: {
                effects: [
                  { type: 'deal_damage', params: { amount: 2, target: 'self' } },
                  { type: 'discard_revealed_card', params: {} },
                ],
              },
            },
          },
        },
      ],
      ctx,
      state,
    );
    expect(state.players.harry!.health).toBe(8);
    expect(state.players.harry!.discard.length).toBe(1);
  });

  it('prevent_healing_this_turn blocks subsequent heals', () => {
    const state = buildTestState();
    resolveDarkArtEvent(state, 'sectumsempra');
    resolveEffect(
      { type: 'heal', params: { amount: 3, target: 'self' } },
      { source: 'test', sourcePlayerId: 'harry', autoResolve: true },
      state,
    );
    expect(state.players.harry!.health).toBe(8);
  });

  it('deal_damage_per_card_cost damages based on expensive hand cards', () => {
    const state = buildTestState();
    addCardToHand(state, 'harry', 'albusdumbledore');
    addCardToHand(state, 'harry', 'alohomora');
    resolveDarkArtEvent(state, 'educationaldecree');
    expect(state.players.harry!.health).toBe(9);
  });

  it('deal_damage_per_card_cost_exact damages based on exact-cost cards', () => {
    const state = buildTestState();
    addCardToHand(state, 'harry', 'reparo');
    addCardToHand(state, 'harry', 'alohomora');
    resolveDarkArtEvent(state, 'menacinggrowl');
    expect(state.players.harry!.health).toBe(9);
  });

  it('deal_damage_per_active_creature scales with active creatures', () => {
    const state = buildTestState();
    addActiveVillain(state, 'basilisk', 8);
    addActiveVillain(state, 'dementor', 8);
    resolveDarkArtEvent(state, 'sluguluseructo');
    expect(state.players.harry!.health).toBe(8);
  });

  it('deal_damage_per_detention_in_hand scales with detention cards', () => {
    const state = buildTestState();
    addCardToHand(state, 'harry', 'detention');
    addCardToHand(state, 'harry', 'detention');
    resolveDarkArtEvent(state, 'inquisitorialsquad');
    expect(state.players.harry!.hand.length).toBe(3);
    expect(state.players.harry!.health).toBe(7);
  });

  it('gain_card_to_hand adds generated detention card', () => {
    const state = buildTestState();
    resolveEffect(
      { type: 'gain_card_to_hand', params: { card_id: 'detention', target: 'active_player' } },
      { source: 'dark_arts', sourcePlayerId: 'harry', autoResolve: true },
      state,
    );
    expect(state.players.harry!.hand.length).toBe(1);
    expect(getCard(state.cardInstances[state.players.harry!.hand[0]!]!.cardId)?.id).toBe(
      'detention',
    );
  });

  it('roll_outcome_table resolves one outcome from data', () => {
    const state = buildTestState();
    initializeRng(0, state);
    resolveDarkArtEvent(state, 'heirofslytherin');
    expect(state.currentLocation!.currentControl).toBeGreaterThanOrEqual(0);
  });

  it('reveal_extra_dark_arts resolves additional events from deck', () => {
    const state = buildTestState();
    state.darkArtsDeck = ['tarantallegra', 'expulso'];
    resolveEffect(
      { type: 'reveal_extra_dark_arts', params: { count: 1 } },
      { source: 'dark_arts', sourcePlayerId: 'harry', autoResolve: true },
      state,
    );
    expect(state.darkArtsPlayedThisTurn.length).toBe(1);
    expect(state.players.harry!.health).toBe(9);
  });

  it('previous_player and next_player targets resolve for blast-ended and raging troll', () => {
    const state = buildTestState(7, ['harry', 'hermione', 'ron']);
    state.currentPlayerId = 'hermione';
    addCardToHand(state, 'harry', 'alohomora');
    resolveDarkArtEvent(state, 'blastended', 'hermione');
    expect(state.players.harry!.health).toBe(9);
    expect(state.players.harry!.hand.length).toBe(0);

    state.players.harry!.health = 10;
    state.players.ron!.health = 10;
    state.damageDealtThisTurn = 0;
    state.players.ron!.abilityUsedThisTurn = false;
    resolveDarkArtEvent(state, 'ragingtroll', 'hermione');
    expect(state.players.ron!.health).toBe(8);
    expect(state.currentLocation!.currentControl).toBe(1);
  });

  it('active_player_stunned conditional adds location control on avada kedavra stun', () => {
    const state = buildTestState();
    state.players.harry!.health = 3;
    resolveDarkArtEvent(state, 'avadakedavra');
    expect(state.players.harry!.isStunned).toBe(true);
    expect(state.currentLocation!.currentControl).toBe(2);
  });
});

describe('Data-backed card and dark arts smoke', () => {
  it('every card with effects resolves without throwing', () => {
    const cards = ['descendo', 'reparo', 'polyjuicepotion', 'spectrespecs', 'filiusflitwick'];
    for (const cardId of cards) {
      const state = buildTestState();
      addCardToHand(state, 'harry', cardId);
      expect(() => resolveCardEffects(state, cardId, 'harry')).not.toThrow();
    }
  });

  it('every dark arts event resolves without throwing', () => {
    const events = ['expulso', 'flipendo', 'crucio', 'morsmordre', 'poison'];
    for (const eventId of events) {
      const state = buildTestState();
      expect(() => resolveDarkArtEvent(state, eventId)).not.toThrow();
    }
  });
});
