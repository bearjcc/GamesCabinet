import { initializeCharms, resetCharmTurnCounters } from './charms';
import {
  buildDarkArtsDeck,
  buildLocationDeck,
  buildMarketDeck,
  buildVillainDeck,
  getCampaignGame,
  getCampaignGames,
  getCard,
  getDarkArt,
  getHero,
  getLocation,
  getMarketSpaces,
  getStartingDeck,
  getVillain,
  getVillainSlots,
} from './dataManager';
import {
  buildPlayerPickChoice,
  effectRequiresPlayerChoice,
  fireOnDiscardEffect,
  fireVillainTrigger,
  resolveEffect,
  resolveEffects,
} from './effectResolver';
import {
  allEncountersCompleted,
  checkEncounterCompletion,
  getEncounterHandDrawLimit,
  initializeEncounters,
  onEncounterCardAcquired,
  onEncounterCardPlayed,
  onEncounterCreatureDefeated,
  onEncounterVillainDefeated,
  resetEncounterTurnCounters,
} from './encounters';
import {
  allLocationsControlled,
  allVillainsDefeated,
  createCardInstance,
  drawCardForPlayer,
  drawDarkArtsEvent,
  getCardInstance,
  getPlayer,
  initializeRng,
  isLocationLost,
  refillMarket,
  resetTurnCounters,
  shuffleArray,
} from './gameState';
import { onHeroSpellPlayed } from './heroAbilities';
import {
  canAssignAttackToVillain,
  initializeHorcruxes,
  onHorcruxAllyPlayed,
  onHorcruxAttackAssigned,
  onHorcruxCardAcquired,
  onHorcruxSpellPlayed,
  onHorcruxTurnEnd,
  onHorcruxTurnStart,
} from './horcruxes';
import { assignPatronus } from './patronus';
import { initializePotions, resetPotionTurnCounters } from './potions';
import {
  activateProficiency,
  fireCreatureKilledProficiencies,
  getEffectiveCardCost,
  onAttackCreature,
  onCardTypesPlayed,
  onItemPlayed,
  onSpellPurchased,
} from './proficiencies';
import {
  createEmptyPlayer,
  type GamePhase,
  type HogwartsGameState,
  type VillainState,
} from './types';
import { isVillainEffectBlocked, resolveVillainOngoingAtPhase } from './villainEffects';

export { activateProficiency };

