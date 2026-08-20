import { cardHasKeyword, getCard, getProficiency } from './dataManager';
import { discardFromHand, resolveEffects } from './effectResolver';
import { getCardInstance } from './gameState';
import type {
  CardDefinition,
  EffectContext,
  EffectData,
  HogwartsGameState,
  PlayerState,
} from './types';

export const PROFICIENCY_PASSIVE_EFFECT_TYPES = new Set([
  'discount_for_keyword',
  'reroll_house_dice',
]);

export const PROFICIENCY_SUPPORTED_EFFECT_TYPES = new Set([
  ...PROFICIENCY_PASSIVE_EFFECT_TYPES,
  'choose_one',
  'draw_cards',
  'gain_attack',
  'gain_influence',
  'heal',
  'multi_effect',
  'peek_and_replace_or_discard',
  'remove_location_control',
  'search_deck',
]);

export const PROFICIENCY_SUPPORTED_TRIGGERS = new Set([
  'manual',
  'on_attack_creature',
  'on_card_types_played',
  'on_forced_discard',
  'on_heal_threshold',
  'on_item_played',
  'on_spell_purchased',
  'passive',
]);

function evaluateProficiencyCondition(
  condition: Record<string, unknown>,
  state: HogwartsGameState,
  player: PlayerState,
  context: EffectContext,
): boolean {
  const type = String(condition.type ?? '');
  switch (type) {
    case 'played_all_three_types': {
      const types = (condition.types as string[]) ?? [];
      return types.every((cardType) => {
        switch (cardType) {
          case 'ally':
            return player.alliesPlayedThisTurn >= 1;
          case 'item':
            return player.itemsPlayedThisTurn >= 1;
          case 'spell':
            return player.spellsPlayedThisTurn >= 1;
          default:
            return false;
        }
      });
    }
    case 'heal_amount_gte': {
      const healedId = context.healedPlayerId ?? context.sourcePlayerId ?? '';
      const healedPlayer = state.players[healedId];
      return (healedPlayer?.healAmountThisTurn ?? 0) >= Number(condition.threshold ?? 0);
    }
    default:
      return true;
  }
}

function resolveProficiencyEffects(
  state: HogwartsGameState,
  playerId: string,
  effects: EffectData[],
  context: EffectContext,
): void {
  const profContext: EffectContext = {
    ...context,
    sourcePlayerId: context.sourcePlayerId ?? playerId,
    source: 'proficiency',
    autoResolve: true,
  };
  resolveEffects(effects, profContext, state);
}

function fireProficiencies(
  state: HogwartsGameState,
  trigger: string,
  context: EffectContext,
): void {
  for (const [playerId, player] of Object.entries(state.players)) {
    const proficiency = getProficiency(player.proficiencyId);
    if (!proficiency || proficiency.trigger !== trigger) continue;
    const usesPerTurn = proficiency.uses_per_turn ?? 0;
    if (usesPerTurn > 0 && player.proficiencyUsedThisTurn) continue;
    if (
      proficiency.condition &&
      !evaluateProficiencyCondition(proficiency.condition, state, player, context)
    ) {
      continue;
    }
    resolveProficiencyEffects(state, playerId, proficiency.effects, {
      ...context,
      sourcePlayerId: context.sourcePlayerId ?? playerId,
    });
    if (usesPerTurn > 0) player.proficiencyUsedThisTurn = true;
  }
}

export function fireCreatureKilledProficiencies(state: HogwartsGameState, playerId: string): void {
  const player = state.players[playerId];
  if (!player) return;
  const proficiency = getProficiency(player.proficiencyId);
  if (!proficiency?.on_creature_killed?.length) return;
  resolveProficiencyEffects(state, playerId, proficiency.on_creature_killed, {
    sourcePlayerId: playerId,
    source: 'proficiency',
  });
}

export function getEffectiveCardCost(
  state: HogwartsGameState,
  _playerId: string,
  card: CardDefinition | undefined,
): number {
  const baseCost = card?.cost ?? 0;
  if (!card) return baseCost;
  let discount = 0;
  for (const player of Object.values(state.players)) {
    if (player.proficiencyId !== 'arithmancy') continue;
    for (const effect of getProficiency('arithmancy')?.effects ?? []) {
      if (effect.type !== 'discount_for_keyword') continue;
      const keyword = String(effect.params?.keyword ?? '');
      const amount = Number(effect.params?.discount ?? 0);
      if (cardHasKeyword(card, keyword)) discount = Math.max(discount, amount);
    }
  }
  return Math.max(0, baseCost - discount);
}

