/**
 * Individual Hero ability tests.
 *
 * Each hero from data/heroes/heroes.json is tested to verify their unique
 * ability triggers correctly and resolves as expected.
 *
 * Heroes: Harry, Ron, Hermione, Neville, Luna, Ginny
 */
import { describe, expect, it } from 'vitest';
import { getHero } from '../dataManager';
import { resolveEffect } from '../effectResolver';
import { removeLocationControl } from '../gameState';
import { fireHeroAbilities, recordDamageDealt } from '../heroAbilities';
import { playCard, resolveChoice } from '../turnLogic';
import { addCardToDeck, addCardToHand, buildTestState, setHero } from './helpers/testGameState';

// ---------------------------------------------------------------------------
// Harry Potter - The Boy Who Lived
// ---------------------------------------------------------------------------

describe('Hero Ability: Harry - The Boy Who Lived', () => {
  it('heals all players when location control is removed (Game 2+)', () => {
    const state = buildTestState(7, ['harry', 'ron']);
    state.gameNumber = 2;
    setHero(state, 'harry', 'harry');
    state.players.harry!.health = 7;
    state.players.ron!.health = 8;
    state.currentLocation!.currentControl = 3;
    removeLocationControl(state, 2);
    expect(state.players.harry!.health).toBe(9);
    expect(state.players.ron!.health).toBe(10);
  });

  it('does not trigger in Game 1 (abilities start from Game 2)', () => {
    const state = buildTestState();
    state.gameNumber = 1;
    setHero(state, 'harry', 'harry');
    state.players.harry!.health = 7;
    state.currentLocation!.currentControl = 2;
    removeLocationControl(state, 1);
    expect(state.players.harry!.health).toBe(7);
  });

  it('heal amount scales with control removed', () => {
    const state = buildTestState();
    state.gameNumber = 2;
    setHero(state, 'harry', 'harry');
    state.players.harry!.health = 5;
    state.currentLocation!.currentControl = 5;
    removeLocationControl(state, 3);
    expect(state.players.harry!.health).toBe(8);
  });

  it('heal is capped at max health', () => {
    const state = buildTestState();
    state.gameNumber = 2;
    setHero(state, 'harry', 'harry');
    state.players.harry!.health = 9;
    state.currentLocation!.currentControl = 5;
    removeLocationControl(state, 3);
    expect(state.players.harry!.health).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// Ron Weasley - Loyal Friend
// ---------------------------------------------------------------------------

describe('Hero Ability: Ron - Loyal Friend', () => {
  it('heals all players 1 when 3+ damage is dealt in a turn (Game 2+)', () => {
    const state = buildTestState(7, ['harry', 'ron']);
    state.gameNumber = 2;
    setHero(state, 'ron', 'ron');
    state.players.harry!.health = 10;
    state.players.ron!.health = 9;
    resolveEffect(
      { type: 'deal_damage', params: { amount: 3, target: 'all_players' } },
      { source: 'test', sourcePlayerId: 'ron', autoResolve: true },
      state,
    );
    // 3 damage to all: harry 10->7, ron 9->6. Ron ability heals all 1: harry 8, ron 7
    expect(state.players.harry!.health).toBe(8);
    expect(state.players.ron!.health).toBe(7);
  });

  it('does not trigger below 3 damage threshold', () => {
    const state = buildTestState(7, ['harry', 'ron']);
    state.gameNumber = 2;
    setHero(state, 'ron', 'ron');
    state.players.ron!.health = 8;
    resolveEffect(
      { type: 'deal_damage', params: { amount: 2, target: 'self' } },
      { source: 'test', sourcePlayerId: 'ron', autoResolve: true },
      state,
    );
    expect(state.players.ron!.health).toBe(6);
    expect(state.players.ron!.abilityUsedThisTurn).toBe(false);
  });

  it('only triggers once per turn', () => {
    const state = buildTestState(7, ['harry', 'ron']);
    state.gameNumber = 2;
    setHero(state, 'ron', 'ron');
    state.players.ron!.health = 10;
    // First trigger
    recordDamageDealt(state, 3);
    expect(state.players.ron!.abilityUsedThisTurn).toBe(true);
    const healthAfterFirst = state.players.ron!.health;
    // Second trigger should not fire again
    recordDamageDealt(state, 3);
    expect(state.players.ron!.health).toBe(healthAfterFirst);
  });

  it('does not trigger in Game 1', () => {
    const state = buildTestState();
    state.gameNumber = 1;
    setHero(state, 'harry', 'ron');
    state.players.harry!.health = 8;
    recordDamageDealt(state, 3);
    expect(state.players.harry!.health).toBe(8);
  });
});

// ---------------------------------------------------------------------------
// Hermione Granger - Brightest Witch of Her Age
// ---------------------------------------------------------------------------

describe('Hero Ability: Hermione - Brightest Witch of Her Age', () => {
  it('lets the player choose 2 Heroes after 4 spells played (Game 2+)', () => {
    const state = buildTestState(7, ['hermione', 'harry', 'ron']);
    state.gameNumber = 2;
    setHero(state, 'hermione', 'hermione');
    state.players.hermione!.spellsPlayedThisTurn = 4;
    fireHeroAbilities(state, 'on_spells_played_threshold', {
      sourcePlayerId: 'hermione',
    });
    expect(state.pendingChoice).not.toBeNull();
    expect(state.pendingChoice!.options).toHaveLength(3);
    expect(resolveChoice(state, 0, 'hermione')).toBe(true);
    expect(state.pendingChoice).not.toBeNull();
    expect(resolveChoice(state, 0, 'hermione')).toBe(true);
    expect(state.players.hermione!.attackTokens).toBe(1);
    expect(state.players.harry!.attackTokens).toBe(1);
    expect(state.players.ron!.attackTokens).toBe(0);
  });

  it('does not trigger before 4 spells', () => {
    const state = buildTestState();
    state.gameNumber = 2;
    setHero(state, 'harry', 'hermione');
    state.players.harry!.spellsPlayedThisTurn = 3;
    fireHeroAbilities(state, 'on_spells_played_threshold', {
      sourcePlayerId: 'harry',
    });
    expect(state.players.harry!.attackTokens).toBe(0);
  });

  it('only triggers once per turn', () => {
    const state = buildTestState(7, ['hermione', 'harry']);
    state.gameNumber = 2;
    setHero(state, 'hermione', 'hermione');
    state.players.hermione!.spellsPlayedThisTurn = 4;
    fireHeroAbilities(state, 'on_spells_played_threshold', {
      sourcePlayerId: 'hermione',
    });
    expect(state.players.hermione!.abilityUsedThisTurn).toBe(true);
    const attackAfterFirst = state.players.hermione!.attackTokens;
    // Second trigger should not fire
    fireHeroAbilities(state, 'on_spells_played_threshold', {
      sourcePlayerId: 'hermione',
    });
    expect(state.players.hermione!.attackTokens).toBe(attackAfterFirst);
  });

  it('triggers via playCard at fourth spell', () => {
    const state = buildTestState();
    state.gameNumber = 2;
    setHero(state, 'harry', 'hermione');
    for (let i = 0; i < 4; i += 1) {
      addCardToHand(state, 'harry', 'alohomora');
      const instanceId = state.players.harry!.hand.at(-1)!;
      playCard(state, 'harry', instanceId);
    }
    expect(state.players.harry!.attackTokens).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Neville Longbottom - Herbology Expert
// ---------------------------------------------------------------------------

describe('Hero Ability: Neville - Herbology Expert', () => {
  it('offers bonus on first heal of the turn (Game 2+)', () => {
    const state = buildTestState();
    state.gameNumber = 2;
    setHero(state, 'harry', 'neville');
    state.players.harry!.health = 7;
    resolveEffect(
      { type: 'heal', params: { amount: 1, target: 'self' } },
      { source: 'test', sourcePlayerId: 'harry', autoResolve: true },
      state,
    );
    expect(state.pendingChoice).not.toBeNull();
    expect(resolveChoice(state, 0, 'harry')).toBe(true);
    // The base heal and selected +1 Health ability effect both resolve.
    expect(state.players.harry!.health).toBe(9);
    expect(state.players.harry!.abilityUsedThisTurn).toBe(true);
  });

  it('does not trigger on second heal in same turn', () => {
    const state = buildTestState();
    state.gameNumber = 2;
    setHero(state, 'harry', 'neville');
    state.players.harry!.health = 5;
    // First heal triggers ability
    resolveEffect(
      { type: 'heal', params: { amount: 1, target: 'self' } },
      { source: 'test', sourcePlayerId: 'harry', autoResolve: true },
      state,
    );
    const healthAfterFirst = state.players.harry!.health;
    expect(state.players.harry!.abilityUsedThisTurn).toBe(true);
    // Second heal should not trigger ability again
    resolveEffect(
      { type: 'heal', params: { amount: 1, target: 'self' } },
      { source: 'test', sourcePlayerId: 'harry', autoResolve: true },
      state,
    );
    // Should only gain 1 from the heal itself, no ability bonus
    expect(state.players.harry!.health).toBe(healthAfterFirst + 1);
  });

  it('does not trigger in Game 1', () => {
    const state = buildTestState();
    state.gameNumber = 1;
    setHero(state, 'harry', 'neville');
    state.players.harry!.health = 7;
    resolveEffect(
      { type: 'heal', params: { amount: 1, target: 'self' } },
      { source: 'test', sourcePlayerId: 'harry', autoResolve: true },
      state,
    );
    expect(state.players.harry!.abilityUsedThisTurn).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Luna Lovegood - Wrackspurt Sensitive
// ---------------------------------------------------------------------------

describe('Hero Ability: Luna - Wrackspurt Sensitive', () => {
  it('heals 2 on first card drawn each turn (Game 2+)', () => {
    const state = buildTestState();
    state.gameNumber = 2;
    setHero(state, 'harry', 'luna');
    state.players.harry!.health = 7;
    addCardToDeck(state, 'harry', 'alohomora');
    resolveEffect(
      { type: 'draw_cards', params: { amount: 1, target: 'self' } },
      { source: 'test', sourcePlayerId: 'harry', autoResolve: true },
      state,
    );
    // autoResolve picks first player for heal target
    expect(state.players.harry!.health).toBe(9);
  });

  it('does not trigger on second card draw in same turn', () => {
    const state = buildTestState();
    state.gameNumber = 2;
    setHero(state, 'harry', 'luna');
    state.players.harry!.health = 5;
    addCardToDeck(state, 'harry', 'alohomora');
    addCardToDeck(state, 'harry', 'alohomora');
    // First draw triggers ability
    resolveEffect(
      { type: 'draw_cards', params: { amount: 1, target: 'self' } },
      { source: 'test', sourcePlayerId: 'harry', autoResolve: true },
      state,
    );
    const healthAfterFirst = state.players.harry!.health;
    expect(state.players.harry!.firstCardDrawnThisTurn).toBe(true);
    // Second draw should not trigger ability
    resolveEffect(
      { type: 'draw_cards', params: { amount: 1, target: 'self' } },
      { source: 'test', sourcePlayerId: 'harry', autoResolve: true },
      state,
    );
    expect(state.players.harry!.health).toBe(healthAfterFirst);
  });

  it('does not trigger in Game 1', () => {
    const state = buildTestState();
    state.gameNumber = 1;
    setHero(state, 'harry', 'luna');
    state.players.harry!.health = 7;
    addCardToDeck(state, 'harry', 'alohomora');
    resolveEffect(
      { type: 'draw_cards', params: { amount: 1, target: 'self' } },
      { source: 'test', sourcePlayerId: 'harry', autoResolve: true },
      state,
    );
    expect(state.players.harry!.health).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// Ginny Weasley - Bat-Bogey Hex
// ---------------------------------------------------------------------------

describe('Hero Ability: Ginny - Bat-Bogey Hex', () => {
  it('gains 2 attack when 3 spells are played in a turn (Game 2+)', () => {
    const state = buildTestState();
    state.gameNumber = 2;
    setHero(state, 'harry', 'ginny');
    state.players.harry!.spellsPlayedThisTurn = 3;
    fireHeroAbilities(state, 'on_spells_played_threshold', {
      sourcePlayerId: 'harry',
    });
    expect(state.players.harry!.attackTokens).toBe(2);
  });

  it('does not trigger before 3 spells', () => {
    const state = buildTestState();
    state.gameNumber = 2;
    setHero(state, 'harry', 'ginny');
    state.players.harry!.spellsPlayedThisTurn = 2;
    fireHeroAbilities(state, 'on_spells_played_threshold', {
      sourcePlayerId: 'harry',
    });
    expect(state.players.harry!.attackTokens).toBe(0);
  });

  it('only triggers once per turn', () => {
    const state = buildTestState();
    state.gameNumber = 2;
    setHero(state, 'harry', 'ginny');
    state.players.harry!.spellsPlayedThisTurn = 3;
    fireHeroAbilities(state, 'on_spells_played_threshold', {
      sourcePlayerId: 'harry',
    });
    expect(state.players.harry!.abilityUsedThisTurn).toBe(true);
    const attackAfterFirst = state.players.harry!.attackTokens;
    // Second trigger should not fire
    fireHeroAbilities(state, 'on_spells_played_threshold', {
      sourcePlayerId: 'harry',
    });
    expect(state.players.harry!.attackTokens).toBe(attackAfterFirst);
  });

  it('does not trigger in Game 1', () => {
    const state = buildTestState();
    state.gameNumber = 1;
    setHero(state, 'harry', 'ginny');
    state.players.harry!.spellsPlayedThisTurn = 3;
    fireHeroAbilities(state, 'on_spells_played_threshold', {
      sourcePlayerId: 'harry',
    });
    expect(state.players.harry!.attackTokens).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Cross-hero ability interactions
// ---------------------------------------------------------------------------

describe('Hero ability cross-interactions', () => {
  it('ability data is well-formed for every hero', () => {
    const heroIds = ['harry', 'ron', 'hermione', 'neville', 'luna', 'ginny'];
    for (const heroId of heroIds) {
      const hero = getHero(heroId);
      expect(hero).toBeDefined();
      expect(hero!.ability).toBeDefined();
      expect(hero!.ability!.trigger).toBeTruthy();
      expect(hero!.ability!.effects.length).toBeGreaterThan(0);
    }
  });

  it('every hero ability resolves without throwing', () => {
    const heroIds = ['harry', 'ron', 'hermione', 'neville', 'luna', 'ginny'];
    for (const heroId of heroIds) {
      const state = buildTestState();
      state.gameNumber = 2;
      setHero(state, 'harry', heroId);
      expect(() =>
        fireHeroAbilities(state, 'on_location_control_removed', {
          sourcePlayerId: 'harry',
          controlRemoved: 1,
        }),
      ).not.toThrow();
    }
  });
});