export function setupGame(
  state: HogwartsGameState,
  gameNumber: number,
  heroIds: string[],
  seed = Date.now() % 1_000_000,
): void {
  const allGames = getCampaignGames();
  const minGame = allGames.length > 0 ? allGames[0]!.number : 1;
  const maxGame = allGames.length > 0 ? allGames[allGames.length - 1]!.number : 1;
  let validatedGameNumber = gameNumber;
  if (gameNumber < minGame || gameNumber > maxGame) {
    console.warn(
      `setupGame: gameNumber ${gameNumber} out of range [${minGame}, ${maxGame}], clamping to valid range`,
    );
    validatedGameNumber = Math.max(minGame, Math.min(maxGame, gameNumber));
  }

  Object.assign(state, {
    ...state,
    players: {},
    activeVillains: [],
    villainDeck: [],
    villainDiscard: [],
    currentLocation: null,
    locationDeck: [],
    locationDiscard: [],
    darkArtsDeck: [],
    darkArtsDiscard: [],
    darkArtsPlayedThisTurn: [],
    darkArtsRemainingToReveal: 0,
    market: { availableCards: [], deck: [] },
    marketSpaces: 6, // overridden below from campaign config
    turnOrder: [...heroIds],
    currentPhase: 'SETUP' as GamePhase,
    turnNumber: 0,
    gameNumber: validatedGameNumber,
    isGameOver: false,
    isVictory: false,
    cardInstances: {},
    nextInstanceCounter: 0,
    pendingChoice: null,
    playAllDecisionQueue: [],
    attackAssignments: {},
    focusedVillainIndex: 0,
    healingPreventedThisTurn: false,
    blockVillainEffectsThisTurn: false,
    blockCreatureEffectsThisTurn: false,
    damageDealtThisTurn: 0,
    healOccurredThisTurn: false,
    horcruxState: null,
    horcruxHealingBlockedThisTurn: false,
    encounterState: null,
    diceRolledThisTurn: 0,
    potionState: null,
    charmState: null,
  });

  initializeRng(seed, state);

  for (const heroId of heroIds) {
    const hero = getHero(heroId);
    if (!hero) continue;
    const player = createEmptyPlayer(heroId, hero.name);
    player.health = hero.starting_hp;
    player.maxHealth = hero.starting_hp;
    state.players[heroId] = player;

    for (const cardId of getStartingDeck(heroId)) {
      const instance = createCardInstance(state, cardId);
      instance.ownerPlayer = heroId;
      instance.zone = 'deck';
      player.deck.push(instance.instanceId);
    }
    shuffleArray(player.deck);
  }

  if (heroIds.length > 0) state.currentPlayerId = heroIds[0]!;

  state.villainDeck = buildVillainDeck(validatedGameNumber);
  shuffleArray(state.villainDeck);

  const slots = getVillainSlots(validatedGameNumber);
  for (let i = 0; i < slots; i += 1) {
    const villainId = state.villainDeck.shift();
    if (villainId) state.activeVillains.push(createVillainState(villainId));
  }

  state.darkArtsDeck = buildDarkArtsDeck(validatedGameNumber);
  shuffleArray(state.darkArtsDeck);

  // Location stack is ordered (corner numbering); do not shuffle (see core-base-rules.md).
  state.locationDeck = buildLocationDeck(validatedGameNumber);
  revealNextLocation(state);

  // Set market spaces from campaign config (Game 1 = 4, others = 6)
  const marketSpaceCount = getMarketSpaces(validatedGameNumber);
  state.marketSpaces = marketSpaceCount;
  state.market.availableCards = Array.from({ length: marketSpaceCount }, () => '');

  const marketIds = buildMarketDeck(validatedGameNumber);
  shuffleArray(marketIds);
  const marketInstances: string[] = [];
  for (const cardId of marketIds) {
    const instance = createCardInstance(state, cardId);
    instance.zone = 'market';
    marketInstances.push(instance.instanceId);
  }
  state.market.deck = marketInstances;
  refillMarket(state);

  for (const heroId of heroIds) {
    for (let i = 0; i < 5; i += 1) drawCardForPlayer(state, heroId);
  }

  const campaign = getCampaignGame(validatedGameNumber);

  // Assign proficiencies for games that use them (Game 6+)
  if (campaign?.proficiency_pool?.length) {
    const pool = [...campaign.proficiency_pool];
    shuffleArray(pool);
    let idx = 0;
    for (const heroId of heroIds) {
      const player = state.players[heroId];
      if (player && pool[idx % pool.length]) {
        player.proficiencyId = pool[idx % pool.length]!;
      }
      idx += 1;
    }
  }

  if (campaign?.special_rules?.includes('horcrux')) {
    initializeHorcruxes(state);
  }

  if (campaign?.special_rules?.includes('encounter')) {
    initializeEncounters(state, validatedGameNumber);
  }

  if (campaign?.special_rules?.includes('patronus')) {
    for (const heroId of heroIds) {
      assignPatronus(state, heroId, heroId);
    }
  }

  if (campaign?.special_rules?.includes('charm')) {
    initializeCharms(state, validatedGameNumber);
  }

  if (campaign?.special_rules?.includes('potion')) {
    initializePotions(state, validatedGameNumber);
  }

  state.turnNumber = 0;
}

function createVillainState(villainId: string): VillainState {
  const data = getVillain(villainId);
  const hp = data?.hp ?? 5;
  return {
    villainId,
    currentHp: hp,
    maxHp: hp,
    isActive: true,
    isBlocked: false,
    controlTokens: 0,
  };
}

