import { getVillain } from './dataManager';
import type { EffectData, HogwartsGameState } from './types';

/** Ongoing effects that fire from game events, not during villain phase. */
const VILLAIN_TRIGGER_ONLY_ONGOING_TYPES = new Set([
  'deal_damage_on_location_control_added',
  'deal_damage_on_discard',
  'heal_villains_on_location_removed',
  'damage_all_on_new_villain',
  'deal_damage_on_card_cost',
  // FAQ: Bellatrix's extra reveal happens during the Dark Arts phase.
  'reveal_extra_dark_arts',
]);

/** Ongoing passives checked elsewhere; no-op when resolved directly. */
const VILLAIN_PASSIVE_ONGOING_TYPES = new Set([
  'prevent_extra_draw',
  'prevent_all_healing',
  'prevent_location_removal',
]);

function isCreatureVillain(villainId: string): boolean {
  const type = getVillain(villainId)?.type;
  return type === 'villain-creature' || type === 'creature';
}

export function isVillainEffectBlocked(state: HogwartsGameState, villainId: string): boolean {
  if (state.blockVillainEffectsThisTurn) return true;
  if (state.blockCreatureEffectsThisTurn && isCreatureVillain(villainId)) return true;
  return false;
}

function shouldResolveOngoingAtVillainPhase(effect: EffectData): boolean {
  if (VILLAIN_TRIGGER_ONLY_ONGOING_TYPES.has(effect.type)) return false;
  if (VILLAIN_PASSIVE_ONGOING_TYPES.has(effect.type)) return false;
  if (effect.type === 'multi_effect') {
    const subs = (effect.params?.effects as EffectData[]) ?? [];
    return subs.some((sub) => shouldResolveOngoingAtVillainPhase(sub));
  }
  return true;
}

export function hasActiveVillainOngoing(state: HogwartsGameState, effectType: string): boolean {
  return state.activeVillains.some((villain) => {
    if (!villain.isActive || isVillainEffectBlocked(state, villain.villainId)) return false;
    return effectTypeMatches(getVillain(villain.villainId)?.ongoing_effect, effectType);
  });
}

function effectTypeMatches(effect: EffectData | undefined, effectType: string): boolean {
  if (!effect?.type) return false;
  if (effect.type === effectType) return true;
  if (effect.type === 'multi_effect') {
    return ((effect.params?.effects as EffectData[]) ?? []).some((sub) =>
      effectTypeMatches(sub, effectType),
    );
  }
  return false;
}

export function findActiveVillainOngoingByType(
  state: HogwartsGameState,
  effectType: string,
): { villainId: string; effect: EffectData }[] {
  const matches: { villainId: string; effect: EffectData }[] = [];
  for (const villain of state.activeVillains) {
    if (!villain.isActive || isVillainEffectBlocked(state, villain.villainId)) continue;
    const ongoing = getVillain(villain.villainId)?.ongoing_effect;
    if (ongoing?.type === effectType) {
      matches.push({ villainId: villain.villainId, effect: ongoing });
    }
  }
  return matches;
}

export function resolveVillainOngoingAtPhase(
  effect: EffectData,
  state: HogwartsGameState,
  context: import('./types').EffectContext,
  resolve: (
    effect: EffectData,
    context: import('./types').EffectContext,
    state: HogwartsGameState,
  ) => void,
): void {
  if (!shouldResolveOngoingAtVillainPhase(effect)) return;
  if (effect.type === 'multi_effect') {
    const subs = (effect.params?.effects as EffectData[]) ?? [];
    for (const sub of subs) resolveVillainOngoingAtPhase(sub, state, context, resolve);
    return;
  }
  resolve(effect, context, state);
}
