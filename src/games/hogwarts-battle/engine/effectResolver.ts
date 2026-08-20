import { rollCreatureDie } from './creatureDie';
import { getCard, getDarkArt, getHouseDice, getHouseDiceIds, getVillain } from './dataManager';
import { onEncounterControlAdded, onEncounterControlRemoved } from './encounters';
import {
  addLocationControl,
  drawCardForPlayer,
  drawDarkArtsEvent,
  getCardInstance,
  getCurrentPlayer,
  getPlayer,
  registerHeroCardDrawnHook,
  registerLocationControlHooks,
  removeLocationControl,
  rngNextInt,
  shuffleArray,
  stunPlayer,
} from './gameState';
import {
  onHeroCardDrawn,
  onHeroHeal,
  onLocationControlRemoved,
  recordDamageDealt,
} from './heroAbilities';
import {
  assignHouseDiceSymbolToHorcrux,
  houseDiceEffectToSymbol,
  isHorcruxHealingBlocked,
  onHorcruxLocationControlAdded,
  onHorcruxLocationControlRemoved,
} from './horcruxes';
import { onForcedDiscard, recordPlayerHeal } from './proficiencies';
import type {
  ChoiceOption,
  EffectContext,
  EffectData,
  HogwartsGameState,
  HorcruxSymbol,
  PendingChoiceContinuation,
  PlayerState,
} from './types';
import {
  findActiveVillainOngoingByType,
  hasActiveVillainOngoing,
  isVillainEffectBlocked,
} from './villainEffects';

function discardCardsFromHand(
  player: PlayerState,
  amount: number,
  state: HogwartsGameState,
  playerId: string,
  context?: EffectContext,
  collected?: { playerId: string; instanceId: string }[],
): void {
  const count = Math.min(amount, player.hand.length);
  for (let i = 0; i < count; i += 1) {
    if (player.hand.length === 0) break;
    const cardInstanceId = player.hand.pop()!;
    moveCardToDiscard(state, player, playerId, cardInstanceId, !collected);
    collected?.push({ playerId, instanceId: cardInstanceId });
  }
  if (count > 0 && (context?.source === 'dark_arts' || context?.source === 'villain')) {
    onForcedDiscard(state, playerId, count);
  }
}

function moveCardToDiscard(
  state: HogwartsGameState,
  player: PlayerState,
  playerId: string,
  cardInstanceId: string,
  fire = true,
): void {
  player.discard.push(cardInstanceId);
  const ci = getCardInstance(state, cardInstanceId);
  if (ci) {
    ci.zone = 'discard';
    ci.ownerPlayer = playerId;
  }
  if (fire) fireDiscardEffects(state, cardInstanceId, playerId);
}

function fireDiscardEffects(state: HogwartsGameState, cardInstanceId: string, playerId: string) {
  fireOnDiscardEffect(state, cardInstanceId, playerId);
  fireVillainTrigger(state, 'deal_damage_on_discard', {
    sourcePlayerId: playerId,
    source: 'villain',
  });
}

/** Discard a specific card from a player's hand, firing on-discard effects and triggers. */
export function discardFromHand(
  state: HogwartsGameState,
  playerId: string,
  cardInstanceId: string,
): boolean {
  const player = getPlayer(state, playerId);
  if (!player) return false;
  const idx = player.hand.indexOf(cardInstanceId);
  if (idx === -1) return false;
  player.hand.splice(idx, 1);
  moveCardToDiscard(state, player, playerId, cardInstanceId);
  return true;
}

export function fireOnDiscardEffect(
  state: HogwartsGameState,
  cardInstanceId: string,
  playerId: string,
  isCleanup = false,
): void {
  const ci = getCardInstance(state, cardInstanceId);
  if (!ci) return;
  const cardDef = getCard(ci.cardId);
  const onDiscard = cardDef?.on_discard_effect;
  if (!onDiscard) return;
  // FAQ: cards discarded at end of turn (cleanup) never trigger discard effects.
  if (isCleanup) return;
  resolveEffect(
    onDiscard,
    {
      sourcePlayerId: playerId,
      sourceCardInstanceId: cardInstanceId,
      source: 'on_discard',
      autoResolve: true,
      isCleanup,
    },
    state,
  );
}

export function fireVillainTrigger(
  state: HogwartsGameState,
  triggerType: string,
  context: EffectContext,
): void {
  for (const match of findActiveVillainOngoingByType(state, triggerType)) {
    resolveVillainTriggerEffect(match.effect, state, {
      ...context,
      source: 'villain',
      villainId: match.villainId,
      autoResolve: true,
    });
  }
}

function resolveVillainTriggerEffect(
  effect: EffectData,
  state: HogwartsGameState,
  context: EffectContext,
): void {
  const params = effect.params ?? {};
  switch (effect.type) {
    case 'deal_damage_on_location_control_added':
    case 'deal_damage_on_card_cost':
      resolveEffect(
        { type: 'deal_damage', params: { ...params, target: params.target ?? 'active_player' } },
        context,
        state,
      );
      break;
    case 'deal_damage_on_discard':
      resolveEffect({ type: 'deal_damage', params: { ...params, target: 'self' } }, context, state);
      break;
    case 'heal_villains_on_location_removed':
      resolveEffect({ type: 'heal_villains', params }, context, state);
      break;
    case 'damage_all_on_new_villain':
      resolveEffect(
        { type: 'deal_damage', params: { amount: params.amount ?? 1, target: 'all_players' } },
        context,
        state,
      );
      break;
    default:
      break;
  }
}

function discardCardTypeFromHand(
  player: PlayerState,
  cardType: string,
  state: HogwartsGameState,
  playerId: string,
  context?: EffectContext,
  collected?: { playerId: string; instanceId: string }[],
): void {
  for (let i = 0; i < player.hand.length; i += 1) {
    const cardInstanceId = player.hand[i]!;
    const ci = getCardInstance(state, cardInstanceId);
    if (!ci) continue;
    const card = getCard(ci.cardId);
    if (card?.type !== cardType) continue;
    player.hand.splice(i, 1);
    moveCardToDiscard(state, player, playerId, cardInstanceId, !collected);
    collected?.push({ playerId, instanceId: cardInstanceId });
    if (context?.source === 'dark_arts' || context?.source === 'villain') {
      onForcedDiscard(state, playerId, 1);
    }
    break;
  }
}