export function revealNextLocation(state: HogwartsGameState): string {
  if (state.locationDeck.length === 0) {
    state.currentLocation = null;
    return '';
  }
  const locId = state.locationDeck.shift()!;
  const locData = getLocation(locId);
  state.currentLocation = {
    locationId: locId,
    currentControl: 0,
    maxControl: locData?.max_control ?? 5,
    darkArtsToReveal: locData?.dark_arts_reveal_count ?? 1,
  };
  if (locData?.on_reveal?.length) {
    resolveEffects(
      locData.on_reveal,
      {
        sourcePlayerId: state.currentPlayerId,
        source: 'location',
        autoResolve: true,
      },
      state,
    );
  }
  return locId;
}

export function startTurn(state: HogwartsGameState): void {
  if (!state.currentPlayerId || !state.players[state.currentPlayerId]) return;

  state.turnNumber += 1;
  resetTurnCounters(state);
  resetEncounterTurnCounters(state);
  resetCharmTurnCounters(state);
  state.diceRolledThisTurn = 0;

  const player = getPlayer(state, state.currentPlayerId);
  if (player?.isStunned) {
    player.isStunned = false;
    player.health = player.maxHealth;
  }

  // Bug 4 fix: Fire villain ongoing effects with play_before_dark_arts before dark arts phase
  executeVillainPhaseBeforeDarkArts(state);

  // Calculate how many dark arts cards to reveal this turn.
  // The actual reveal happens one card at a time via revealNextDarkArtsCard
  // so the UI can render between reveals.
  const loc = state.currentLocation;
  state.darkArtsRemainingToReveal = loc?.darkArtsToReveal ?? 0;
  state.currentPhase = loc?.darkArtsToReveal ? 'DARK_ARTS' : 'HERO_ACTION';
}

/**
 * Bug 4 fix: Execute villain ongoing effects for villains with play_before_dark_arts: true.
 * Called at the start of the turn, before the dark arts phase.
 */
export function executeVillainPhaseBeforeDarkArts(state: HogwartsGameState): void {
  for (const villain of state.activeVillains) {
    if (!villain.isActive) continue;
    if (isVillainEffectBlocked(state, villain.villainId)) continue;
    const villainData = getVillain(villain.villainId);
    if (!villainData?.play_before_dark_arts) continue;
    const ongoing = villainData.ongoing_effect;
    if (ongoing) {
      resolveVillainOngoingAtPhase(
        ongoing,
        state,
        {
          sourcePlayerId: state.currentPlayerId,
          source: 'villain',
          villainId: villain.villainId,
          autoResolve: true,
        },
        resolveEffect,
      );
    }
  }
}

export function executeVillainPhase(state: HogwartsGameState): void {
  state.currentPhase = 'VILLAIN_PHASE';
  for (const villain of state.activeVillains) {
    if (!villain.isActive) continue;
    if (isVillainEffectBlocked(state, villain.villainId)) continue;
    const villainData = getVillain(villain.villainId);
    // Bug 4 fix: Skip villains whose effects already fired before dark arts
    if (villainData?.play_before_dark_arts) continue;
    const ongoing = villainData?.ongoing_effect;
    if (ongoing) {
      resolveVillainOngoingAtPhase(
        ongoing,
        state,
        {
          sourcePlayerId: state.currentPlayerId,
          source: 'villain',
          villainId: villain.villainId,
          autoResolve: true,
        },
        resolveEffect,
      );
    }
  }
  state.currentPhase = 'HERO_ACTION';
}

function revealNextDarkArtsCard(state: HogwartsGameState): void {
  if (state.darkArtsRemainingToReveal <= 0) return;
  state.currentPhase = 'DARK_ARTS';
  const eventId = drawDarkArtsEvent(state);
  state.darkArtsRemainingToReveal -= 1;
  if (!eventId) return;
  const darkArt = getDarkArt(eventId);
  resolveEffects(
    darkArt?.effects ?? [],
    {
      sourcePlayerId: state.currentPlayerId,
      source: 'dark_arts',
      autoResolve: true,
    },
    state,
  );
}

/**
 * FAQ: villains that reveal extra Dark Arts cards (Bellatrix) do so during the
 * Dark Arts phase, not during the villain phase.
 */
