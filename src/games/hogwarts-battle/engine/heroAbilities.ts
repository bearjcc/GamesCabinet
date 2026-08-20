import { getHero } from './dataManager';
import { effectRequiresPlayerChoice, resolveEffects } from './effectResolver';
import type { EffectContext, EffectData, HogwartsGameState, PlayerState } from './types';

export const HERO_SUPPORTED_EFFECT_TYPES = new Set([
  'choose_one',
  'choose_players_gain_attack',
  'gain_influence',
  'heal',
]);

export const HERO_SUPPORTED_TRIGGERS = new Set([
  'on_damage_dealt_threshold',
  'on_first_card_drawn',
  'on_heal_first_per_turn',
  'on_location_control_removed',
  'on_spells_played_threshold',
]);

function materializeEffect(effect: EffectData, context: EffectContext): EffectData {
  const params = { ...effect.params };
  if (params.amount === '{control_removed}') {
    params.amount = context.controlRemoved ?? 0;
  }
  return { ...effect, params };
}

function evaluateAbilityCondition(
  condition: Record<string, unknown>,
  state: HogwartsGameState,
  player: PlayerState,
): boolean {
  const type = String(condition.type ?? '');
  const threshold = Number(condition.threshold ?? 0);
  switch (type) {
    case 'attack_pool_gte':
      return state.damageDealtThisTurn >= threshold;
    case 'spells_played_gte':
      return player.spellsPlayedThisTurn >= threshold;
    /* v8 ignore next 2 — forward-compat for data-driven conditions not yet in Game 1 */
    default:
      return true;
  }
}

export function fireHeroAbilities(
  state: HogwartsGameState,
  trigger: string,
  context: EffectContext,
): void {
  for (const [playerId, player] of Object.entries(state.players)) {
    const heroDef = getHero(player.characterId);
    const ability = heroDef?.ability;
    if (!ability || ability.trigger !== trigger) continue;
    // Skip abilities that are not yet available for the current game number.
    // Hero abilities are introduced starting from Game 2.
    if (ability.available_from_game != null && state.gameNumber < ability.available_from_game) {
      continue;
    }
    const usesPerTurn = ability.uses_per_turn ?? 0;
    if (usesPerTurn > 0 && player.abilityUsedThisTurn) continue;
    if (ability.condition && !evaluateAbilityCondition(ability.condition, state, player)) {
      continue;
    }
    const heroContext: EffectContext = {
      ...context,
      sourcePlayerId: context.sourcePlayerId ?? playerId,
      source: 'hero_ability',
      autoResolve: false,
    };
    const effects = ability.effects.map((effect) => materializeEffect(effect, heroContext));
    heroContext.autoResolve = !effects.some(effectRequiresPlayerChoice);
    resolveEffects(effects, heroContext, state);
    if (usesPerTurn > 0) player.abilityUsedThisTurn = true;
  }
}

export function recordDamageDealt(state: HogwartsGameState, amount: number): void {
  if (amount <= 0) return;
  state.damageDealtThisTurn += amount;
  fireHeroAbilities(state, 'on_damage_dealt_threshold', {
    sourcePlayerId: state.currentPlayerId,
    source: 'hero_ability',
  });
}

export function onHeroHeal(state: HogwartsGameState, healedPlayerId: string, amount: number): void {
  if (amount <= 0 || state.healOccurredThisTurn) return;
  state.healOccurredThisTurn = true;
  fireHeroAbilities(state, 'on_heal_first_per_turn', {
    sourcePlayerId: healedPlayerId,
    source: 'hero_ability',
  });
}

export function onHeroCardDrawn(state: HogwartsGameState, playerId: string): void {
  const player = state.players[playerId];
  if (!player || player.firstCardDrawnThisTurn) return;
  player.firstCardDrawnThisTurn = true;
  if (player.characterId !== 'luna') return;
  fireHeroAbilities(state, 'on_first_card_drawn', {
    sourcePlayerId: playerId,
    source: 'hero_ability',
  });
}

export function onHeroSpellPlayed(state: HogwartsGameState, playerId: string): void {
  const player = state.players[playerId];
  if (player?.characterId !== 'hermione') return;
  if (player.spellsPlayedThisTurn < 4) return;
  fireHeroAbilities(state, 'on_spells_played_threshold', {
    sourcePlayerId: playerId,
    source: 'hero_ability',
  });
}

export function onLocationControlRemoved(state: HogwartsGameState, removed: number): void {
  if (removed <= 0) return;
  fireHeroAbilities(state, 'on_location_control_removed', {
    sourcePlayerId: state.currentPlayerId,
    source: 'hero_ability',
    controlRemoved: removed,
  });
}