function banishFromHand(player: PlayerState, state: HogwartsGameState, cardType?: string): void {
  for (let i = player.hand.length - 1; i >= 0; i -= 1) {
    const cardInstanceId = player.hand[i]!;
    const ci = getCardInstance(state, cardInstanceId);
    if (!ci) continue;
    if (cardType && getCard(ci.cardId)?.type !== cardType) continue;
    player.hand.splice(i, 1);
    delete state.cardInstances[cardInstanceId];
    return;
  }
}

function getAdjacentPlayerId(state: HogwartsGameState, offset: number): string {
  if (state.turnOrder.length === 0) return state.currentPlayerId;
  const idx = state.turnOrder.indexOf(state.currentPlayerId);
  const next = (idx + offset + state.turnOrder.length) % state.turnOrder.length;
  return state.turnOrder[next]!;
}

function getTargetPlayerIds(
  targetSpec: string,
  state: HogwartsGameState,
  context: EffectContext,
): string[] {
  switch (targetSpec) {
    case 'self':
      return context.sourcePlayerId ? [context.sourcePlayerId] : [state.currentPlayerId];
    case 'active_player':
      return [state.currentPlayerId];
    case 'all_players':
      return Object.keys(state.players);
    case 'other_players': {
      const source = context.sourcePlayerId ?? state.currentPlayerId;
      return Object.keys(state.players).filter((id) => id !== source);
    }
    case 'choose':
    case 'choose_other_player': {
      const source = context.sourcePlayerId ?? state.currentPlayerId;
      if (targetSpec === 'choose_other_player') {
        return Object.keys(state.players)
          .filter((id) => id !== source)
          .slice(0, 1);
      }
      return [source];
    }
    case 'previous_player':
      return [getAdjacentPlayerId(state, -1)];
    case 'next_player':
      return [getAdjacentPlayerId(state, 1)];
    case 'selected':
      return context.selectedPlayerIds ?? [state.currentPlayerId];
    case 'healed_player':
      return context.healedPlayerId ? [context.healedPlayerId] : [state.currentPlayerId];
    default:
      return [state.currentPlayerId];
  }
}

function calculateDamage(
  player: PlayerState,
  baseDamage: number,
  state: HogwartsGameState,
  source?: string,
): number {
  let damage = baseDamage;
  // FAQ: Invisibility Cloak only reduces damage from Dark Arts events and Villains.
  const cloakApplies = source === 'dark_arts' || source === 'villain';
  if (!cloakApplies) return damage;
  for (const instanceId of player.hand) {
    const ci = getCardInstance(state, instanceId);
    if (!ci) continue;
    const passive = getCard(ci.cardId)?.passive_effect;
    if (passive?.type === 'reduce_damage_in_hand') {
      const maxDamage = Number(passive.params?.max_damage ?? 1);
      damage = Math.min(damage, maxDamage);
    }
  }
  return damage;
}

function playedCardTypeCount(player: PlayerState, cardType: string): number {
  switch (cardType) {
    case 'spell':
      return player.spellsPlayedThisTurn;
    case 'item':
      return player.itemsPlayedThisTurn;
    case 'ally':
      return player.alliesPlayedThisTurn;
    default:
      return 0;
  }
}

function playedCardTypeThisTurn(player: PlayerState, cardType: string): boolean {
  return playedCardTypeCount(player, cardType) > 0;
}

function hasCardInPlay(player: PlayerState, cardId: string, state: HogwartsGameState): boolean {
  return player.playArea.some((id) => getCardInstance(state, id)?.cardId === cardId);
}

function villainInPlay(villainId: string, state: HogwartsGameState): boolean {
  return state.activeVillains.some((v) => v.isActive && v.villainId === villainId);
}

function otherPlayerHasCardInHand(
  cardId: string,
  state: HogwartsGameState,
  context: EffectContext,
): boolean {
  const source = context.sourcePlayerId ?? state.currentPlayerId;
  return Object.entries(state.players).some(
    ([id, p]) =>
      id !== source && p.hand.some((hid) => getCardInstance(state, hid)?.cardId === cardId),
  );
}

function otherPlayerHasKeywordInPlay(
  keyword: string,
  state: HogwartsGameState,
  context: EffectContext,
): boolean {
  const source = context.sourcePlayerId ?? state.currentPlayerId;
  for (const [id, player] of Object.entries(state.players)) {
    if (id === source) continue;
    for (const instanceId of player.playArea) {
      const ci = getCardInstance(state, instanceId);
      if (!ci) continue;
      const card = getCard(ci.cardId);
      if (card?.keywords?.includes(keyword)) return true;
    }
  }
  return false;
}

function countHandCardsByCost(
  player: PlayerState,
  state: HogwartsGameState,
  predicate: (cost: number) => boolean,
): number {
  return player.hand.reduce((count, instanceId) => {
    const ci = getCardInstance(state, instanceId);
    if (!ci) return count;
    const cost = getCard(ci.cardId)?.cost ?? 0;
    return predicate(cost) ? count + 1 : count;
  }, 0);
}

function countCardsOfTypeInHand(
  player: PlayerState,
  state: HogwartsGameState,
  cardType: string,
): number {
  return player.hand.reduce((count, instanceId) => {
    const ci = getCardInstance(state, instanceId);
    if (!ci) return count;
    return getCard(ci.cardId)?.type === cardType ? count + 1 : count;
  }, 0);
}

function countEvenCostCardsInHand(player: PlayerState, state: HogwartsGameState): number {
  return countHandCardsByCost(player, state, (cost) => cost > 0 && cost % 2 === 0);
}

