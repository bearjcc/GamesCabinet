import horcruxData from '../data/horcrux/horcrux.json';
import { getHorcrux, getVillain } from './dataManager';
import { discardFromHand, resolveEffects } from './effectResolver';
import type {
  EffectContext,
  EffectData,
  HogwartsGameState,
  HorcruxDefinition,
  HorcruxSymbol,
  PlayerState,
} from './types';

export const HORCRUX_SUPPORTED_EFFECT_TYPES = new Set([
  'deal_damage',
  'gain_attack',
  'gain_influence',
  'heal',
  'prevent_healing_this_turn',
  'remove_location_control',
]);

export const HORCRUX_SUPPORTED_ONGOING_TRIGGERS = new Set([
  'on_ally_played',
  'on_attack_assigned_gte',
  'on_card_acquired_cost_gte',
  'on_location_control_added',
  'on_spell_played',
  'on_turn_start',
]);

export const HORCRUX_SUPPORTED_REWARD_TRIGGERS = new Set([
  'immediate',
  'manual',
  'on_allies_played_threshold',
  'on_location_control_removed',
  'on_self_card_acquired',
  'on_spell_played',
]);

const horcruxDatabase = horcruxData as Record<string, HorcruxDefinition>;

const EFFECT_TO_SYMBOL: Record<string, HorcruxSymbol> = {
  gain_influence: 'influence',
  gain_attack: 'attack',
  heal: 'heal',
  draw_cards: 'draw',
};

function getHorcruxOrder(): string[] {
  return Object.values(horcruxDatabase)
    .sort((a, b) => a.order - b.order)
    .map((h) => h.id);
}

export function initializeHorcruxes(state: HogwartsGameState): void {
  const stack = getHorcruxOrder();
  state.horcruxState = {
    stack,
    activeHorcruxId: stack[0] ?? null,
    rolledSymbols: [],
    destroyedHorcruxIds: [],
  };
  state.horcruxHealingBlockedThisTurn = false;
}

export function getActiveHorcrux(state: HogwartsGameState): HorcruxDefinition | undefined {
  const id = state.horcruxState?.activeHorcruxId;
  return id ? getHorcrux(id) : undefined;
}

export function allHorcruxesDestroyed(state: HogwartsGameState): boolean {
  if (!state.horcruxState) return true;
  return state.horcruxState.activeHorcruxId === null;
}

export function canAssignAttackToVillain(state: HogwartsGameState, villainId: string): boolean {
  const def = getVillain(villainId);
  // FAQ: Game 5 Voldemort cannot be attacked while other Villains are in play.
  if (def?.cannot_attack_while_other_villains) {
    if (state.activeVillains.some((v) => v.isActive && v.villainId !== villainId)) return false;
  }
  // FAQ: Game 7 Voldemort cannot be attacked until all Horcruxes are destroyed.
  if (def?.requires_horcruxes_destroyed && state.horcruxState) {
    return allHorcruxesDestroyed(state);
  }
  return true;
}

function evaluateHorcruxCondition(
  condition: Record<string, unknown> | undefined,
  _state: HogwartsGameState,
  player: PlayerState,
  context: EffectContext,
): boolean {
  if (!condition) return true;
  const type = String(condition.type ?? '');
  const threshold = Number(condition.threshold ?? 0);
  switch (type) {
    case 'attack_assigned_gte':
      return Number(context.attackAssigned ?? 0) >= threshold;
    case 'card_cost_gte':
      return Number(context.cardCost ?? 0) >= threshold;
    case 'allies_played_gte':
      return player.alliesPlayedThisTurn >= threshold;
    default:
      return true;
  }
}

function resolveHorcruxEffects(
  state: HogwartsGameState,
  playerId: string,
  effects: EffectData[],
  source: string,
): void {
  resolveEffects(
    effects,
    {
      sourcePlayerId: playerId,
      source,
      autoResolve: true,
    },
    state,
  );
}

function fireActiveOngoing(
  state: HogwartsGameState,
  trigger: string,
  playerId: string,
  context: EffectContext = {},
): void {
  const ongoing = getActiveHorcrux(state)?.ongoing;
  if (!ongoing || ongoing.trigger !== trigger) return;
  const player = state.players[playerId];
  if (!player) return;
  if (!evaluateHorcruxCondition(ongoing.condition, state, player, context)) return;
  resolveHorcruxEffects(state, playerId, ongoing.effects, 'horcrux_ongoing');
}

function fireRewardForPlayer(
  state: HogwartsGameState,
  playerId: string,
  trigger: string,
  context: EffectContext = {},
): void {
  const player = state.players[playerId];
  if (!player) return;
  for (const horcruxId of player.destroyedHorcruxIds ?? []) {
    const reward = getHorcrux(horcruxId)?.reward;
    if (!reward || reward.trigger !== trigger) continue;
    if (!evaluateHorcruxCondition(reward.condition, state, player, context)) continue;
    resolveHorcruxEffects(state, playerId, reward.effects, 'horcrux_reward');
  }
}

export function onHorcruxAllyPlayed(state: HogwartsGameState, playerId: string): void {
  if (!state.horcruxState) return;
  fireActiveOngoing(state, 'on_ally_played', playerId);
}

export function onHorcruxSpellPlayed(state: HogwartsGameState, playerId: string): void {
  if (!state.horcruxState) return;
  fireActiveOngoing(state, 'on_spell_played', playerId);
  fireRewardForPlayer(state, playerId, 'on_spell_played');
}

export function onHorcruxAttackAssigned(
  state: HogwartsGameState,
  playerId: string,
  amount: number,
): void {
  if (!state.horcruxState) return;
  fireActiveOngoing(state, 'on_attack_assigned_gte', playerId, { attackAssigned: amount });
}