export function fireDarkArtsPhaseVillainEffects(state: HogwartsGameState): void {
  for (const villain of state.activeVillains) {
    if (!villain.isActive) continue;
    if (isVillainEffectBlocked(state, villain.villainId)) continue;
    const villainData = getVillain(villain.villainId);
    if (villainData?.ongoing_effect?.type !== 'reveal_extra_dark_arts') continue;
    resolveEffect(
      villainData.ongoing_effect,
      {
        sourcePlayerId: state.currentPlayerId,
        source: 'villain',
        villainId: villain.villainId,
        autoResolve: true,
      },
      state,
    );
  }
}

/**
 * End of the Dark Arts phase: extra reveals (Bellatrix), then Horcrux
 * turn-start effects (FAQ: Nagini strikes after Dark Arts, before Villains),
 * then the villain phase.
 */
function finishDarkArtsPhase(state: HogwartsGameState): void {
  fireDarkArtsPhaseVillainEffects(state);
  onHorcruxTurnStart(state);
  executeVillainPhase(state);
}

export function completeDarkArtsPhase(state: HogwartsGameState): void {
  while (state.darkArtsRemainingToReveal > 0) {
    revealNextDarkArtsCard(state);
  }
  if (state.currentPhase === 'DARK_ARTS') {
    finishDarkArtsPhase(state);
  }
}

/** Reveal one Dark Arts card for UI pacing; finishes into villain/hero phases when done. */
export function revealOneDarkArts(state: HogwartsGameState): void {
  if (state.darkArtsRemainingToReveal <= 0) {
    if (state.currentPhase === 'DARK_ARTS') finishDarkArtsPhase(state);
    return;
  }
  revealNextDarkArtsCard(state);
  if (state.darkArtsRemainingToReveal <= 0 && state.currentPhase === 'DARK_ARTS') {
    finishDarkArtsPhase(state);
  }
}

export function playCard(
  state: HogwartsGameState,
  playerId: string,
  cardInstanceId: string,
): boolean {
  if (state.currentPhase !== 'HERO_ACTION') return false;
  const player = getPlayer(state, playerId);
  if (!player?.hand.includes(cardInstanceId)) return false;

  const idx = player.hand.indexOf(cardInstanceId);
  player.hand.splice(idx, 1);
  player.playArea.push(cardInstanceId);
  const ci = getCardInstance(state, cardInstanceId);
  if (ci) ci.zone = 'play_area';

  const card = ci ? getCard(ci.cardId) : undefined;
  if (card?.type === 'spell') {
    player.spellsPlayedThisTurn += 1;
    onHeroSpellPlayed(state, playerId);
    onHorcruxSpellPlayed(state, playerId);
  }
  if (card?.type === 'item') {
    player.itemsPlayedThisTurn += 1;
    onItemPlayed(state, playerId);
  }
  if (card?.type === 'ally') {
    player.alliesPlayedThisTurn += 1;
    onHorcruxAllyPlayed(state, playerId);
  }

  resolveEffects(
    card?.effects ?? [],
    {
      sourcePlayerId: playerId,
      sourceCardInstanceId: cardInstanceId,
      source: 'card_play',
      autoResolve: false,
    },
    state,
  );

  if (card) {
    onEncounterCardPlayed(state, playerId, card.type, card.cost);
  }

  if (
    player.spellsPlayedThisTurn >= 1 &&
    player.itemsPlayedThisTurn >= 1 &&
    player.alliesPlayedThisTurn >= 1
  ) {
    onCardTypesPlayed(state, playerId);
  }

  return true;
}

function cardNeedsManualChoice(state: HogwartsGameState, cardInstanceId: string): boolean {
  const ci = getCardInstance(state, cardInstanceId);
  const card = ci ? getCard(ci.cardId) : undefined;
  return (card?.effects ?? []).some(effectRequiresPlayerChoice);
}

function continuePlayAllDecisionQueue(state: HogwartsGameState, playerId: string): void {
  const player = getPlayer(state, playerId);
  if (!player || state.pendingChoice) return;

  while (state.playAllDecisionQueue.length > 0 && !state.pendingChoice) {
    const nextCardId = state.playAllDecisionQueue.shift()!;
    if (player.hand.includes(nextCardId)) {
      playCard(state, playerId, nextCardId);
    }
  }
}