function applyPerCardTypePenalties(
  player: PlayerState,
  cardType: string,
  options: { effect: EffectData }[],
  context: EffectContext,
  state: HogwartsGameState,
): void {
  const count = countCardsOfTypeInHand(player, state, cardType);
  if (count === 0 || options.length === 0) return;
  const chosen = options[0]!.effect;
  for (let i = 0; i < count; i += 1) {
    resolveEffect(chosen, context, state);
  }
}

function discardTopDeckIfCostGte(
  state: HogwartsGameState,
  params: Record<string, unknown>,
  context: EffectContext,
): void {
  const player = getCurrentPlayer(state);
  if (!player || player.deck.length === 0) return;
  const topId = player.deck.shift()!;
  // FAQ: discarding the top card of your deck counts as discarding a card.
  moveCardToDiscard(state, player, state.currentPlayerId, topId);
  const ci = getCardInstance(state, topId);
  const minCost = Number(params.min_cost ?? 1);
  const controlAdded = Number(params.control_added ?? 0);
  const cost = getCard(ci?.cardId ?? '')?.cost ?? 0;
  if (cost >= minCost && controlAdded > 0) {
    addLocationControl(state, controlAdded);
  }
  void context;
}

function countDetentionInHand(player: PlayerState, state: HogwartsGameState): number {
  return player.hand.reduce((count, instanceId) => {
    const ci = getCardInstance(state, instanceId);
    if (!ci) return count;
    return getCard(ci.cardId)?.id === 'detention' ? count + 1 : count;
  }, 0);
}

function countActiveCreatures(state: HogwartsGameState): number {
  return state.activeVillains.filter((v) => {
    if (!v.isActive) return false;
    return getVillain(v.villainId)?.type === 'creature';
  }).length;
}

function evaluateCondition(
  condition: Record<string, unknown>,
  state: HogwartsGameState,
  context: EffectContext,
  player?: PlayerState | null,
): boolean {
  const type = String(condition.type ?? '');
  const active = player ?? getCurrentPlayer(state);
  if (!active) return false;

  switch (type) {
    case 'villain_killed_this_turn':
      return active.villainsKilledThisTurn > 0;
    case 'ally_played_this_turn': {
      // FAQ: a card with this condition does not count itself (e.g. Fleur).
      let count = active.alliesPlayedThisTurn;
      const sourceId = context.sourceCardInstanceId;
      if (sourceId) {
        const ci = getCardInstance(state, sourceId);
        if (ci && getCard(ci.cardId)?.type === 'ally') count -= 1;
      }
      return count > 0;
    }
    case 'all_villains_hit_this_turn': {
      const activeVillains = state.activeVillains.filter((v) => v.isActive);
      if (activeVillains.length === 0) return false;
      return activeVillains.every((v) => (active.villainsAttackedThisTurn[v.villainId] ?? 0) > 0);
    }
    case 'card_type_played_this_turn':
      return playedCardTypeThisTurn(active, String(condition.card_type ?? ''));
    case 'card_in_play':
      return hasCardInPlay(active, String(condition.card_id ?? ''), state);
    case 'at_max_health':
      return active.health >= active.maxHealth;
    case 'villain_in_play':
      return villainInPlay(String(condition.villain_id ?? ''), state);
    case 'card_in_other_player_hand':
      return otherPlayerHasCardInHand(String(condition.card_id ?? ''), state, context);
    case 'other_player_has_keyword_in_play':
      return otherPlayerHasKeywordInPlay(String(condition.keyword ?? ''), state, context);
    case 'active_player_stunned': {
      const current = getPlayer(state, state.currentPlayerId);
      return current?.isStunned === true;
    }
    case 'always':
      return true;
    default:
      return false;
  }
}

function resolveForEachPlayer(
  state: HogwartsGameState,
  context: EffectContext,
  fn: (playerId: string, playerContext: EffectContext) => void,
): void {
  for (const playerId of Object.keys(state.players)) {
    fn(playerId, { ...context, sourcePlayerId: playerId });
  }
}

const MAX_DARK_ARTS_CHAIN_DEPTH = 20;
let darkArtsChainDepth = 0;

function resolveExtraDarkArts(
  state: HogwartsGameState,
  count: number,
  context: EffectContext,
): void {
  for (let i = 0; i < count; i += 1) {
    if (darkArtsChainDepth >= MAX_DARK_ARTS_CHAIN_DEPTH) {
      console.warn(
        `resolveExtraDarkArts: chain depth limit (${MAX_DARK_ARTS_CHAIN_DEPTH}) reached, stopping to prevent infinite loop`,
      );
      break;
    }
    const eventId = drawDarkArtsEvent(state);
    if (!eventId) break;
    const darkArt = getDarkArt(eventId);
    darkArtsChainDepth += 1;
    resolveEffects(
      darkArt?.effects ?? [],
      { ...context, source: 'dark_arts', autoResolve: true },
      state,
    );
    darkArtsChainDepth -= 1;
  }
}

function rollHouseDiceEffect(
  house: string | undefined,
  context: EffectContext,
  state: HogwartsGameState,
): void {
  const diceId = house && getHouseDice(house) ? house : getHouseDiceIds()[0];
  if (!diceId) return;
  const dice = getHouseDice(diceId);
  const faces = dice?.faces ?? [];
  if (faces.length === 0) return;
  const face = faces[rngNextInt(faces.length)]!;
  // FAQ: the roll happens first, then the player decides whether to assign the
  // symbol to the active Horcrux or take the effect.
  const symbol = houseDiceEffectToSymbol(face.effect);
  if (symbol && state.horcruxState?.activeHorcruxId && !context.autoResolve) {
    if (!state.pendingChoice) {
      const faceDescription = (face as { description?: string }).description;
      state.pendingChoice = {
        choiceId: nextChoiceId(),
        options: [
          {
            label: `Assign ${symbol} to Horcrux`,
            effect: { type: 'assign_house_dice_symbol', params: { symbol } },
          },
          {
            label: faceDescription ? `Take: ${faceDescription}` : 'Take effect',
            effect: face.effect,
          },
        ],
        context,
      };
    }
    return;
  }
  resolveEffect(face.effect, context, state);
}

