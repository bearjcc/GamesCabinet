import { getCard, getDarkArt, getVillain } from '../../dataManager';
import { resolveEffects } from '../../effectResolver';
import { createCardInstance, initializeRng } from '../../gameState';
import { initializeHorcruxes } from '../../horcruxes';
import { playCard, startTurn } from '../../turnLogic';
import type { EffectContext, HogwartsGameState } from '../../types';
import { createInitialGameState } from '../../types';

export function buildTestState(seed = 7, playerIds: string[] = ['harry']): HogwartsGameState {
  const state = createInitialGameState();
  initializeRng(seed, state);
  for (const id of playerIds) {
    state.players[id] = {
      name: id,
      characterId: id,
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
  }
  state.currentPlayerId = playerIds[0]!;
  state.turnOrder = [...playerIds];
  state.currentPhase = 'HERO_ACTION';
  state.currentLocation = {
    locationId: 'castlegates',
    currentControl: 0,
    maxControl: 5,
    darkArtsToReveal: 1,
  };
  state.market.availableCards = ['', '', '', '', '', ''];
  state.marketSpaces = 6;
  state.damageDealtThisTurn = 0;
  state.healOccurredThisTurn = false;
  state.horcruxState = null;
  state.horcruxHealingBlockedThisTurn = false;
  state.encounterState = null;
  state.diceRolledThisTurn = 0;
  return state;
}

export function setHero(state: HogwartsGameState, playerId: string, heroId: string): void {
  const player = state.players[playerId];
  if (!player) return;
  player.characterId = heroId;
  player.name = heroId;
}

export function setProficiency(
  state: HogwartsGameState,
  playerId: string,
  proficiencyId: string,
): void {
  const player = state.players[playerId];
  if (!player) return;
  player.proficiencyId = proficiencyId;
}

export function initHorcruxes(state: HogwartsGameState): void {
  initializeHorcruxes(state);
}

export function addCardToHand(state: HogwartsGameState, playerId: string, cardId: string): string {
  const instance = createCardInstance(state, cardId);
  instance.ownerPlayer = playerId;
  instance.zone = 'hand';
  state.players[playerId]!.hand.push(instance.instanceId);
  return instance.instanceId;
}

export function addCardToPlayArea(
  state: HogwartsGameState,
  playerId: string,
  cardId: string,
): string {
  const instance = createCardInstance(state, cardId);
  instance.ownerPlayer = playerId;
  instance.zone = 'play_area';
  state.players[playerId]!.playArea.push(instance.instanceId);
  return instance.instanceId;
}

export function addCardToDeck(
  state: HogwartsGameState,
  playerId: string,
  cardId: string,
  toTop = false,
): string {
  const instance = createCardInstance(state, cardId);
  instance.ownerPlayer = playerId;
  instance.zone = 'deck';
  const deck = state.players[playerId]!.deck;
  if (toTop) deck.unshift(instance.instanceId);
  else deck.push(instance.instanceId);
  return instance.instanceId;
}

export function addCardToDiscard(
  state: HogwartsGameState,
  playerId: string,
  cardId: string,
): string {
  const instance = createCardInstance(state, cardId);
  instance.ownerPlayer = playerId;
  instance.zone = 'discard';
  state.players[playerId]!.discard.push(instance.instanceId);
  return instance.instanceId;
}

export function playCardFromHand(
  state: HogwartsGameState,
  playerId: string,
  cardId: string,
  autoResolve = true,
): boolean {
  const instanceId = state.players[playerId]!.hand.find(
    (id) => state.cardInstances[id]?.cardId === cardId,
  );
  if (!instanceId) return false;
  const ok = playCard(state, playerId, instanceId);
  if (ok && autoResolve && state.pendingChoice) {
    state.pendingChoice = null;
  }
  return ok;
}

export function resolveCardEffects(
  state: HogwartsGameState,
  cardId: string,
  playerId: string,
  autoResolve = true,
): void {
  const card = getCard(cardId);
  const ctx: EffectContext = {
    sourcePlayerId: playerId,
    source: 'card_play',
    autoResolve,
  };
  resolveEffects(card?.effects ?? [], ctx, state);
}

export function resolveDarkArtEvent(
  state: HogwartsGameState,
  eventId: string,
  playerId?: string,
): void {
  const event = getDarkArt(eventId);
  resolveEffects(
    event?.effects ?? [],
    {
      sourcePlayerId: playerId ?? state.currentPlayerId,
      source: 'dark_arts',
      autoResolve: true,
    },
    state,
  );
}

export function addMarketCard(
  state: HogwartsGameState,
  marketIndex: number,
  cardId: string,
): string {
  const instance = createCardInstance(state, cardId);
  instance.zone = 'market';
  state.market.availableCards[marketIndex] = instance.instanceId;
  return instance.instanceId;
}

export function addActiveVillain(state: HogwartsGameState, villainId: string, hp?: number): void {
  const data = getVillain(villainId);
  const maxHp = hp ?? data?.hp ?? 5;
  state.activeVillains.push({
    villainId,
    currentHp: maxHp,
    maxHp,
    isActive: true,
    isBlocked: false,
    controlTokens: 0,
  });
}

export function resolveVillainOngoing(
  state: HogwartsGameState,
  villainId: string,
  playerId?: string,
): void {
  const ongoing = getVillain(villainId)?.ongoing_effect;
  if (!ongoing) return;
  resolveEffects(
    [ongoing],
    {
      sourcePlayerId: playerId ?? state.currentPlayerId,
      source: 'villain',
      villainId,
      autoResolve: true,
    },
    state,
  );
}

export function resolveVillainDeath(
  state: HogwartsGameState,
  villainId: string,
  playerId?: string,
): void {
  const death = getVillain(villainId)?.death_effect;
  if (!death || death.type === 'none') return;
  resolveEffects(
    [death],
    {
      sourcePlayerId: playerId ?? state.currentPlayerId,
      source: 'villain_death',
      villainId,
      autoResolve: true,
    },
    state,
  );
}

export { startTurn };
