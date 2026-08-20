/**
 * FAQ compliance tests (Hogwart's Battle Rules Clarification and FAQ, 2017-02).
 *
 * Each describe block cites the audit finding id (D1-D15, V2, G1-G2, A1-A5).
 */
import { describe, expect, it } from 'vitest';
import { resolveEffect } from '../effectResolver';
import { addLocationControl, createCardInstance, removeLocationControl } from '../gameState';
import { activateHorcruxReward, canAssignAttackToVillain } from '../horcruxes';
import { activateProficiency } from '../proficiencies';
import {
  attackVillainWithAmount,
  completeDarkArtsPhase,
  cycleMarket,
  endTurn,
  executeVillainPhase,
  fireDarkArtsPhaseVillainEffects,
  resolveChoice,
  startTurn,
} from '../turnLogic';
import {
  addActiveVillain,
  addCardToDeck,
  addCardToDiscard,
  addCardToHand,
  addCardToPlayArea,
  addMarketCard,
  buildTestState,
  initHorcruxes,
  playCardFromHand,
  resolveCardEffects,
  resolveDarkArtEvent,
  resolveVillainOngoing,
  setProficiency,
} from './helpers/testGameState';

function handCardIds(state: ReturnType<typeof buildTestState>, playerId: string): string[] {
  return state.players[playerId]!.hand.map((id) => state.cardInstances[id]?.cardId ?? '');
}

function discardCardIds(state: ReturnType<typeof buildTestState>, playerId: string): string[] {
  return state.players[playerId]!.discard.map((id) => state.cardInstances[id]?.cardId ?? '');
}

// ---------------------------------------------------------------------------
// D5: End-of-turn discards do not trigger discard effects
// ---------------------------------------------------------------------------

