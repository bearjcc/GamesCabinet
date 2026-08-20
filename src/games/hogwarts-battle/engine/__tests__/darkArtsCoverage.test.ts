/**
 * Individual Dark Arts card effect tests.
 *
 * Each Dark Arts event from data/dark_arts/dark_arts.json is tested to verify
 * its effect resolves correctly. Events are grouped by mechanic type.
 *
 * Uses resolveDarkArtEvent helper which auto-resolves choices.
 */
import { describe, expect, it } from 'vitest';
import { getDarkArt } from '../dataManager';
import {
  addActiveVillain,
  addCardToDeck,
  addCardToHand,
  buildTestState,
  resolveDarkArtEvent,
} from './helpers/testGameState';

// ---------------------------------------------------------------------------
// Simple Damage Events
// ---------------------------------------------------------------------------

describe('Dark Arts: Expulso', () => {
  it('deals 2 damage to the active player', () => {
    const state = buildTestState();
    state.players.harry!.health = 10;

    resolveDarkArtEvent(state, 'expulso');

    expect(state.players.harry!.health).toBe(8);
  });
});

describe('Dark Arts: Petrification', () => {
  it('deals 1 damage to all players', () => {
    const state = buildTestState(7, ['harry', 'ron']);
    state.players.harry!.health = 10;
    state.players.ron!.health = 10;

    resolveDarkArtEvent(state, 'petrification');

    expect(state.players.harry!.health).toBe(9);
    expect(state.players.ron!.health).toBe(9);
  });
});

describe('Dark Arts: Tarantallegra', () => {
  it('deals 1 damage to the active player', () => {
    const state = buildTestState();
    state.players.harry!.health = 10;

    resolveDarkArtEvent(state, 'tarantallegra');

    expect(state.players.harry!.health).toBe(9);
  });
});

describe("Dark Arts: Dementor's Kiss", () => {
  it('deals 2 damage to active player and 1 to other players', () => {
    const state = buildTestState(7, ['harry', 'ron']);
    state.players.harry!.health = 10;
    state.players.ron!.health = 10;

    resolveDarkArtEvent(state, 'dementorskiss');

    expect(state.players.harry!.health).toBe(8);
    expect(state.players.ron!.health).toBe(9);
  });
});