export function onHorcruxTurnEnd(state: HogwartsGameState): void {
  if (!state.horcruxState) return;
  const playerId = state.currentPlayerId;
  if (!playerId) return;
  fireRewardForPlayer(state, playerId, 'on_allies_played_threshold');
}

export function onHorcruxCardAcquired(
  state: HogwartsGameState,
  playerId: string,
  cardCost: number,
): void {
  if (!state.horcruxState) return;
  fireActiveOngoing(state, 'on_card_acquired_cost_gte', playerId, { cardCost });
  fireRewardForPlayer(state, playerId, 'on_self_card_acquired', { cardCost });
}

export function onHorcruxLocationControlAdded(state: HogwartsGameState): void {
  if (!state.horcruxState) return;
  const playerId = state.currentPlayerId;
  if (!playerId) return;
  fireActiveOngoing(state, 'on_location_control_added', playerId);
}

export function onHorcruxLocationControlRemoved(state: HogwartsGameState): void {
  if (!state.horcruxState) return;
  // FAQ: Horcrux rewards only fire on the turn of the Hero who destroyed them.
  const playerId = state.currentPlayerId;
  if (!playerId) return;
  fireRewardForPlayer(state, playerId, 'on_location_control_removed');
}

export function onHorcruxTurnStart(state: HogwartsGameState): void {
  state.horcruxHealingBlockedThisTurn = false;
  if (!state.horcruxState) return;
  const playerId = state.currentPlayerId;
  if (!playerId) return;
  fireActiveOngoing(state, 'on_turn_start', playerId);
}

export function isHorcruxHealingBlocked(state: HogwartsGameState): boolean {
  return state.horcruxHealingBlockedThisTurn || state.healingPreventedThisTurn;
}

export function houseDiceEffectToSymbol(effect: EffectData): HorcruxSymbol | null {
  return EFFECT_TO_SYMBOL[effect.type] ?? null;
}

function symbolsSatisfyDestroy(required: HorcruxSymbol[], rolled: HorcruxSymbol[]): boolean {
  const pool = [...rolled];
  for (const symbol of required) {
    const idx = pool.indexOf(symbol);
    if (idx < 0) return false;
    pool.splice(idx, 1);
  }
  return true;
}

function advanceHorcruxStack(state: HogwartsGameState): void {
  const horcrux = state.horcruxState;
  if (!horcrux?.activeHorcruxId) return;
  horcrux.destroyedHorcruxIds.push(horcrux.activeHorcruxId);
  horcrux.stack = horcrux.stack.filter((id) => id !== horcrux.activeHorcruxId);
  horcrux.activeHorcruxId = horcrux.stack[0] ?? null;
  horcrux.rolledSymbols = [];
}

function grantDestroyedHorcrux(
  state: HogwartsGameState,
  playerId: string,
  horcruxId: string,
): void {
  const player = state.players[playerId];
  if (!player) return;
  if (!player.destroyedHorcruxIds) player.destroyedHorcruxIds = [];
  player.destroyedHorcruxIds.push(horcruxId);
  const reward = getHorcrux(horcruxId)?.reward;
  if (reward?.trigger === 'immediate') {
    resolveHorcruxEffects(state, playerId, reward.effects, 'horcrux_reward');
  }
}

export function assignHouseDiceSymbolToHorcrux(
  state: HogwartsGameState,
  playerId: string,
  symbol: HorcruxSymbol,
): boolean {
  const horcruxState = state.horcruxState;
  const active = getActiveHorcrux(state);
  if (!horcruxState || !active) return false;

  horcruxState.rolledSymbols.push(symbol);
  if (!symbolsSatisfyDestroy(active.destroy_symbols, horcruxState.rolledSymbols)) {
    return true;
  }

  const destroyedId = active.id;
  grantDestroyedHorcrux(state, playerId, destroyedId);
  advanceHorcruxStack(state);
  return true;
}

export function activateHorcruxReward(
  state: HogwartsGameState,
  playerId: string,
  horcruxId: string,
): boolean {
  const player = state.players[playerId];
  const reward = getHorcrux(horcruxId)?.reward;
  if (!player?.destroyedHorcruxIds.includes(horcruxId)) return false;
  if (reward?.trigger !== 'manual') return false;

  const discardCost = Number(reward.cost?.discard_from_hand ?? 0);
  if (player.hand.length < discardCost) return false;
  // FAQ: cards discarded to pay a cost still trigger their discard effects.
  for (let i = 0; i < discardCost; i += 1) {
    const cardId = player.hand[player.hand.length - 1];
    if (!cardId) break;
    discardFromHand(state, playerId, cardId);
  }
  resolveHorcruxEffects(state, playerId, reward.effects, 'horcrux_reward');
  return true;
}

export function collectHorcruxEffectTypes(): Set<string> {
  const types = new Set<string>();
  for (const horcrux of Object.values(horcruxDatabase)) {
    for (const effect of horcrux.ongoing?.effects ?? []) types.add(effect.type);
    for (const effect of horcrux.reward?.effects ?? []) types.add(effect.type);
  }
  return types;
}

export function collectHorcruxOngoingTriggers(): Set<string> {
  const triggers = new Set<string>();
  for (const horcrux of Object.values(horcruxDatabase)) {
    if (horcrux.ongoing?.trigger) triggers.add(horcrux.ongoing.trigger);
  }
  return triggers;
}

export function collectHorcruxRewardTriggers(): Set<string> {
  const triggers = new Set<string>();
  for (const horcrux of Object.values(horcruxDatabase)) {
    if (horcrux.reward?.trigger) triggers.add(horcrux.reward.trigger);
  }
  return triggers;
}
