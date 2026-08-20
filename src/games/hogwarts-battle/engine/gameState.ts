import { drawOneToHand, refillEmptySlots } from '../../shared/deckbuilder';
import type { CardInstance, HogwartsGameState } from './types';
import { hasActiveVillainOngoing } from './villainEffects';

type LocationControlHook = (state: HogwartsGameState, amount: number) => void;

let onLocationControlAdded: LocationControlHook | null = null;
let onLocationControlRemoved: LocationControlHook | null = null;
let onHeroCardDrawnHook: ((state: HogwartsGameState, playerId: string) => void) | null = null;

export function registerLocationControlHooks(hooks: {
  onAdded?: LocationControlHook;
  onRemoved?: LocationControlHook;
}): void {
  if (hooks.onAdded) onLocationControlAdded = hooks.onAdded;
  if (hooks.onRemoved) onLocationControlRemoved = hooks.onRemoved;
}

export function registerHeroCardDrawnHook(
  hook: (state: HogwartsGameState, playerId: string) => void,
): void {
  onHeroCardDrawnHook = hook;
}

class SeededRng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  nextInt(maxExclusive: number): number {
    this.state = (1664525 * this.state + 1013904223) >>> 0;
    return maxExclusive === 0 ? 0 : this.state % maxExclusive;
  }
}

let rng = new SeededRng(1);

export function initializeRng(seed: number, state: HogwartsGameState): void {
  state.rngSeed = seed;
  rng = new SeededRng(seed);
}

export function shuffleArray<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = rng.nextInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

export function rngNextInt(maxExclusive: number): number {
  return rng.nextInt(maxExclusive);
}

export function createCardInstance(state: HogwartsGameState, cardId: string): CardInstance {
  const instanceId = `card_${cardId}_${state.nextInstanceCounter}_${rng.nextInt(10000)}`;
  state.nextInstanceCounter += 1;
  const instance: CardInstance = {
    instanceId,
    cardId,
    ownerPlayer: '',
    zone: 'deck',
  };
  state.cardInstances[instanceId] = instance;
  return instance;
}

export function getCardInstance(state: HogwartsGameState, instanceId: string): CardInstance | null {
  return state.cardInstances[instanceId] ?? null;
}

export function getPlayer(state: HogwartsGameState, playerId: string) {
  return state.players[playerId] ?? null;
}

export function getCurrentPlayer(state: HogwartsGameState) {
  return getPlayer(state, state.currentPlayerId);
}

export function resetTurnCounters(state: HogwartsGameState): void {
  for (const player of Object.values(state.players)) {
    player.attackTokens = 0;
    player.moneyTokens = 0;
    player.moneyTokensSpentThisTurn = 0;
    player.spellsPlayedThisTurn = 0;
    player.itemsPlayedThisTurn = 0;
    player.alliesPlayedThisTurn = 0;
    player.villainsKilledThisTurn = 0;
    player.hasHealedThisTurn = false;
    player.abilityUsedThisTurn = false;
    player.proficiencyUsedThisTurn = false;
    player.healAmountThisTurn = 0;
    player.attackedCreatureThisTurn = false;
    player.patronusUsedThisTurn = false;
    player.patronusShield = false;
    player.villainsAttackedThisTurn = {};
  }
  state.darkArtsPlayedThisTurn = [];
  state.darkArtsRemainingToReveal = 0;
  state.playAllDecisionQueue = [];
  state.attackAssignments = {};
  state.healingPreventedThisTurn = false;
  state.blockVillainEffectsThisTurn = false;
  state.blockCreatureEffectsThisTurn = false;
  state.damageDealtThisTurn = 0;
  state.healOccurredThisTurn = false;
  state.horcruxHealingBlockedThisTurn = false;
  state.diceRolledThisTurn = 0;
  for (const player of Object.values(state.players)) {
    player.firstCardDrawnThisTurn = false;
  }
}

export function addLocationControl(state: HogwartsGameState, amount: number): number {
  const loc = state.currentLocation;
  if (!loc || amount <= 0) return 0;
  const old = loc.currentControl;
  loc.currentControl = Math.min(loc.maxControl, loc.currentControl + amount);
  const added = loc.currentControl - old;
  if (added > 0) onLocationControlAdded?.(state, added);
  return added;
}