export function playAllCards(state: HogwartsGameState, playerId: string): boolean {
  if (state.currentPhase !== 'HERO_ACTION' || state.pendingChoice) return false;
  const player = getPlayer(state, playerId);
  if (!player) return false;

  const autoCards: string[] = [];
  const decisionCards: string[] = [];
  for (const cardId of player.hand) {
    if (cardNeedsManualChoice(state, cardId)) {
      decisionCards.push(cardId);
    } else {
      autoCards.push(cardId);
    }
  }

  state.playAllDecisionQueue = [...decisionCards];
  for (const cardId of autoCards) {
    if (!player.hand.includes(cardId)) continue;
    playCard(state, playerId, cardId);
    if (state.pendingChoice) {
      state.playAllDecisionQueue = [
        ...autoCards.slice(autoCards.indexOf(cardId) + 1),
        ...state.playAllDecisionQueue,
      ];
      return true;
    }
  }

  continuePlayAllDecisionQueue(state, playerId);
  return true;
}

function shouldAcquireToTopOfDeck(
  state: HogwartsGameState,
  playerId: string,
  purchasedType: string,
): boolean {
  const player = getPlayer(state, playerId);
  if (!player) return false;
  for (const instanceId of player.playArea) {
    const ci = getCardInstance(state, instanceId);
    if (!ci) continue;
    const passive = getCard(ci.cardId)?.passive_effect;
    if (!passive) continue;
    if (passive.type === 'purchased_spells_to_deck' && purchasedType === 'spell') return true;
    if (passive.type === 'purchased_items_to_deck' && purchasedType === 'item') return true;
    if (passive.type === 'purchased_allies_to_deck' && purchasedType === 'ally') return true;
  }
  return false;
}

export function buyCard(state: HogwartsGameState, playerId: string, marketIndex: number): boolean {
  if (state.currentPhase !== 'HERO_ACTION') return false;
  const player = getPlayer(state, playerId);
  if (!player) return false;
  const cardInstanceId = state.market.availableCards[marketIndex];
  if (!cardInstanceId) return false;

  const ci = getCardInstance(state, cardInstanceId);
  if (!ci) return false;
  const card = getCard(ci.cardId);
  const cost = getEffectiveCardCost(state, playerId, card);
  if (player.moneyTokens < cost) return false;

  player.moneyTokens -= cost;
  player.moneyTokensSpentThisTurn += cost;
  state.market.availableCards[marketIndex] = '';
  ci.ownerPlayer = playerId;

  const toTop = shouldAcquireToTopOfDeck(state, playerId, card?.type ?? '');
  if (toTop) {
    player.deck.unshift(cardInstanceId);
    ci.zone = 'deck';
  } else {
    player.discard.push(cardInstanceId);
    ci.zone = 'discard';
  }

  refillMarket(state);

  if (card?.type === 'spell') {
    onSpellPurchased(state, playerId);
  }

  onHorcruxCardAcquired(state, playerId, card?.cost ?? 0);
  onEncounterCardAcquired(state, cost);

  if (shouldTriggerCardCostPurchase(state, cost)) {
    fireVillainTrigger(state, 'deal_damage_on_card_cost', {
      sourcePlayerId: playerId,
      source: 'villain',
    });
  }

  return true;
}

function shouldTriggerCardCostPurchase(state: HogwartsGameState, cost: number): boolean {
  return state.activeVillains.some((villain) => {
    if (!villain.isActive || isVillainEffectBlocked(state, villain.villainId)) return false;
    const ongoing = getVillain(villain.villainId)?.ongoing_effect;
    if (ongoing?.type !== 'deal_damage_on_card_cost') return false;
    return cost >= Number(ongoing.params?.min_cost ?? 0);
  });
}