function searchDiscardForType(
  player: PlayerState,
  playerId: string,
  cardType: string,
  state: HogwartsGameState,
): void {
  for (let i = 0; i < player.discard.length; i += 1) {
    const cardInstanceId = player.discard[i]!;
    const ci = getCardInstance(state, cardInstanceId);
    if (!ci) continue;
    if (getCard(ci.cardId)?.type !== cardType) continue;
    player.discard.splice(i, 1);
    player.hand.push(cardInstanceId);
    ci.zone = 'hand';
    ci.ownerPlayer = playerId;
    break;
  }
}

function searchDeck(
  player: PlayerState,
  playerId: string,
  maxCost: number,
  state: HogwartsGameState,
): void {
  // FAQ: searching with an empty deck shuffles the discard into a new deck.
  if (player.deck.length === 0 && player.discard.length > 0) {
    player.deck = [...player.discard];
    player.discard = [];
    shuffleArray(player.deck);
  }
  for (let i = 0; i < player.deck.length; i += 1) {
    const cardInstanceId = player.deck[i]!;
    const ci = getCardInstance(state, cardInstanceId);
    if (!ci) continue;
    const cost = getCard(ci.cardId)?.cost ?? 999;
    if (cost > maxCost) continue;
    player.deck.splice(i, 1);
    player.hand.push(cardInstanceId);
    ci.zone = 'hand';
    ci.ownerPlayer = playerId;
    break;
  }
}

function gainCardToHand(state: HogwartsGameState, cardId: string, playerId: string): void {
  const player = getPlayer(state, playerId);
  if (!player || !getCard(cardId)) return;
  const instanceId = `generated_${cardId}_${state.nextInstanceCounter}`;
  state.nextInstanceCounter += 1;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    ownerPlayer: playerId,
    zone: 'hand',
  };
  player.hand.push(instanceId);
}

function revealAndPenalty(
  state: HogwartsGameState,
  context: EffectContext,
  params: Record<string, unknown>,
  match: (cardId: string) => boolean,
): void {
  const targetSpec = String(params.target ?? 'all_players');
  const penalty = params.penalty as EffectData | undefined;
  const revealed = { ...context.revealedCards };
  for (const playerId of getTargetPlayerIds(targetSpec, state, context)) {
    const player = getPlayer(state, playerId);
    if (!player || player.deck.length === 0) continue;
    const topId = player.deck[0]!;
    const ci = getCardInstance(state, topId);
    if (!ci) continue;
    if (!match(ci.cardId)) continue;
    revealed[playerId] = topId;
    if (penalty) {
      resolveEffect(
        penalty,
        { ...context, sourcePlayerId: playerId, revealedCards: revealed },
        state,
      );
    }
  }
  context.revealedCards = revealed;
}

export function effectRequiresPlayerChoice(effect: EffectData): boolean {
  if (
    effect.type === 'choose_one' ||
    effect.type === 'choose_n' ||
    effect.type === 'select_players_exclusive' ||
    effect.type === 'copy_ally_effect_from_play' ||
    effect.type === 'choose_players_gain_attack' ||
    effect.type === 'roll_house_dice' ||
    effect.type === 'choose_house_dice'
  ) {
    return true;
  }
  const target = String(effect.params?.target ?? '');
  if (target === 'choose' || target === 'choose_other_player') return true;
  if (
    (effect.type === 'discard_cards' || effect.type === 'discard_card_type') &&
    effect.params?.chooser
  ) {
    return true;
  }
  if (effect.type === 'multi_effect') {
    const effects = (effect.params?.effects as EffectData[] | undefined) ?? [];
    return effects.some(effectRequiresPlayerChoice);
  }
  if (effect.type === 'conditional') {
    return Boolean(
      (effect.then && effectRequiresPlayerChoice(effect.then)) ||
        (effect.else && effectRequiresPlayerChoice(effect.else)),
    );
  }
  return false;
}

let choiceCounter = 0;
function nextChoiceId(): string {
  choiceCounter += 1;
  return `choice_${choiceCounter}`;
}

/** Build a pending choice prompting the active player to pick one player. */
export function buildPlayerPickChoice(
  state: HogwartsGameState,
  context: EffectContext,
  continuation: PendingChoiceContinuation,
): import('./types').PendingChoice {
  const remaining = state.turnOrder.filter((id) => !continuation.pickedSoFar.includes(id));
  const options: ChoiceOption[] = remaining.map((id) => ({
    label: state.players[id]?.name ?? id,
    effect: { type: 'none' },
    contextOverrides: { selectedPlayerIds: [id] },
  }));
  return { choiceId: nextChoiceId(), options, context, continuation };
}

/**
 * FAQ: effects that let the player choose a target (Chocolate Frog etc.) prompt
 * for a player instead of silently defaulting. Returns true if the effect was
 * deferred into a pending choice.
 */
function maybePromptForPlayerTarget(
  effect: EffectData,
  context: EffectContext,
  state: HogwartsGameState,
): boolean {
  const target = String(effect.params?.target ?? '');
  if (target !== 'choose' && target !== 'choose_other_player') return false;
  if (context.autoResolve || state.pendingChoice) return false;
  const source = context.sourcePlayerId ?? state.currentPlayerId;
  const eligible = Object.keys(state.players).filter((id) => target === 'choose' || id !== source);
  if (eligible.length <= 1) return false;
  state.pendingChoice = {
    choiceId: nextChoiceId(),
    options: eligible.map((id) => ({
      label: state.players[id]?.name ?? id,
      effect: { ...effect, params: { ...effect.params, target: 'selected' } },
      contextOverrides: { selectedPlayerIds: [id] },
    })),
    context,
  };
  return true;
}

/** FAQ: a penalty option that cannot be paid falls back to the next option. */
function canPayOption(player: PlayerState, effect: EffectData, state: HogwartsGameState): boolean {
  if (effect.type === 'discard_card_type') {
    const cardType = String(effect.params?.card_type ?? '');
    return countCardsOfTypeInHand(player, state, cardType) > 0;
  }
  if (effect.type === 'discard_cards') {
    return player.hand.length >= Number(effect.params?.amount ?? 1);
  }
  return true;
}