export function removeLocationControl(state: HogwartsGameState, amount: number): number {
  if (hasActiveVillainOngoing(state, 'prevent_location_removal')) return 0;
  const loc = state.currentLocation;
  if (!loc || amount <= 0) return 0;
  const old = loc.currentControl;
  loc.currentControl = Math.max(0, loc.currentControl - amount);
  const removed = old - loc.currentControl;
  if (removed > 0) onLocationControlRemoved?.(state, removed);
  return removed;
}

export function isLocationLost(state: HogwartsGameState): boolean {
  const loc = state.currentLocation;
  if (!loc) return false;
  return loc.currentControl >= loc.maxControl;
}

export function allVillainsDefeated(state: HogwartsGameState): boolean {
  if (!state.activeVillains.every((v) => !v.isActive)) return false;
  return state.villainDeck.length === 0;
}

export function allLocationsControlled(state: HogwartsGameState): boolean {
  return (
    state.currentLocation === null &&
    state.locationDeck.length === 0 &&
    state.locationDiscard.length > 0
  );
}

export function stunPlayer(state: HogwartsGameState, playerId: string): boolean {
  const player = getPlayer(state, playerId);
  if (!player || player.isStunned) return false;
  if (player.patronusShield) {
    player.patronusShield = false;
    return false;
  }
  player.isStunned = true;
  player.health = 0;
  player.attackTokens = 0;
  player.moneyTokens = 0;
  player.moneyTokensSpentThisTurn = 0;
  const discardCount = Math.floor(player.hand.length / 2);
  for (let i = 0; i < discardCount; i += 1) {
    const cardId = player.hand.pop();
    if (!cardId) break;
    player.discard.push(cardId);
    const ci = getCardInstance(state, cardId);
    if (ci) ci.zone = 'discard';
  }
  addLocationControl(state, 1);
  return true;
}

export function drawCardForPlayer(state: HogwartsGameState, playerId: string): string {
  if (
    state.currentPhase !== 'CLEANUP' &&
    state.currentPhase !== 'SETUP' &&
    hasActiveVillainOngoing(state, 'prevent_extra_draw')
  ) {
    return '';
  }
  const player = getPlayer(state, playerId);
  if (!player) return '';
  const instanceId = drawOneToHand(player.deck, player.hand, player.discard, shuffleArray);
  if (!instanceId) return '';
  const ci = getCardInstance(state, instanceId);
  if (ci) {
    ci.zone = 'hand';
    ci.ownerPlayer = playerId;
  }
  onHeroCardDrawnHook?.(state, playerId);
  return instanceId;
}

export function drawDarkArtsEvent(state: HogwartsGameState): string {
  if (state.darkArtsDeck.length === 0) {
    if (state.darkArtsDiscard.length === 0) return '';
    state.darkArtsDeck = [...state.darkArtsDiscard];
    state.darkArtsDiscard = [];
    shuffleArray(state.darkArtsDeck);
  }
  if (state.darkArtsDeck.length === 0) return '';
  const eventId = state.darkArtsDeck.shift()!;
  state.darkArtsDiscard.push(eventId);
  state.darkArtsPlayedThisTurn.push(eventId);
  return eventId;
}

function drawMarketInstance(state: HogwartsGameState, faceUpCardIds: string[]): string {
  const faceUp = new Set(faceUpCardIds);
  const deferred: string[] = [];
  while (state.market.deck.length > 0) {
    const instanceId = state.market.deck.shift()!;
    const cardId = getCardInstance(state, instanceId)?.cardId ?? '';
    if (!faceUp.has(cardId)) {
      state.market.deck = [...deferred, ...state.market.deck];
      return instanceId;
    }
    deferred.push(instanceId);
  }
  state.market.deck = [...deferred, ...state.market.deck];
  return '';
}

export function refillMarket(state: HogwartsGameState): void {
  refillEmptySlots(
    state.market.availableCards,
    (faceUpCardIds) => drawMarketInstance(state, faceUpCardIds),
    (instanceId) => getCardInstance(state, instanceId)?.cardId,
  );
}