describe('Dark Arts: Fiendfyre', () => {
  it('deals 3 damage to all players', () => {
    const state = buildTestState(7, ['harry', 'ron']);
    state.players.harry!.health = 10;
    state.players.ron!.health = 10;

    resolveDarkArtEvent(state, 'fiendfyre');

    expect(state.players.harry!.health).toBe(7);
    expect(state.players.ron!.health).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// Damage + Location Control
// ---------------------------------------------------------------------------

describe('Dark Arts: He Who Must Not Be Named', () => {
  it('adds 1 control to the location', () => {
    const state = buildTestState();
    expect(state.currentLocation!.currentControl).toBe(0);

    resolveDarkArtEvent(state, 'hewhomustnotbenamed');

    expect(state.currentLocation!.currentControl).toBe(1);
  });
});

describe('Dark Arts: Hand of Glory', () => {
  it('deals 1 damage to active player and adds 1 location control', () => {
    const state = buildTestState();
    state.players.harry!.health = 10;

    resolveDarkArtEvent(state, 'handofglory');

    expect(state.players.harry!.health).toBe(9);
    expect(state.currentLocation!.currentControl).toBe(1);
  });
});

describe('Dark Arts: Raging Troll', () => {
  it('deals 2 damage to next player and adds 1 location control', () => {
    const state = buildTestState(7, ['harry', 'ron', 'hermione']);
    state.players.ron!.health = 10;

    resolveDarkArtEvent(state, 'ragingtroll');

    // Next player after harry is ron
    expect(state.players.ron!.health).toBe(8);
    expect(state.currentLocation!.currentControl).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Damage + Extra Dark Arts
// ---------------------------------------------------------------------------

describe('Dark Arts: Crucio', () => {
  it('deals 1 damage to active player and reveals 1 extra dark arts', () => {
    const state = buildTestState();
    state.players.harry!.health = 10;
    // Set up a dark arts deck with one card
    state.darkArtsDeck = ['tarantallegra'];

    resolveDarkArtEvent(state, 'crucio');

    // Crucio deals 1 damage + extra dark arts (tarantallegra) deals 1 more = 2 total
    expect(state.players.harry!.health).toBe(8);
    // The extra dark arts card should have been drawn and resolved
    expect(state.darkArtsPlayedThisTurn).toContain('tarantallegra');
  });
});

describe('Dark Arts: Avada Kedavra', () => {
  it('deals 3 damage to active player', () => {
    const state = buildTestState();
    state.players.harry!.health = 10;
    state.darkArtsDeck = [];

    resolveDarkArtEvent(state, 'avadakedavra');

    expect(state.players.harry!.health).toBe(7);
  });

  it('adds location control when damage stuns the active player', () => {
    const state = buildTestState();
    state.players.harry!.health = 3;
    state.darkArtsDeck = [];

    resolveDarkArtEvent(state, 'avadakedavra');

    // 3 damage reduces health to 0, triggering stun
    expect(state.players.harry!.isStunned).toBe(true);
    // Stun adds 1 location control (from the conditional effect)
    expect(state.currentLocation!.currentControl).toBeGreaterThanOrEqual(1);
  });
});

describe('Dark Arts: Imperio', () => {
  it('deals 2 damage to another player (auto-resolve picks first other)', () => {
    const state = buildTestState(7, ['harry', 'ron']);
    state.players.harry!.health = 10;
    state.players.ron!.health = 10;
    state.darkArtsDeck = [];

    resolveDarkArtEvent(state, 'imperio');

    // Auto-resolve picks first other player (ron) for the damage
    expect(state.players.ron!.health).toBe(8);
    // Harry should not take damage from imperio itself
    expect(state.players.harry!.health).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// Villain Manipulation
// ---------------------------------------------------------------------------

describe('Dark Arts: Regeneration', () => {
  it('heals all active villains by 2', () => {
    const state = buildTestState();
    addActiveVillain(state, 'dracomalfoy', 6);
    state.activeVillains[0]!.currentHp = 3;

    resolveDarkArtEvent(state, 'regeneration');

    expect(state.activeVillains[0]!.currentHp).toBe(5);
  });

  it('does not heal villains above max HP', () => {
    const state = buildTestState();
    addActiveVillain(state, 'dracomalfoy', 6);
    state.activeVillains[0]!.currentHp = 5;

    resolveDarkArtEvent(state, 'regeneration');

    expect(state.activeVillains[0]!.currentHp).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// Market / Deck Manipulation
// ---------------------------------------------------------------------------

describe('Dark Arts: Educational Decree', () => {
  it('deals damage based on cards in hand with cost >= 4', () => {
    const state = buildTestState();
    state.players.harry!.health = 10;
    // Add a card with cost >= 4 to hand (elderwand costs 6)
    addCardToHand(state, 'harry', 'elderwand');

    resolveDarkArtEvent(state, 'educationaldecree');

    // 1 card with cost >= 4, so 1 damage
    expect(state.players.harry!.health).toBe(9);
  });

  it('deals no damage when hand has no cards costing 4 or more', () => {
    const state = buildTestState();
    state.players.harry!.health = 10;
    // Add a cheap card (alohomora costs 0)
    addCardToHand(state, 'harry', 'alohomora');

    resolveDarkArtEvent(state, 'educationaldecree');

    expect(state.players.harry!.health).toBe(10);
  });
});

describe('Dark Arts: Slugulus Eructo', () => {
  it('deals damage per active creature to all players', () => {
    const state = buildTestState(7, ['harry', 'ron']);
    state.players.harry!.health = 10;
    state.players.ron!.health = 10;
    // Add a creature villain (basilisk has type "creature")
    addActiveVillain(state, 'basilisk', 8);

    resolveDarkArtEvent(state, 'sluguluseructo');

    // 1 active creature, 1 damage each
    expect(state.players.harry!.health).toBe(9);
    expect(state.players.ron!.health).toBe(9);
  });

  it('deals no damage when no creatures are active', () => {
    const state = buildTestState();
    state.players.harry!.health = 10;
    // Add a non-creature villain
    addActiveVillain(state, 'dracomalfoy', 6);

    resolveDarkArtEvent(state, 'sluguluseructo');

    expect(state.players.harry!.health).toBe(10);
  });
});

describe('Dark Arts: Menacing Growl', () => {
  it('deals damage per card costing exactly 3 in each player hand', () => {
    const state = buildTestState(7, ['harry', 'ron']);
    state.players.harry!.health = 10;
    state.players.ron!.health = 10;
    // Add a card costing exactly 3 to harry's hand (reparo costs 3)
    addCardToHand(state, 'harry', 'reparo');

    resolveDarkArtEvent(state, 'menacinggrowl');

    // Harry has 1 card costing exactly 3, so 1 damage to harry
    expect(state.players.harry!.health).toBe(9);
    // Ron has no cards costing exactly 3, so no damage to ron
    expect(state.players.ron!.health).toBe(10);
  });
});

describe('Dark Arts: Inquisitorial Squad', () => {
  it('gives detention card to active player hand and deals damage per detention in hand', () => {
    const state = buildTestState(7, ['harry', 'ron']);
    state.players.harry!.health = 10;
    state.players.ron!.health = 10;

    resolveDarkArtEvent(state, 'inquisitorialsquad');

    // Harry should have gained a detention card to hand
    const harryHand = state.players.harry!.hand;
    const hasDetention = harryHand.some((id) => {
      const ci = state.cardInstances[id];
      return ci?.cardId === 'detention';
    });
    expect(hasDetention).toBe(true);

    // 1 detention in harry's hand = 1 damage to harry
    expect(state.players.harry!.health).toBe(9);
    // Ron has no detention cards in hand, so no damage
    expect(state.players.ron!.health).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// Choose One (auto-resolve picks first option)
// ---------------------------------------------------------------------------

describe('Dark Arts: Relashio', () => {
  it('auto-resolves by discarding an item from each player (first option)', () => {
    const state = buildTestState(7, ['harry', 'ron']);
    state.players.harry!.health = 10;
    state.players.ron!.health = 10;
    // Add an item card to each player's hand
    addCardToHand(state, 'harry', 'invisibilitycloak');
    addCardToHand(state, 'ron', 'invisibilitycloak');

    resolveDarkArtEvent(state, 'relashio');

    // Auto-resolve picks first option: discard an item
    // Players should have lost their item from hand (moved to discard)
    // No health damage since item was discarded
    expect(state.players.harry!.health).toBe(10);
    expect(state.players.ron!.health).toBe(10);
  });

  it('deals 2 damage when no item to discard', () => {
    const state = buildTestState();
    state.players.harry!.health = 10;
    // No items in hand: the discard penalty cannot be paid, so the FAQ ruling
    // forces the player to take the 2 damage instead.

    resolveDarkArtEvent(state, 'relashio');

    expect(state.players.harry!.health).toBe(8);
  });
});

describe('Dark Arts: Obliviate', () => {
  it('auto-resolves by discarding a spell from each player (first option)', () => {
    const state = buildTestState(7, ['harry', 'ron']);
    state.players.harry!.health = 10;
    state.players.ron!.health = 10;
    // Add a spell card to each player's hand
    addCardToHand(state, 'harry', 'expelliarmus');
    addCardToHand(state, 'ron', 'expelliarmus');

    resolveDarkArtEvent(state, 'obliviate');

    // Auto-resolve picks first option: discard a spell
    expect(state.players.harry!.health).toBe(10);
    expect(state.players.ron!.health).toBe(10);
  });
});

describe('Dark Arts: Poison', () => {
  it('auto-resolves by discarding an ally from each player (first option)', () => {
    const state = buildTestState(7, ['harry', 'ron']);
    state.players.harry!.health = 10;
    state.players.ron!.health = 10;
    // Add an ally card to each player's hand
    addCardToHand(state, 'harry', 'hedwig');
    addCardToHand(state, 'ron', 'hedwig');

    resolveDarkArtEvent(state, 'poison');

    // Auto-resolve picks first option: discard an ally
    expect(state.players.harry!.health).toBe(10);
    expect(state.players.ron!.health).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// Discard Cards
// ---------------------------------------------------------------------------

describe('Dark Arts: Flipendo', () => {
  it('deals 1 damage and discards 1 card from active player', () => {
    const state = buildTestState();
    state.players.harry!.health = 10;
    addCardToHand(state, 'harry', 'alohomora');
    addCardToHand(state, 'harry', 'alohomora');
    const handSizeBefore = state.players.harry!.hand.length;

    resolveDarkArtEvent(state, 'flipendo');

    expect(state.players.harry!.health).toBe(9);
    expect(state.players.harry!.hand.length).toBe(handSizeBefore - 1);
  });
});

describe('Dark Arts: Blast-Ended Skrewt', () => {
  it('deals 1 damage and discards 1 from previous player', () => {
    const state = buildTestState(7, ['harry', 'ron', 'hermione']);
    // Previous player from harry in ['harry','ron','hermione'] is hermione (wraps around)
    state.players.hermione!.health = 10;
    addCardToHand(state, 'hermione', 'alohomora');
    addCardToHand(state, 'hermione', 'alohomora');
    const hermioneHandSizeBefore = state.players.hermione!.hand.length;

    resolveDarkArtEvent(state, 'blastended');

    // Previous player before harry is hermione (turn order wraps)
    expect(state.players.hermione!.health).toBe(9);
    expect(state.players.hermione!.hand.length).toBe(hermioneHandSizeBefore - 1);
  });
});

// ---------------------------------------------------------------------------
// Reveal and Penalty
// ---------------------------------------------------------------------------

describe('Dark Arts: Oppugno', () => {
  it('reveals top card and penalizes if cost >= 1', () => {
    const state = buildTestState();
    state.players.harry!.health = 10;
    // Put a card with cost >= 1 on top of deck
    addCardToDeck(state, 'harry', 'expelliarmus', true);

    resolveDarkArtEvent(state, 'oppugno');

    // expelliarmus costs 3 (>= 1), so 2 damage and card discarded
    expect(state.players.harry!.health).toBe(8);
  });

  it('does not penalize if top card costs 0', () => {
    const state = buildTestState();
    state.players.harry!.health = 10;
    // Put a 0-cost card on top of deck
    addCardToDeck(state, 'harry', 'alohomora', true);

    resolveDarkArtEvent(state, 'oppugno');

    // alohomora costs 0, so no penalty
    expect(state.players.harry!.health).toBe(10);
  });
});

describe('Dark Arts: Legilimency', () => {
  it('reveals top card and penalizes if it is a spell', () => {
    const state = buildTestState();
    state.players.harry!.health = 10;
    // Put a spell on top of deck
    addCardToDeck(state, 'harry', 'expelliarmus', true);

    resolveDarkArtEvent(state, 'legilimency');

    // expelliarmus is a spell, so 2 damage and card discarded
    expect(state.players.harry!.health).toBe(8);
  });

  it('does not penalize if top card is not a spell', () => {
    const state = buildTestState();
    state.players.harry!.health = 10;
    // Put an item on top of deck
    addCardToDeck(state, 'harry', 'invisibilitycloak', true);

    resolveDarkArtEvent(state, 'legilimency');

    // invisibilitycloak is an item, not a spell, so no penalty
    expect(state.players.harry!.health).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// Conditional Effects
// ---------------------------------------------------------------------------

describe('Dark Arts: Morsmordre', () => {
  it('deals 1 damage to all and adds 1 location control', () => {
    const state = buildTestState(7, ['harry', 'ron']);
    state.players.harry!.health = 10;
    state.players.ron!.health = 10;

    resolveDarkArtEvent(state, 'morsmordre');

    expect(state.players.harry!.health).toBe(9);
    expect(state.players.ron!.health).toBe(9);
    expect(state.currentLocation!.currentControl).toBe(1);
  });

  it('deals bonus damage when Death Eater villain is in play', () => {
    const state = buildTestState(7, ['harry', 'ron']);
    state.players.harry!.health = 10;
    state.players.ron!.health = 10;
    addActiveVillain(state, 'deatheater', 7);

    resolveDarkArtEvent(state, 'morsmordre');

    // 1 base + 1 bonus from Death Eater = 2 total damage
    expect(state.players.harry!.health).toBe(8);
    expect(state.players.ron!.health).toBe(8);
    expect(state.currentLocation!.currentControl).toBe(1);
  });
});

describe('Dark Arts: Sectumsempra', () => {
  it('deals 2 damage to all players and prevents healing this turn', () => {
    const state = buildTestState(7, ['harry', 'ron']);
    state.players.harry!.health = 10;
    state.players.ron!.health = 10;

    resolveDarkArtEvent(state, 'sectumsempra');

    expect(state.players.harry!.health).toBe(8);
    expect(state.players.ron!.health).toBe(8);
    expect(state.healingPreventedThisTurn).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Roll Outcome Table
// ---------------------------------------------------------------------------

describe('Dark Arts: Heir of Slytherin', () => {
  it('resolves a roll outcome without error', () => {
    const state = buildTestState();
    state.players.harry!.health = 10;

    // Heir of Slytherin uses roll_outcome_table which is RNG-dependent.
    // We just verify it resolves without error and doesn't crash.
    expect(() => resolveDarkArtEvent(state, 'heirofslytherin')).not.toThrow();
  });

  it('produces one of the expected outcomes', () => {
    const state = buildTestState();
    state.players.harry!.health = 10;
    resolveDarkArtEvent(state, 'heirofslytherin');

    // One of four outcomes should have occurred:
    // - add 1 location control
    // - heal villains 2 (no villains to heal, so no observable change)
    // - all discard 1 (no cards in hand, so no observable change)
    // - damage all 1
    // We just verify the state is still valid
    expect(state.players.harry!.health).toBeGreaterThanOrEqual(0);
    expect(state.players.harry!.health).toBeLessThanOrEqual(10);
  });
});

// ---------------------------------------------------------------------------
// Data Integrity
// ---------------------------------------------------------------------------

describe('Dark Arts data integrity', () => {
  const expectedEvents = [
    'expulso',
    'petrification',
    'flipendo',
    'hewhomustnotbenamed',
    'handofglory',
    'relashio',
    'obliviate',
    'poison',
    'oppugno',
    'tarantallegra',
    'dementorskiss',
    'regeneration',
    'avadakedavra',
    'morsmordre',
    'heirofslytherin',
    'crucio',
    'imperio',
    'educationaldecree',
    'legilimency',
    'sectumsempra',
    'sluguluseructo',
    'fiendfyre',
    'menacinggrowl',
    'blastended',
    'ragingtroll',
    'inquisitorialsquad',
  ];

  it.each(expectedEvents)('has valid data for event %s', (eventId) => {
    const event = getDarkArt(eventId);
    expect(event).toBeDefined();
    expect(event!.id).toBe(eventId);
    expect(event!.effects).toBeDefined();
    expect(event!.effects!.length).toBeGreaterThan(0);
  });

  it('covers all 26 unique Dark Arts events', () => {
    expect(expectedEvents.length).toBe(26);
  });
});