describe('FAQ D5: end-of-turn discards do not trigger discard effects', () => {
  it('cleanup discards hand and play area without firing on-discard effects', () => {
    const state = buildTestState();
    addCardToHand(state, 'harry', 'remembrall');
    addCardToPlayArea(state, 'harry', 'maraudersmap');
    // Enough deck cards that the cleanup draw does not reshuffle the discard.
    for (let i = 0; i < 5; i += 1) addCardToDeck(state, 'harry', 'alohomora');

    endTurn(state);

    expect(discardCardIds(state, 'harry')).toContain('remembrall');
    expect(discardCardIds(state, 'harry')).toContain('maraudersmap');
    // Remembrall (+2 Money) and Marauder's Map (all draw 1) must not fire
    expect(state.players.harry!.moneyTokens).toBe(0);
    expect(state.players.harry!.hand).toHaveLength(5);
  });

  it('mid-turn forced discards still fire on-discard effects', () => {
    const state = buildTestState();
    addCardToHand(state, 'harry', 'remembrall');

    resolveEffect(
      { type: 'discard_cards', params: { amount: 1, target: 'self' } },
      { sourcePlayerId: 'harry', source: 'dark_arts', autoResolve: true },
      state,
    );

    expect(state.players.harry!.moneyTokens).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// D2: Confundus - remove control when every villain was hit this turn
// ---------------------------------------------------------------------------

describe('FAQ D2: Confundus all_villains_hit_this_turn', () => {
  it('removes 1 control when the player attacked every villain this turn', () => {
    const state = buildTestState();
    addActiveVillain(state, 'dracomalfoy', 6);
    addActiveVillain(state, 'quirrell', 6);
    state.currentLocation!.currentControl = 2;
    state.players.harry!.attackTokens = 2;

    attackVillainWithAmount(state, 'harry', 0, 1);
    attackVillainWithAmount(state, 'harry', 1, 1);
    resolveCardEffects(state, 'confundus', 'harry');

    expect(state.currentLocation!.currentControl).toBe(1);
  });

  it('does not remove control when a villain was not hit', () => {
    const state = buildTestState();
    addActiveVillain(state, 'dracomalfoy', 6);
    addActiveVillain(state, 'quirrell', 6);
    state.currentLocation!.currentControl = 2;
    state.players.harry!.attackTokens = 1;

    attackVillainWithAmount(state, 'harry', 0, 1);
    resolveCardEffects(state, 'confundus', 'harry');

    expect(state.currentLocation!.currentControl).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// D3: Voldemort cannot be attacked while other Villains are in play
// ---------------------------------------------------------------------------

describe('FAQ D3: Voldemort cannot be attacked while other Villains are in play', () => {
  it('rejects attacks on Voldemort while another villain is active', () => {
    const state = buildTestState();
    addActiveVillain(state, 'voldemort', 10);
    addActiveVillain(state, 'dracomalfoy', 6);
    state.players.harry!.attackTokens = 5;

    expect(attackVillainWithAmount(state, 'harry', 0, 2)).toBe(false);
    expect(state.activeVillains[0]!.currentHp).toBe(10);
  });

  it('allows attacking Voldemort once he is the only villain in play', () => {
    const state = buildTestState();
    addActiveVillain(state, 'voldemort', 10);
    addActiveVillain(state, 'dracomalfoy', 6);
    state.players.harry!.attackTokens = 10;

    attackVillainWithAmount(state, 'harry', 1, 6); // defeat Draco
    expect(attackVillainWithAmount(state, 'harry', 0, 2)).toBe(true);
    expect(state.activeVillains[0]!.currentHp).toBe(8);
  });
});

// ---------------------------------------------------------------------------
// D4: Horcrux dice - roll first, then decide whether to assign
// ---------------------------------------------------------------------------

describe('FAQ D4: Horcrux dice rolls are assigned after the roll', () => {
  it('offers a post-roll choice to assign the symbol to the active Horcrux', () => {
    const state = buildTestState();
    initHorcruxes(state);

    resolveEffect(
      { type: 'roll_house_dice', params: { house: 'gryffindor' } },
      { sourcePlayerId: 'harry', source: 'card_play', autoResolve: false },
      state,
    );

    expect(state.pendingChoice).not.toBeNull();
    const assignIndex = state.pendingChoice!.options.findIndex((o) =>
      o.label.toLowerCase().includes('horcrux'),
    );
    expect(assignIndex).toBeGreaterThanOrEqual(0);

    resolveChoice(state, assignIndex);
    const hs = state.horcruxState!;
    expect(hs.rolledSymbols.length + hs.destroyedHorcruxIds.length).toBe(1);
  });

  it('taking the effect leaves the Horcrux untouched', () => {
    const state = buildTestState();
    initHorcruxes(state);

    resolveEffect(
      { type: 'roll_house_dice', params: { house: 'gryffindor' } },
      { sourcePlayerId: 'harry', source: 'card_play', autoResolve: false },
      state,
    );

    const takeIndex = state.pendingChoice!.options.findIndex(
      (o) => !o.label.toLowerCase().includes('horcrux'),
    );
    resolveChoice(state, takeIndex);
    expect(state.horcruxState!.rolledSymbols).toHaveLength(0);
    expect(state.horcruxState!.destroyedHorcruxIds).toHaveLength(0);
  });

  it('auto-resolved rolls never assign to the Horcrux', () => {
    const state = buildTestState();
    initHorcruxes(state);

    resolveEffect(
      { type: 'roll_house_dice', params: { house: 'gryffindor' } },
      { sourcePlayerId: 'harry', source: 'card_play', autoResolve: true },
      state,
    );

    expect(state.pendingChoice).toBeNull();
    expect(state.horcruxState!.rolledSymbols).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// D1: Penalty choices cannot pick an unpayable option
// ---------------------------------------------------------------------------

describe('FAQ D1: penalty choices fall back when the discard is impossible', () => {
  it('Relashio deals 2 damage to a player with no item', () => {
    const state = buildTestState(7, ['harry', 'ron']);
    addCardToHand(state, 'harry', 'alohomora'); // spell - cannot pay
    addCardToHand(state, 'ron', 'quidditchgear'); // item - must discard

    resolveDarkArtEvent(state, 'relashio');

    expect(state.players.harry!.health).toBe(8);
    expect(state.players.harry!.hand).toHaveLength(1);
    expect(state.players.ron!.health).toBe(10);
    expect(state.players.ron!.hand).toHaveLength(0);
  });

  it('Obliviate deals 2 damage to a player with no spell', () => {
    const state = buildTestState();
    addCardToHand(state, 'harry', 'quidditchgear');

    resolveDarkArtEvent(state, 'obliviate');

    expect(state.players.harry!.health).toBe(8);
  });

  it('Poison deals 2 damage to a player with no ally', () => {
    const state = buildTestState();
    addCardToHand(state, 'harry', 'alohomora');

    resolveDarkArtEvent(state, 'poison');

    expect(state.players.harry!.health).toBe(8);
  });
});

// ---------------------------------------------------------------------------
// D6: Death Eater triggers before the active Hero discards and draws
// ---------------------------------------------------------------------------

describe('FAQ D6: Death Eater fires before cleanup discard/draw', () => {
  it('a stun from the incoming villain does not eat into the fresh 5-card hand', () => {
    const state = buildTestState();
    addActiveVillain(state, 'deatheater', 7);
    addActiveVillain(state, 'dracomalfoy', 6);
    state.activeVillains[1]!.isActive = false; // Draco defeated this turn
    state.villainDeck = ['quirrell'];
    state.players.harry!.health = 1;
    for (let i = 0; i < 4; i += 1) addCardToHand(state, 'harry', 'alohomora');
    for (let i = 0; i < 5; i += 1) addCardToDeck(state, 'harry', 'alohomora');

    endTurn(state);

    const harry = state.players.harry!;
    // Death Eater stuns Harry before he discards and draws, so the new
    // 5-card hand is dealt after the stun and stays intact.
    expect(harry.hand).toHaveLength(5);
    expect(harry.health).toBe(10);
    expect(harry.isStunned).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// D7: Discarding the top card of your deck counts as a discard
// ---------------------------------------------------------------------------

describe('FAQ D7: top-deck discards count as discards', () => {
  it('Crabbe and Goyle attack when Pettigrew discards the top card', () => {
    const state = buildTestState();
    addActiveVillain(state, 'crabbeandgoyle', 5);
    addCardToDeck(state, 'harry', 'lumos', true);

    resolveVillainOngoing(state, 'peterpettigrew', 'harry');

    expect(state.players.harry!.health).toBe(9);
    expect(discardCardIds(state, 'harry')).toContain('lumos');
  });
});

// ---------------------------------------------------------------------------
// D8: Invisibility Cloak only protects against Dark Arts and Villains
// ---------------------------------------------------------------------------

describe('FAQ D8: Invisibility Cloak damage sources', () => {
  it('caps Dark Arts damage to 1', () => {
    const state = buildTestState();
    addCardToHand(state, 'harry', 'invisibilitycloak');

    resolveEffect(
      { type: 'deal_damage', params: { amount: 3, target: 'self' } },
      { sourcePlayerId: 'harry', source: 'dark_arts', autoResolve: true },
      state,
    );

    expect(state.players.harry!.health).toBe(9);
  });

  it('caps Villain damage to 1', () => {
    const state = buildTestState();
    addCardToHand(state, 'harry', 'invisibilitycloak');

    resolveEffect(
      { type: 'deal_damage', params: { amount: 3, target: 'self' } },
      { sourcePlayerId: 'harry', source: 'villain', autoResolve: true },
      state,
    );

    expect(state.players.harry!.health).toBe(9);
  });

  it('does not reduce Horcrux damage', () => {
    const state = buildTestState();
    addCardToHand(state, 'harry', 'invisibilitycloak');

    resolveEffect(
      { type: 'deal_damage', params: { amount: 3, target: 'self' } },
      { sourcePlayerId: 'harry', source: 'horcrux_ongoing', autoResolve: true },
      state,
    );

    expect(state.players.harry!.health).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// D9: Fleur Delacour does not trigger off herself
// ---------------------------------------------------------------------------

describe('FAQ D9: Fleur Delacour requires another ally', () => {
  it('does not heal when played as the only ally', () => {
    const state = buildTestState();
    state.players.harry!.health = 6;
    addCardToHand(state, 'harry', 'fleurdelacour');

    playCardFromHand(state, 'harry', 'fleurdelacour');

    expect(state.players.harry!.health).toBe(6);
    expect(state.players.harry!.moneyTokens).toBe(2);
  });

  it('heals when another ally was played first', () => {
    const state = buildTestState();
    state.players.harry!.health = 6;
    addCardToHand(state, 'harry', 'trevor');
    addCardToHand(state, 'harry', 'fleurdelacour');

    playCardFromHand(state, 'harry', 'trevor');
    playCardFromHand(state, 'harry', 'fleurdelacour');

    expect(state.players.harry!.health).toBe(8);
  });
});

// ---------------------------------------------------------------------------
// D10: Proficiency and Horcrux cost discards trigger discard effects
// ---------------------------------------------------------------------------

describe('FAQ D10: cost discards trigger on-discard effects', () => {
  it('Locket reward discards fire on-discard effects', () => {
    const state = buildTestState();
    initHorcruxes(state);
    state.players.harry!.destroyedHorcruxIds = ['locket'];
    addCardToHand(state, 'harry', 'remembrall');
    addCardToHand(state, 'harry', 'alohomora');

    activateHorcruxReward(state, 'harry', 'locket');

    expect(state.players.harry!.moneyTokens).toBe(2);
  });

  it('Transfiguration cost discard fires on-discard effects', () => {
    const state = buildTestState();
    setProficiency(state, 'harry', 'transfiguration');
    addCardToHand(state, 'harry', 'remembrall');
    addCardToDeck(state, 'harry', 'lumos');

    activateProficiency(state, 'harry');

    expect(state.players.harry!.moneyTokens).toBe(2);
    expect(handCardIds(state, 'harry')).toContain('lumos');
  });
});

// ---------------------------------------------------------------------------
// D11: Searching with an empty deck reshuffles the discard pile
// ---------------------------------------------------------------------------

describe('FAQ D11: search with an empty deck reshuffles', () => {
  it('search_deck shuffles the discard into a new deck when the deck is empty', () => {
    const state = buildTestState();
    addCardToDiscard(state, 'harry', 'lumos');

    resolveEffect(
      { type: 'search_deck', params: { max_cost: 5, target: 'self' } },
      { sourcePlayerId: 'harry', source: 'card_play', autoResolve: true },
      state,
    );

    expect(handCardIds(state, 'harry')).toContain('lumos');
  });
});

// ---------------------------------------------------------------------------
// D12: Nagini strikes after Dark Arts, before Villains
// ---------------------------------------------------------------------------

describe('FAQ D12: Nagini timing', () => {
  it('does not fire at the top of startTurn, before Dark Arts', () => {
    const state = buildTestState();
    initHorcruxes(state);
    state.horcruxState!.activeHorcruxId = 'nagini';
    state.darkArtsDeck = ['expulso'];
    state.players.harry!.health = 10;

    startTurn(state);
    expect(state.players.harry!.health).toBe(10);

    completeDarkArtsPhase(state);
    // Nagini (1) + Expulso (2)
    expect(state.players.harry!.health).toBe(7);
    expect(state.horcruxHealingBlockedThisTurn).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// D13: Bellatrix reveals her extra Dark Arts card during the Dark Arts phase
// ---------------------------------------------------------------------------

describe('FAQ D13: Bellatrix reveals during the Dark Arts phase', () => {
  it('fireDarkArtsPhaseVillainEffects triggers her reveal but not other villains', () => {
    const state = buildTestState();
    addActiveVillain(state, 'bellatrixlestrange', 9);
    addActiveVillain(state, 'dementor', 8);
    state.darkArtsDeck = ['expulso'];
    state.players.harry!.health = 10;

    fireDarkArtsPhaseVillainEffects(state);

    expect(state.darkArtsPlayedThisTurn).toEqual(['expulso']);
    expect(state.players.harry!.health).toBe(8); // Dementor did not fire
  });

  it('does not fire her reveal during the villain phase', () => {
    const state = buildTestState();
    addActiveVillain(state, 'bellatrixlestrange', 9);
    state.darkArtsDeck = ['expulso'];

    executeVillainPhase(state);

    expect(state.darkArtsPlayedThisTurn).toHaveLength(0);
  });

  it('full turn: extra reveal lands between the location reveal and the villain phase', () => {
    const state = buildTestState();
    addActiveVillain(state, 'bellatrixlestrange', 9);
    state.darkArtsDeck = ['expulso', 'flipendo'];
    state.players.harry!.health = 10;

    startTurn(state);
    completeDarkArtsPhase(state);

    expect(state.darkArtsPlayedThisTurn).toEqual(['expulso', 'flipendo']);
    expect(state.players.harry!.health).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// D14: Attacks that make all players discard resolve simultaneously
// ---------------------------------------------------------------------------

describe('FAQ D14: simultaneous discards', () => {
  it('on-discard benefits wait until every player has discarded', () => {
    const state = buildTestState(7, ['harry', 'ron']);
    addCardToHand(state, 'harry', 'maraudersmap');
    addCardToHand(state, 'ron', 'alohomora');
    addCardToDeck(state, 'ron', 'lumos');

    resolveEffect(
      { type: 'discard_cards', params: { amount: 1, target: 'all_players' } },
      { sourcePlayerId: 'harry', source: 'dark_arts', autoResolve: true },
      state,
    );

    // Ron discards Alohomora, then the Map draw gives him Lumos.
    // Sequential resolution would draw Lumos first and then discard it.
    expect(handCardIds(state, 'ron')).toEqual(['lumos']);
    expect(discardCardIds(state, 'ron')).toEqual(['alohomora']);
  });
});

// ---------------------------------------------------------------------------
// D15: Horcrux rewards only fire on the owner's turn
// ---------------------------------------------------------------------------

describe('FAQ D15: Horcrux rewards only on the owner turn', () => {
  it('Ring reward does not fire when control is removed on another Hero turn', () => {
    const state = buildTestState(7, ['harry', 'ron']);
    initHorcruxes(state);
    state.players.ron!.destroyedHorcruxIds = ['ring'];
    addLocationControl(state, 2);

    removeLocationControl(state, 1); // Harry's turn
    expect(state.players.harry!.attackTokens).toBe(0);
    expect(state.players.ron!.attackTokens).toBe(0);

    state.currentPlayerId = 'ron';
    removeLocationControl(state, 1); // Ron's turn: reward fires for all Heroes
    expect(state.players.ron!.attackTokens).toBe(1);
    expect(state.players.harry!.attackTokens).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// V2: Once per game, a player may cycle the market
// ---------------------------------------------------------------------------

describe('FAQ V2: once-per-game market cycle', () => {
  it('sends the market cards to the bottom and deals new ones, once per game', () => {
    const state = buildTestState();
    const faceUp = ['lumos', 'accio', 'protego', 'butterbeer', 'crystalball', 'maraudersmap'].map(
      (id, i) => addMarketCard(state, i, id),
    );
    const deckInstances = [
      'confundus',
      'felixfelicis',
      'elderwand',
      'horaceslughorn',
      'fleurdelacour',
      'lunalovegood',
      'oldsock',
    ].map((id) => {
      const inst = createCardInstance(state, id);
      inst.zone = 'market';
      return inst.instanceId;
    });
    state.market.deck = [...deckInstances];

    expect(cycleMarket(state, 'harry')).toBe(true);
    expect(state.market.availableCards).toEqual(deckInstances.slice(0, 6));
    expect(state.market.deck).toEqual([...deckInstances.slice(6), ...faceUp]);

    // Once per game
    expect(cycleMarket(state, 'harry')).toBe(false);
  });

  it('is only available during the hero action phase', () => {
    const state = buildTestState();
    state.currentPhase = 'CLEANUP';
    expect(cycleMarket(state, 'harry')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// G1: Game 7 Voldemort - control removal costs Health per token
// ---------------------------------------------------------------------------

describe('FAQ G1: Game 7 Voldemort', () => {
  it('deals 1 damage per control token removed as one action', () => {
    const state = buildTestState();
    addActiveVillain(state, 'voldemort7', 10);
    state.currentLocation!.currentControl = 3;
    state.players.harry!.health = 10;

    removeLocationControl(state, 2);

    expect(state.players.harry!.health).toBe(8);
  });

  it('cannot be attacked while Horcruxes remain', () => {
    const state = buildTestState();
    initHorcruxes(state);
    addActiveVillain(state, 'voldemort7', 10);
    state.players.harry!.attackTokens = 5;

    expect(canAssignAttackToVillain(state, 'voldemort7')).toBe(false);
    expect(attackVillainWithAmount(state, 'harry', 0, 2)).toBe(false);

    state.horcruxState!.stack = [];
    state.horcruxState!.activeHorcruxId = null;
    expect(canAssignAttackToVillain(state, 'voldemort7')).toBe(true);
    expect(attackVillainWithAmount(state, 'harry', 0, 2)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// A1: choose-target effects offer a real player choice
// ---------------------------------------------------------------------------

describe('A1: choose-target effects offer a real choice', () => {
  it('Chocolate Frog prompts for a player instead of defaulting to self', () => {
    const state = buildTestState(7, ['harry', 'ron']);
    state.players.ron!.health = 8;

    resolveCardEffects(state, 'chocolatefrog', 'harry', false);

    expect(state.pendingChoice).not.toBeNull();
    expect(state.pendingChoice!.options).toHaveLength(2);

    resolveChoice(state, 1); // Ron
    expect(state.players.ron!.health).toBe(9);
    expect(state.players.harry!.moneyTokens).toBe(1);
  });

  it('auto-resolve contexts keep the current behaviour', () => {
    const state = buildTestState(7, ['harry', 'ron']);
    state.players.harry!.health = 8;

    resolveCardEffects(state, 'chocolatefrog', 'harry', true);

    expect(state.pendingChoice).toBeNull();
    expect(state.players.harry!.health).toBe(9);
  });
});

// ---------------------------------------------------------------------------
// A2: select_players_exclusive offers real picks
// ---------------------------------------------------------------------------

describe('A2: select_players_exclusive offers real picks', () => {
  it('Butterbeer lets the player pick two different Heroes', () => {
    const state = buildTestState(7, ['harry', 'ron', 'neville']);
    state.players.ron!.health = 8;
    state.players.neville!.health = 8;
    addCardToHand(state, 'harry', 'butterbeer');

    playCardFromHand(state, 'harry', 'butterbeer', false);

    expect(state.pendingChoice).not.toBeNull();
    expect(state.pendingChoice!.options).toHaveLength(3);
    resolveChoice(state, 1); // Ron

    expect(state.pendingChoice).not.toBeNull();
    expect(state.pendingChoice!.options).toHaveLength(2);
    resolveChoice(state, 1); // Neville (remaining: Harry, Neville)

    expect(state.players.ron!.health).toBe(9);
    expect(state.players.neville!.health).toBe(9);
    expect(state.players.harry!.health).toBe(10);
    expect(state.players.ron!.moneyTokens).toBe(1);
    expect(state.players.neville!.moneyTokens).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// A3: chooser discards offer a real card choice
// ---------------------------------------------------------------------------

describe('A3: chooser discards offer a real choice', () => {
  it('Crystal Ball lets the player pick which card to discard', () => {
    const state = buildTestState();
    addCardToHand(state, 'harry', 'remembrall');
    addCardToHand(state, 'harry', 'alohomora');
    addCardToHand(state, 'harry', 'crystalball');

    playCardFromHand(state, 'harry', 'crystalball', false);

    expect(state.pendingChoice).not.toBeNull();
    expect(state.pendingChoice!.options).toHaveLength(2);

    resolveChoice(state, 0); // Remembrall
    expect(discardCardIds(state, 'harry')).toContain('remembrall');
    expect(handCardIds(state, 'harry')).toEqual(['alohomora']);
    expect(state.players.harry!.moneyTokens).toBe(2); // Remembrall on-discard fired
  });
});

// ---------------------------------------------------------------------------
// A4: Polyjuice offers a choice of which ally to copy
// ---------------------------------------------------------------------------

describe('A4: copy_ally_effect_from_play offers a real choice', () => {
  it('prompts when multiple allies are in the play area', () => {
    const state = buildTestState();
    addCardToPlayArea(state, 'harry', 'gilderoylockhart');
    addCardToPlayArea(state, 'harry', 'fleurdelacour');
    state.players.harry!.alliesPlayedThisTurn = 2;
    state.players.harry!.health = 6;
    addCardToHand(state, 'harry', 'polyjuicepotion');

    playCardFromHand(state, 'harry', 'polyjuicepotion', false);

    expect(state.pendingChoice).not.toBeNull();
    expect(state.pendingChoice!.options.map((o) => o.label)).toEqual([
      'Gilderoy Lockhart',
      'Fleur Delacour',
    ]);

    resolveChoice(state, 1); // Fleur: +2 Money, heal 2 (an ally was played)
    expect(state.players.harry!.moneyTokens).toBe(2);
    expect(state.players.harry!.health).toBe(8);
  });
});

// ---------------------------------------------------------------------------
// A5: choose_n offers real picks
// ---------------------------------------------------------------------------

describe('A5: choose_n offers real picks', () => {
  it('Felix Felicis lets the player pick any two options', () => {
    const state = buildTestState();
    state.players.harry!.health = 6;
    addCardToDeck(state, 'harry', 'alohomora');
    addCardToDeck(state, 'harry', 'alohomora');
    addCardToHand(state, 'harry', 'felixfelicis');

    playCardFromHand(state, 'harry', 'felixfelicis', false);

    expect(state.pendingChoice).not.toBeNull();
    expect(state.pendingChoice!.options).toHaveLength(4);
    resolveChoice(state, 2); // 2 Health

    expect(state.pendingChoice).not.toBeNull();
    expect(state.pendingChoice!.options).toHaveLength(3);
    resolveChoice(state, 2); // Draw 2 (remaining: Damage, Money, Draw)

    expect(state.players.harry!.health).toBe(8);
    expect(state.players.harry!.hand).toHaveLength(2);
    expect(state.players.harry!.attackTokens).toBe(0);
    expect(state.players.harry!.moneyTokens).toBe(0);
  });
});