export function resolveEffect(
  effect: EffectData,
  context: EffectContext,
  state: HogwartsGameState,
): void {
  if (!effect?.type) return;

  if (effect.type === 'multi_effect') {
    const effects = (effect.params?.effects as EffectData[]) ?? [];
    for (const sub of effects) resolveEffect(sub, context, state);
    return;
  }

  if (maybePromptForPlayerTarget(effect, context, state)) return;

  const params = effect.params ?? {};

  switch (effect.type) {
    case 'gain_attack': {
      const amount = Number(params.amount ?? 0);
      const targets = getTargetPlayerIds(String(params.target ?? 'self'), state, context);
      for (const id of targets) {
        const p = getPlayer(state, id);
        if (p) p.attackTokens += amount;
      }
      break;
    }
    case 'gain_influence': {
      const amount = Number(params.amount ?? 0);
      const targets = getTargetPlayerIds(String(params.target ?? 'self'), state, context);
      for (const id of targets) {
        const p = getPlayer(state, id);
        if (p) p.moneyTokens += amount;
      }
      break;
    }
    case 'draw_cards': {
      const amount = Number(params.amount ?? 0);
      const targets = getTargetPlayerIds(String(params.target ?? 'self'), state, context);
      for (const id of targets) {
        for (let i = 0; i < amount; i += 1) drawCardForPlayer(state, id);
      }
      break;
    }
    case 'heal': {
      if (isHorcruxHealingBlocked(state) || hasActiveVillainOngoing(state, 'prevent_all_healing'))
        break;
      const amount = Number(params.amount ?? 0);
      const targets = getTargetPlayerIds(String(params.target ?? 'self'), state, context);
      for (const id of targets) {
        const p = getPlayer(state, id);
        if (p && !p.isStunned) {
          const before = p.health;
          p.health = Math.min(p.maxHealth, p.health + amount);
          const healed = p.health - before;
          if (healed > 0) {
            onHeroHeal(state, id, healed);
            recordPlayerHeal(state, id, healed);
          }
        }
      }
      break;
    }
    case 'deal_damage': {
      let amount = Number(params.amount ?? 0);
      if (params.per_control_removed) amount *= Number(context.controlRemoved ?? 0);
      const targets = getTargetPlayerIds(String(params.target ?? 'active_player'), state, context);
      for (const id of targets) {
        const p = getPlayer(state, id);
        if (!p || p.isStunned) continue;
        const before = p.health;
        const dmg = calculateDamage(p, amount, state, context.source);
        p.health = Math.max(0, p.health - dmg);
        recordDamageDealt(state, before - p.health);
        if (p.health <= 0) stunPlayer(state, id);
      }
      break;
    }
    case 'add_location_control':
      addLocationControl(state, Number(params.amount ?? 0));
      break;
    case 'remove_location_control':
      removeLocationControl(state, Number(params.amount ?? 0));
      break;
    case 'discard_cards':
    case 'discard_card_type': {
      const amount = Number(params.amount ?? 0);
      const cardType = String(params.card_type ?? '');
      const chooser = String(params.chooser ?? '');
      const targets = getTargetPlayerIds(String(params.target ?? 'active_player'), state, context);

      // FAQ: when a player chooses which card to discard, offer a real choice.
      if (chooser && !context.autoResolve && !state.pendingChoice && targets.length === 1) {
        const targetId = targets[0]!;
        const target = getPlayer(state, targetId);
        const eligible = (target?.hand ?? []).filter((instanceId) => {
          if (!cardType) return true;
          const ci = getCardInstance(state, instanceId);
          return getCard(ci?.cardId ?? '')?.type === cardType;
        });
        if (eligible.length > 1) {
          state.pendingChoice = {
            choiceId: nextChoiceId(),
            options: eligible.map((instanceId) => {
              const ci = getCardInstance(state, instanceId);
              return {
                label: getCard(ci?.cardId ?? '')?.name ?? instanceId,
                effect: {
                  type: 'discard_specific_card',
                  params: { instance_id: instanceId, target_player: targetId },
                },
              };
            }),
            context,
          };
          break;
        }
      }

      // FAQ: when several players discard at once, all discards happen before
      // any on-discard effects resolve.
      const collected: { playerId: string; instanceId: string }[] = [];
      for (const id of targets) {
        const p = getPlayer(state, id);
        if (!p) continue;
        if (cardType) {
          discardCardTypeFromHand(p, cardType, state, id, context, collected);
        } else {
          discardCardsFromHand(p, amount, state, id, context, collected);
        }
      }
      for (const d of collected) fireDiscardEffects(state, d.instanceId, d.playerId);
      break;
    }
    case 'discard_specific_card': {
      const instanceId = String(params.instance_id ?? '');
      const targetId = String(
        params.target_player ?? context.sourcePlayerId ?? state.currentPlayerId,
      );
      discardFromHand(state, targetId, instanceId);
      break;
    }
    case 'choose_one': {
      const options = (params.options as { label: string; effect: EffectData }[]) ?? [];
      if (options.length === 0) return;
      if (context.autoResolve) {
        resolveEffect(options[0]!.effect, context, state);
      } else if (!state.pendingChoice) {
        state.pendingChoice = {
          choiceId: `choice_${Date.now()}`,
          options,
          context,
        };
      } else {
        console.warn(
          'choose_one: a pending choice already exists; the new choice is dropped to prevent overwrite.',
          { existingChoiceId: state.pendingChoice.choiceId },
        );
      }
      break;
    }
    case 'choose_one_all_players': {
      const options = (params.options as { label: string; effect: EffectData }[]) ?? [];
      if (options.length === 0) return;
      resolveForEachPlayer(state, context, (playerId) => {
        const player = getPlayer(state, playerId);
        let chosen = options[0]!.effect;
        if (player && options.length > 1 && !canPayOption(player, chosen, state)) {
          chosen = options[1]!.effect;
        }
        resolveEffect(chosen, { ...context, sourcePlayerId: playerId, autoResolve: true }, state);
      });
      break;
    }
    case 'choose_n': {
      const n = Number(params.n ?? 1);
      const options = (params.options as { label: string; effect: EffectData }[]) ?? [];
      if (!context.autoResolve && !state.pendingChoice && options.length > n) {
        state.pendingChoice = {
          choiceId: nextChoiceId(),
          options,
          context,
          continuation: { type: 'choose_n', remainingPicks: n, pickedSoFar: [] },
        };
        break;
      }
      for (let i = 0; i < Math.min(n, options.length); i += 1) {
        resolveEffect(options[i]!.effect, context, state);
      }
      break;
    }
    case 'conditional': {
      const condition = effect.condition ?? {};
      const branch = evaluateCondition(condition, state, context) ? effect.then : effect.else;
      if (branch) resolveEffect(branch, context, state);
      break;
    }
    case 'conditional_per_player': {
      const condition = effect.condition ?? {};
      const branch = effect.then;
      if (!branch) break;
      for (const [playerId, player] of Object.entries(state.players)) {
        if (!evaluateCondition(condition, state, context, player)) continue;
        resolveEffect(branch, { ...context, sourcePlayerId: playerId, autoResolve: true }, state);
      }
      break;
    }
    case 'gain_attack_per_card_type_played': {
      const player = getCurrentPlayer(state);
      if (!player) break;
      const cardType = String(params.card_type ?? 'ally');
      const amount = Number(params.amount ?? 1);
      player.attackTokens += playedCardTypeCount(player, cardType) * amount;
      break;
    }
    case 'gain_per_card_type_played': {
      const player = getCurrentPlayer(state);
      if (!player) break;
      const cardType = String(params.card_type ?? 'spell');
      const count = playedCardTypeCount(player, cardType);
      player.attackTokens += count * Number(params.attack_per ?? 0);
      if (!state.healingPreventedThisTurn) {
        player.health = Math.min(
          player.maxHealth,
          player.health + count * Number(params.health_per ?? 0),
        );
      }
      break;
    }
    case 'heal_villains': {
      const amount = Number(params.amount ?? 0);
      for (const villain of state.activeVillains) {
        if (!villain.isActive) continue;
        villain.currentHp = Math.min(villain.maxHp, villain.currentHp + amount);
      }
      break;
    }
    case 'prevent_healing_this_turn':
      state.healingPreventedThisTurn = true;
      if (context.source === 'horcrux_ongoing') state.horcruxHealingBlockedThisTurn = true;
      break;
    case 'block_villain_effects':
      state.blockVillainEffectsThisTurn = true;
      break;
    case 'block_creature_effects':
      state.blockCreatureEffectsThisTurn = true;
      break;
    case 'reveal_extra_dark_arts':
      resolveExtraDarkArts(state, Number(params.count ?? 1), context);
      break;
    case 'peek_dark_arts': {
      const count = Number(params.count ?? 1);
      const peeked: string[] = [];
      for (let i = 0; i < count && i < state.darkArtsDeck.length; i += 1) {
        peeked.push(state.darkArtsDeck[i]!);
      }
      context.peekedDarkArts = peeked;
      break;
    }
    case 'roll_house_dice': {
      const count = Number(params.count ?? 1);
      const house = String(params.house ?? '');
      for (let i = 0; i < count; i += 1) rollHouseDiceEffect(house || undefined, context, state);
      break;
    }
    case 'choose_house_dice': {
      const diceIds = getHouseDiceIds();
      if (!context.autoResolve && !state.pendingChoice && diceIds.length > 1) {
        state.pendingChoice = {
          choiceId: nextChoiceId(),
          options: diceIds.map((diceId) => ({
            label: getHouseDice(diceId)?.name ?? diceId,
            effect: { type: 'roll_house_dice', params: { house: diceId } },
          })),
          context,
        };
        break;
      }
      rollHouseDiceEffect(diceIds[0], context, state);
      break;
    }
    case 'assign_house_dice_symbol': {
      const symbol = params.symbol as HorcruxSymbol | undefined;
      const playerId = context.sourcePlayerId ?? state.currentPlayerId;
      if (symbol && playerId) assignHouseDiceSymbolToHorcrux(state, playerId, symbol);
      break;
    }
    case 'roll_outcome_table': {
      const roll = rngNextInt(8);
      const outcomes =
        (params.outcomes as { min: number; max: number; effect: EffectData }[]) ?? [];
      const match = outcomes.find((o) => roll >= o.min && roll <= o.max);
      if (match) resolveEffect(match.effect, context, state);
      break;
    }
    case 'reveal_and_penalty_if_cost':
      revealAndPenalty(
        state,
        context,
        params,
        (cardId) => (getCard(cardId)?.cost ?? 0) >= Number(params.min_cost ?? 1),
      );
      break;
    case 'reveal_and_penalty_if_type':
      revealAndPenalty(
        state,
        context,
        params,
        (cardId) => getCard(cardId)?.type === String(params.card_type ?? ''),
      );
      break;
    case 'discard_revealed_card': {
      const playerId = context.sourcePlayerId ?? state.currentPlayerId;
      const player = getPlayer(state, playerId);
      const revealedId = context.revealedCards?.[playerId];
      if (!player || !revealedId) break;
      const idx = player.deck.indexOf(revealedId);
      if (idx === -1) break;
      player.deck.splice(idx, 1);
      moveCardToDiscard(state, player, playerId, revealedId);
      break;
    }
    case 'deal_damage_per_card_cost': {
      const amount = Number(params.amount ?? 1);
      const minCost = Number(params.min_cost ?? 0);
      const targets = getTargetPlayerIds(String(params.target ?? 'active_player'), state, context);
      for (const id of targets) {
        const p = getPlayer(state, id);
        if (!p || p.isStunned) continue;
        const hits = countHandCardsByCost(p, state, (cost) => cost >= minCost);
        const dmg = calculateDamage(p, amount * hits, state, context.source);
        p.health = Math.max(0, p.health - dmg);
        if (p.health <= 0) stunPlayer(state, id);
      }
      break;
    }
    case 'deal_damage_per_card_cost_exact': {
      const amount = Number(params.amount ?? 1);
      const exactCost = Number(params.exact_cost ?? 0);
      const targets = getTargetPlayerIds(String(params.target ?? 'all_players'), state, context);
      for (const id of targets) {
        const p = getPlayer(state, id);
        if (!p || p.isStunned) continue;
        const hits = countHandCardsByCost(p, state, (cost) => cost === exactCost);
        const dmg = calculateDamage(p, amount * hits, state, context.source);
        p.health = Math.max(0, p.health - dmg);
        if (p.health <= 0) stunPlayer(state, id);
      }
      break;
    }
    case 'deal_damage_per_active_creature': {
      const amount = Number(params.amount ?? 1);
      const creatures = countActiveCreatures(state);
      const targets = getTargetPlayerIds(String(params.target ?? 'all_players'), state, context);
      for (const id of targets) {
        const p = getPlayer(state, id);
        if (!p || p.isStunned) continue;
        const dmg = calculateDamage(p, amount * creatures, state, context.source);
        p.health = Math.max(0, p.health - dmg);
        if (p.health <= 0) stunPlayer(state, id);
      }
      break;
    }
    case 'deal_damage_per_detention_in_hand': {
      const amount = Number(params.amount ?? 1);
      const targets = getTargetPlayerIds(String(params.target ?? 'all_players'), state, context);
      for (const id of targets) {
        const p = getPlayer(state, id);
        if (!p || p.isStunned) continue;
        const hits = countDetentionInHand(p, state);
        const dmg = calculateDamage(p, amount * hits, state, context.source);
        p.health = Math.max(0, p.health - dmg);
        if (p.health <= 0) stunPlayer(state, id);
      }
      break;
    }
    case 'gain_card_to_hand': {
      const cardId = String(params.card_id ?? '');
      const targets = getTargetPlayerIds(String(params.target ?? 'active_player'), state, context);
      for (const id of targets) gainCardToHand(state, cardId, id);
      break;
    }
    case 'search_discard_for_type': {
      const cardType = String(params.card_type ?? '');
      const targets = getTargetPlayerIds(String(params.target ?? 'self'), state, context);
      for (const id of targets) {
        const p = getPlayer(state, id);
        if (p) searchDiscardForType(p, id, cardType, state);
      }
      break;
    }
    case 'search_deck': {
      const maxCost = Number(params.max_cost ?? 999);
      const targets = getTargetPlayerIds(String(params.target ?? 'self'), state, context);
      for (const id of targets) {
        const p = getPlayer(state, id);
        if (p) searchDeck(p, id, maxCost, state);
      }
      break;
    }
    case 'peek_and_replace_or_discard': {
      const playerId = context.sourcePlayerId ?? state.currentPlayerId;
      const player = getPlayer(state, playerId);
      if (!player || player.deck.length === 0) break;
      const topId = player.deck.shift()!;
      player.hand.push(topId);
      const ci = getCardInstance(state, topId);
      if (ci) {
        ci.zone = 'hand';
        ci.ownerPlayer = playerId;
      }
      break;
    }
    case 'select_players_exclusive': {
      const playerCount = Number(params.player_count ?? 1);
      const subEffects = (params.effects as EffectData[]) ?? [];
      if (
        !context.autoResolve &&
        !state.pendingChoice &&
        playerCount > 0 &&
        state.turnOrder.length > playerCount
      ) {
        state.pendingChoice = buildPlayerPickChoice(state, context, {
          type: 'select_players_exclusive',
          remainingPicks: playerCount,
          pickedSoFar: [],
          effects: subEffects,
        });
        break;
      }
      const selected = state.turnOrder.slice(0, playerCount);
      const selectedContext = { ...context, selectedPlayerIds: selected, autoResolve: true };
      for (const sub of subEffects) resolveEffect(sub, selectedContext, state);
      break;
    }
    case 'choose_players_gain_attack': {
      const playerCount = Number(params.player_count ?? 1);
      const amount = Number(params.amount ?? 1);
      if (
        !context.autoResolve &&
        !state.pendingChoice &&
        playerCount > 0 &&
        state.turnOrder.length > playerCount
      ) {
        state.pendingChoice = buildPlayerPickChoice(state, context, {
          type: 'select_players_exclusive',
          remainingPicks: playerCount,
          pickedSoFar: [],
          effects: [
            {
              type: 'gain_attack',
              params: { amount, target: 'selected' },
            },
          ],
        });
        break;
      }
      const ids = state.turnOrder.slice(0, playerCount);
      for (const id of ids) {
        const p = getPlayer(state, id);
        if (p) p.attackTokens += amount;
      }
      break;
    }
    case 'optional_banish_for_effect': {
      const inner = params.effect as EffectData | undefined;
      if (inner) resolveEffect(inner, context, state);
      break;
    }
    case 'banish_card_from_hand': {
      const playerId = context.sourcePlayerId ?? state.currentPlayerId;
      const player = getPlayer(state, playerId);
      if (player) banishFromHand(player, state);
      break;
    }
    case 'discard_with_bonus_if_type': {
      const player = getCurrentPlayer(state);
      if (!player) break;
      const amount = Number(params.amount ?? 1);
      const bonusType = String(params.bonus_card_type ?? '');
      let matched = false;
      for (let i = 0; i < amount && player.hand.length > 0; i += 1) {
        const cardInstanceId = player.hand[player.hand.length - 1]!;
        const ci = getCardInstance(state, cardInstanceId);
        if (ci && getCard(ci.cardId)?.type === bonusType) matched = true;
        discardCardsFromHand(player, 1, state, state.currentPlayerId);
      }
      if (matched) {
        const bonus = params.bonus as EffectData | undefined;
        if (bonus) resolveEffect(bonus, context, state);
      }
      break;
    }
    case 'copy_ally_effect_from_play': {
      const player = getCurrentPlayer(state);
      if (!player) break;
      const allies = player.playArea.filter((instanceId) => {
        const ci = getCardInstance(state, instanceId);
        return getCard(ci?.cardId ?? '')?.type === 'ally';
      });
      if (allies.length === 0) break;
      if (!context.autoResolve && !state.pendingChoice && allies.length > 1) {
        state.pendingChoice = {
          choiceId: nextChoiceId(),
          options: allies.map((instanceId) => {
            const ci = getCardInstance(state, instanceId);
            const card = getCard(ci?.cardId ?? '');
            return {
              label: card?.name ?? instanceId,
              effect: {
                type: 'multi_effect',
                params: { effects: card?.effects ?? [] },
              },
            };
          }),
          context,
        };
        break;
      }
      const first = getCardInstance(state, allies[0]!);
      resolveEffects(getCard(first?.cardId ?? '')?.effects ?? [], context, state);
      break;
    }
    case 'discard_top_deck_if_cost_gte':
      discardTopDeckIfCostGte(state, params, context);
      break;
    case 'per_ally_choose_penalty': {
      const player = getCurrentPlayer(state);
      if (!player) break;
      const options = (params.options as { effect: EffectData }[]) ?? [];
      applyPerCardTypePenalties(player, 'ally', options, context, state);
      break;
    }
    case 'per_item_choose_penalty': {
      const player = getCurrentPlayer(state);
      if (!player) break;
      const options = (params.options as { effect: EffectData }[]) ?? [];
      applyPerCardTypePenalties(player, 'item', options, context, state);
      break;
    }
    case 'damage_per_even_cost_card': {
      const player = getCurrentPlayer(state);
      if (!player || player.isStunned) break;
      const hits = countEvenCostCardsInHand(player, state);
      const amount = Number(params.amount ?? 1);
      const dmg = calculateDamage(player, amount * hits, state, context.source);
      player.health = Math.max(0, player.health - dmg);
      if (player.health <= 0) stunPlayer(state, state.currentPlayerId);
      break;
    }
    case 'damage_per_detention_in_hand':
      resolveEffect(
        {
          type: 'deal_damage_per_detention_in_hand',
          params: { ...params, target: params.target ?? 'active_player' },
        },
        context,
        state,
      );
      break;
    case 'choose_one_per_player': {
      const options = (params.options as { label: string; effect: EffectData }[]) ?? [];
      if (options.length === 0) break;
      for (const playerId of Object.keys(state.players)) {
        resolveEffect(
          options[0]!.effect,
          { ...context, sourcePlayerId: playerId, autoResolve: true },
          state,
        );
      }
      break;
    }
    case 'banish_card': {
      const cardType = String(params.card_type ?? '');
      const targets = getTargetPlayerIds(String(params.target ?? 'self'), state, context);
      for (const id of targets) {
        const p = getPlayer(state, id);
        if (p) banishFromHand(p, state, cardType || undefined);
      }
      break;
    }
    case 'banish_card_all':
      for (const playerId of Object.keys(state.players)) {
        const p = getPlayer(state, playerId);
        if (p) banishFromHand(p, state);
      }
      break;
    case 'none':
      break;
    case 'roll_creature_die':
      rollCreatureDie(state, context);
      break;
    case 'gain_patronus_charge': {
      const amount = Number(params.amount ?? 1);
      const targets = getTargetPlayerIds(String(params.target ?? 'self'), state, context);
      for (const id of targets) {
        const p = getPlayer(state, id);
        if (p) p.patronusCharges += amount;
      }
      break;
    }
    case 'patronus_protect': {
      // Bug 3 fix: Implement patronus protect - shield a hero from the next stun
      const targetSpec = String(params.target ?? 'other_players');
      const targets = getTargetPlayerIds(targetSpec, state, context);
      for (const id of targets) {
        const p = getPlayer(state, id);
        if (p) p.patronusShield = true;
      }
      break;
    }
    case 'encounter_limit_hand_draw':
    case 'encounter_on_control_added':
    case 'encounter_on_creature_defeated':
    case 'encounter_on_villain_defeated':
    case 'encounter_on_card_played':
    case 'encounter_on_dice_rolled':
      break;
    case 'prevent_extra_draw':
    case 'prevent_all_healing':
    case 'prevent_location_removal':
    case 'deal_damage_on_location_control_added':
    case 'deal_damage_on_discard':
    case 'deal_damage_on_card_cost':
    case 'heal_villains_on_location_removed':
    case 'damage_all_on_new_villain':
      break;
    default:
      break;
  }
}