function discardCardsByType(
  state: HogwartsGameState,
  playerId: string,
  cardType: string,
  count: number,
): boolean {
  const player = state.players[playerId];
  if (!player) return false;
  let remaining = count;
  for (let i = player.hand.length - 1; i >= 0 && remaining > 0; i -= 1) {
    const instanceId = player.hand[i]!;
    const ci = getCardInstance(state, instanceId);
    if (getCard(ci?.cardId ?? '')?.type !== cardType) continue;
    // FAQ: cards discarded to pay a cost still trigger their discard effects.
    discardFromHand(state, playerId, instanceId);
    remaining -= 1;
  }
  return remaining === 0;
}

function payProficiencyCost(
  state: HogwartsGameState,
  playerId: string,
  cost: Record<string, unknown> | undefined,
): boolean {
  const player = state.players[playerId];
  if (!player || !cost) return true;
  const spellCost = Number(cost.discard_spells ?? 0);
  if (spellCost > 0 && !discardCardsByType(state, playerId, 'spell', spellCost)) return false;
  const itemCost = Number(cost.discard_items ?? 0);
  if (itemCost > 0 && !discardCardsByType(state, playerId, 'item', itemCost)) return false;
  const influenceCost = Number(cost.influence ?? 0);
  if (influenceCost > 0 && player.moneyTokens < influenceCost) return false;
  if (influenceCost > 0) {
    player.moneyTokens -= influenceCost;
    player.moneyTokensSpentThisTurn += influenceCost;
  }
  return true;
}

export function activateProficiency(state: HogwartsGameState, playerId: string): boolean {
  if (state.currentPhase !== 'HERO_ACTION') return false;
  const player = state.players[playerId];
  if (!player?.proficiencyId) return false;
  const proficiency = getProficiency(player.proficiencyId);
  if (proficiency?.trigger !== 'manual') return false;
  const usesPerTurn = proficiency.uses_per_turn ?? 0;
  if (usesPerTurn > 0 && player.proficiencyUsedThisTurn) return false;
  if (!payProficiencyCost(state, playerId, proficiency.cost)) return false;
  resolveProficiencyEffects(state, playerId, proficiency.effects, { sourcePlayerId: playerId });
  if (usesPerTurn > 0) player.proficiencyUsedThisTurn = true;
  return true;
}

export function recordPlayerHeal(state: HogwartsGameState, playerId: string, amount: number): void {
  if (amount <= 0) return;
  const player = state.players[playerId];
  if (!player) return;
  player.healAmountThisTurn += amount;
  fireProficiencies(state, 'on_heal_threshold', {
    sourcePlayerId: playerId,
    healedPlayerId: playerId,
    source: 'proficiency',
  });
}

export function onItemPlayed(state: HogwartsGameState, playerId: string): void {
  fireProficiencies(state, 'on_item_played', { sourcePlayerId: playerId, source: 'proficiency' });
}

export function onSpellPurchased(state: HogwartsGameState, playerId: string): void {
  fireProficiencies(state, 'on_spell_purchased', {
    sourcePlayerId: playerId,
    source: 'proficiency',
  });
}

export function onCardTypesPlayed(state: HogwartsGameState, playerId: string): void {
  fireProficiencies(state, 'on_card_types_played', {
    sourcePlayerId: playerId,
    source: 'proficiency',
  });
}

export function onAttackCreature(state: HogwartsGameState, playerId: string): void {
  const player = state.players[playerId];
  if (!player || player.attackedCreatureThisTurn) return;
  player.attackedCreatureThisTurn = true;
  fireProficiencies(state, 'on_attack_creature', {
    sourcePlayerId: playerId,
    source: 'proficiency',
  });
}

export function onForcedDiscard(state: HogwartsGameState, playerId: string, count: number): void {
  void count;
  fireProficiencies(state, 'on_forced_discard', {
    sourcePlayerId: playerId,
    source: 'proficiency',
  });
}