export function attackVillainWithAmount(
  state: HogwartsGameState,
  playerId: string,
  villainIndex: number,
  amount: number,
  bypassAttackLimit = false,
): boolean {
  if (state.currentPhase !== 'HERO_ACTION') return false;
  const player = getPlayer(state, playerId);
  if (!player || player.attackTokens <= 0 || amount <= 0) return false;
  const villain = state.activeVillains[villainIndex];
  if (!villain?.isActive) return false;
  if (!canAssignAttackToVillain(state, villain.villainId)) return false;

  // Bug 1 fix: Enforce one attack per villain per turn unless bypassed
  const villainKey = villain.villainId;
  const timesAttacked = player.villainsAttackedThisTurn[villainKey] ?? 0;
  if (timesAttacked > 0 && !bypassAttackLimit) return false;

  const villainData = getVillain(villain.villainId);
  if (villainData?.type === 'creature') {
    onAttackCreature(state, playerId);
  }

  const damage = Math.min(amount, player.attackTokens);
  player.attackTokens -= damage;
  villain.currentHp -= damage;
  player.villainsAttackedThisTurn[villainKey] = timesAttacked + 1;
  onHorcruxAttackAssigned(state, playerId, damage);

  if (villain.currentHp <= 0)
    defeatVillain(state, villainIndex, villainData?.type === 'creature', playerId);

  return true;
}

function defeatVillain(
  state: HogwartsGameState,
  villainIndex: number,
  isCreature = false,
  killerId?: string,
): void {
  const villain = state.activeVillains[villainIndex];
  if (!villain) return;
  villain.isActive = false;
  const killer = getPlayer(state, killerId ?? state.currentPlayerId);
  if (killer) killer.villainsKilledThisTurn += 1;
  const data = getVillain(villain.villainId);
  if (data?.death_effect && data.death_effect.type !== 'none') {
    resolveEffects(
      [data.death_effect],
      {
        sourcePlayerId: killerId ?? state.currentPlayerId,
        source: 'villain_death',
        villainId: villain.villainId,
        autoResolve: true,
      },
      state,
    );
  }
  if (isCreature && killerId) {
    fireCreatureKilledProficiencies(state, killerId);
    onEncounterCreatureDefeated(state, killerId);
  }
  if (!isCreature && killerId) {
    onEncounterVillainDefeated(state, killerId);
  }
}

export function endTurn(state: HogwartsGameState): void {
  executeCleanupPhase(state);
}

function executeCleanupPhase(state: HogwartsGameState): void {
  state.currentPhase = 'CLEANUP';
  const player = getPlayer(state, state.currentPlayerId);
  if (!player) return;

  // FAQ: new Villains enter play (and effects like Death Eater's trigger)
  // before the active Hero discards and draws.
  refillDefeatedVillainSlots(state);

  // FAQ: end-of-turn discards never trigger on-discard effects (isCleanup).
  while (player.hand.length > 0) {
    const id = player.hand.pop()!;
    player.discard.push(id);
    const ci = getCardInstance(state, id);
    if (ci) ci.zone = 'discard';
    fireOnDiscardEffect(state, id, state.currentPlayerId, true);
  }

  while (player.playArea.length > 0) {
    const id = player.playArea.pop()!;
    player.discard.push(id);
    const ci = getCardInstance(state, id);
    if (ci) ci.zone = 'discard';
    fireOnDiscardEffect(state, id, state.currentPlayerId, true);
  }

  player.attackTokens = 0;
  player.moneyTokens = 0;
  player.moneyTokensSpentThisTurn = 0;

  onHorcruxTurnEnd(state);

  if (state.encounterState) {
    checkEncounterCompletion(state, state.currentPlayerId);
  }

  // Reset potion gathered ingredients at end of turn
  if (state.potionState) {
    resetPotionTurnCounters(state);
  }

  const drawLimit = getEncounterHandDrawLimit(state);
  const cardsToDraw = drawLimit ?? 5;
  for (let i = 0; i < cardsToDraw; i += 1) drawCardForPlayer(state, state.currentPlayerId);

  refillMarket(state);
  resolveLocationControlAtCleanup(state);
  reviveStunnedHeroes(state);

  if (checkWinCondition(state) || checkLossCondition(state)) {
    state.currentPhase = 'GAME_OVER';
    return;
  }
}

function resolveLocationControlAtCleanup(state: HogwartsGameState): void {
  if (!isLocationLost(state) || !state.currentLocation) return;
  const captured = state.currentLocation.locationId;
  state.locationDiscard.push(captured);
  revealNextLocation(state);
}