export function resolveEffects(
  effects: EffectData[],
  context: EffectContext,
  state: HogwartsGameState,
): void {
  for (const effect of effects) resolveEffect(effect, context, state);
}

registerLocationControlHooks({
  onAdded: (state) => {
    onHorcruxLocationControlAdded(state);
    fireVillainTrigger(state, 'deal_damage_on_location_control_added', {
      sourcePlayerId: state.currentPlayerId,
      source: 'villain',
    });
    onEncounterControlAdded(state);
  },
  onRemoved: (state, removed) => {
    fireVillainTrigger(state, 'heal_villains_on_location_removed', {
      sourcePlayerId: state.currentPlayerId,
      source: 'villain',
    });
    onLocationControlRemoved(state, removed);
    onHorcruxLocationControlRemoved(state);
    onEncounterControlRemoved(state, removed);
    for (const villain of state.activeVillains) {
      if (!villain.isActive || isVillainEffectBlocked(state, villain.villainId)) continue;
      const onControlRemoved = getVillain(villain.villainId)?.on_control_removed;
      if (!onControlRemoved?.length) continue;
      resolveEffects(
        onControlRemoved,
        {
          sourcePlayerId: state.currentPlayerId,
          source: 'villain',
          villainId: villain.villainId,
          autoResolve: true,
          controlRemoved: removed,
        },
        state,
      );
    }
  },
});

registerHeroCardDrawnHook(onHeroCardDrawn);