function refillDefeatedVillainSlots(state: HogwartsGameState): void {
  for (let i = 0; i < state.activeVillains.length; i += 1) {
    const villain = state.activeVillains[i]!;
    if (villain.isActive) continue;
    if (villain.villainId && !state.villainDiscard.includes(villain.villainId)) {
      state.villainDiscard.push(villain.villainId);
    }
    if (state.villainDeck.length === 0) continue;
    const newId = state.villainDeck.shift()!;
    state.activeVillains[i] = createVillainState(newId);
    fireVillainTrigger(state, 'damage_all_on_new_villain', {
      sourcePlayerId: state.currentPlayerId,
      source: 'villain',
    });
  }
}

function reviveStunnedHeroes(state: HogwartsGameState): void {
  for (const player of Object.values(state.players)) {
    if (player.isStunned) {
      player.isStunned = false;
      player.health = player.maxHealth;
    }
  }
}

export function checkWinCondition(state: HogwartsGameState): boolean {
  if (state.encounterState && !allEncountersCompleted(state)) return false;
  if (allVillainsDefeated(state)) {
    state.isGameOver = true;
    state.isVictory = true;
    return true;
  }
  return false;
}

export function checkLossCondition(state: HogwartsGameState): boolean {
  if (allLocationsControlled(state)) {
    state.isGameOver = true;
    state.isVictory = false;
    return true;
  }
  return false;
}

/** FAQ: once per game, the active Hero may cycle the market row. */
export function cycleMarket(state: HogwartsGameState, playerId: string): boolean {
  if (state.currentPhase !== 'HERO_ACTION') return false;
  if (playerId !== state.currentPlayerId) return false;
  const player = getPlayer(state, playerId);
  if (!player || player.hasCycledMarket) return false;
  player.hasCycledMarket = true;
  const faceUp = state.market.availableCards.filter((id) => id !== '');
  for (let i = 0; i < state.market.availableCards.length; i += 1) {
    state.market.availableCards[i] = '';
  }
  state.market.deck.push(...faceUp);
  refillMarket(state);
  return true;
}

export function resolveChoice(
  state: HogwartsGameState,
  optionIndex: number,
  playerId?: string | null,
): boolean {
  const pending = state.pendingChoice;
  if (!pending) return false;
  const owner = pending.context.sourcePlayerId ?? state.currentPlayerId;
  if (playerId != null && playerId !== owner) return false;
  const option = pending.options[optionIndex];
  if (!option) return false;
  state.pendingChoice = null;
  const continuation = pending.continuation;

  if (continuation?.type === 'select_players_exclusive') {
    const pickedId = option.contextOverrides?.selectedPlayerIds?.[0];
    const picked = [...continuation.pickedSoFar, ...(pickedId ? [pickedId] : [])];
    const picksLeft = continuation.remainingPicks - 1;
    if (picksLeft > 0) {
      state.pendingChoice = buildPlayerPickChoice(state, pending.context, {
        ...continuation,
        remainingPicks: picksLeft,
        pickedSoFar: picked,
      });
      return true;
    }
    const selectedContext = {
      ...pending.context,
      selectedPlayerIds: picked,
      autoResolve: true,
    };
    for (const sub of continuation.effects ?? []) resolveEffect(sub, selectedContext, state);
    continuePlayAllDecisionQueue(state, pending.context.sourcePlayerId ?? state.currentPlayerId);
    return true;
  }

  resolveEffects(
    [option.effect],
    { ...pending.context, ...option.contextOverrides, autoResolve: true },
    state,
  );

  if (continuation?.type === 'choose_n') {
    const picksLeft = continuation.remainingPicks - 1;
    const remainingOptions = pending.options.filter((_, i) => i !== optionIndex);
    if (picksLeft > 0 && remainingOptions.length > 0) {
      state.pendingChoice = {
        choiceId: `${pending.choiceId}_cont`,
        options: remainingOptions,
        context: pending.context,
        continuation: { ...continuation, remainingPicks: picksLeft },
      };
      return true;
    }
  }

  continuePlayAllDecisionQueue(state, pending.context.sourcePlayerId ?? state.currentPlayerId);
  return true;
}
