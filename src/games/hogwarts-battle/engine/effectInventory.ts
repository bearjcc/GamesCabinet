import market from '../data/cards/market.json';
import starters from '../data/cards/starters.json';
import charmsData from '../data/charms/charms.json';
import creatureDieData from '../data/creature_die.json';
import darkArts from '../data/dark_arts/dark_arts.json';
import encountersData from '../data/encounters/encounters.json';
import heroes from '../data/heroes/heroes.json';
import houseDice from '../data/heroes/house_dice.json';
import proficiencies from '../data/heroes/proficiencies.json';
import patronusData from '../data/patronus/patronus.json';
import potionsData from '../data/potions/potions.json';
import villains from '../data/villains/villains.json';
import { HERO_SUPPORTED_EFFECT_TYPES, HERO_SUPPORTED_TRIGGERS } from './heroAbilities';
import {
  collectHorcruxEffectTypes,
  collectHorcruxOngoingTriggers,
  collectHorcruxRewardTriggers,
  HORCRUX_SUPPORTED_EFFECT_TYPES,
  HORCRUX_SUPPORTED_ONGOING_TRIGGERS,
  HORCRUX_SUPPORTED_REWARD_TRIGGERS,
} from './horcruxes';
import {
  PROFICIENCY_PASSIVE_EFFECT_TYPES,
  PROFICIENCY_SUPPORTED_EFFECT_TYPES,
  PROFICIENCY_SUPPORTED_TRIGGERS,
} from './proficiencies';
import type {
  CardDefinition,
  CharmDefinition,
  EffectData,
  EncounterDefinition,
  HeroDefinition,
  PatronusDefinition,
  PotionDefinition,
  ProficiencyDefinition,
  VillainDefinition,
} from './types';

/** Effect types implemented for card play and dark arts resolution. */
export const CARD_DARK_ARTS_SUPPORTED_EFFECT_TYPES = new Set([
  'add_location_control',
  'banish_card_from_hand',
  'block_creature_effects',
  'block_villain_effects',
  'choose_house_dice',
  'choose_n',
  'choose_one',
  'choose_one_all_players',
  'conditional',
  'conditional_per_player',
  'copy_ally_effect_from_play',
  'deal_damage',
  'deal_damage_per_active_creature',
  'deal_damage_per_card_cost',
  'deal_damage_per_card_cost_exact',
  'deal_damage_per_detention_in_hand',
  'discard_card_type',
  'discard_cards',
  'discard_revealed_card',
  'discard_with_bonus_if_type',
  'draw_cards',
  'gain_attack',
  'gain_attack_per_card_type_played',
  'gain_card_to_hand',
  'gain_influence',
  'gain_per_card_type_played',
  'heal',
  'heal_villains',
  'multi_effect',
  'optional_banish_for_effect',
  'peek_dark_arts',
  'prevent_healing_this_turn',
  'peek_and_replace_or_discard',
  'remove_location_control',
  'reveal_and_penalty_if_cost',
  'reveal_and_penalty_if_type',
  'reveal_extra_dark_arts',
  'roll_house_dice',
  'roll_outcome_table',
  'search_deck',
  'search_discard_for_type',
  'select_players_exclusive',
]);

/** Card passives wired in buy flow or damage calc for this slice. */
export const CARD_DARK_ARTS_SUPPORTED_PASSIVE_TYPES = new Set([
  'purchased_allies_to_deck',
  'purchased_items_to_deck',
  'purchased_spells_to_deck',
  'reduce_damage_in_hand',
]);

/** Reserved for card/dark-arts data that is declared but not in this slice. */
export const CARD_DARK_ARTS_UNSUPPORTED_EFFECT_TYPES = new Set<string>([]);

function walkEffect(effect: EffectData | undefined, types: Set<string>): void {
  if (!effect?.type) return;
  types.add(effect.type);
  const params = effect.params ?? {};
  const nested = params.effects as EffectData[] | undefined;
  if (nested)
    nested.forEach((e) => {
      walkEffect(e, types);
    });
  const options = params.options as { effect: EffectData }[] | undefined;
  if (options)
    options.forEach((o) => {
      walkEffect(o.effect, types);
    });
  const penalty = params.penalty as EffectData | undefined;
  if (penalty) walkEffect(penalty, types);
  const outcomes = params.outcomes as { effect: EffectData }[] | undefined;
  if (outcomes)
    outcomes.forEach((o) => {
      walkEffect(o.effect, types);
    });
  const bonus = params.bonus as EffectData | undefined;
  if (bonus) walkEffect(bonus, types);
  const subEffects = params.effects as EffectData[] | undefined;
  if (subEffects && effect.type === 'select_players_exclusive') {
    subEffects.forEach((e) => {
      walkEffect(e, types);
    });
  }
  const inner = params.effect as EffectData | undefined;
  if (inner) walkEffect(inner, types);
  if (effect.then) walkEffect(effect.then, types);
  if (effect.else) walkEffect(effect.else, types);
}

export function collectCardDarkArtsEffectTypes(): Set<string> {
  const types = new Set<string>();
  const cards = { ...starters, ...market } as Record<string, CardDefinition>;
  for (const card of Object.values(cards)) {
    (card.effects ?? []).forEach((e) => {
      walkEffect(e, types);
    });
    if (card.on_discard_effect) walkEffect(card.on_discard_effect, types);
  }
  for (const event of Object.values(darkArts)) {
    (event.effects ?? []).forEach((e) => {
      walkEffect(e as EffectData, types);
    });
  }
  return types;
}

export function collectCardDarkArtsPassiveTypes(): Set<string> {
  const types = new Set<string>();
  const cards = { ...starters, ...market } as Record<string, CardDefinition>;
  for (const card of Object.values(cards)) {
    if (card.passive_effect?.type) types.add(card.passive_effect.type);
  }
  return types;
}

export function unknownCardDarkArtsEffectTypes(): string[] {
  const known = new Set([
    ...CARD_DARK_ARTS_SUPPORTED_EFFECT_TYPES,
    ...CARD_DARK_ARTS_UNSUPPORTED_EFFECT_TYPES,
  ]);
  return [...collectCardDarkArtsEffectTypes()].filter((t) => !known.has(t)).sort();
}

export function unknownCardDarkArtsPassiveTypes(): string[] {
  const known = new Set([
    ...CARD_DARK_ARTS_SUPPORTED_PASSIVE_TYPES,
    ...CARD_DARK_ARTS_UNSUPPORTED_EFFECT_TYPES,
  ]);
  return [...collectCardDarkArtsPassiveTypes()].filter((t) => !known.has(t)).sort();
}

/** Effect types used in villain ongoing/death data (includes shared card/dark-arts types). */
export const VILLAIN_SUPPORTED_EFFECT_TYPES = new Set([
  ...CARD_DARK_ARTS_SUPPORTED_EFFECT_TYPES,
  'banish_card',
  'banish_card_all',
  'choose_one_per_player',
  'choose_players_gain_attack',
  'damage_all_on_new_villain',
  'damage_per_detention_in_hand',
  'damage_per_even_cost_card',
  'deal_damage_on_card_cost',
  'deal_damage_on_discard',
  'deal_damage_on_location_control_added',
  'discard_top_deck_if_cost_gte',
  'heal_villains_on_location_removed',
  'none',
  'per_ally_choose_penalty',
  'per_item_choose_penalty',
  'prevent_all_healing',
  'prevent_extra_draw',
  'prevent_location_removal',
]);

export const VILLAIN_UNSUPPORTED_EFFECT_TYPES = new Set<string>([]);

export function collectVillainOngoingEffectTypes(): Set<string> {
  const types = new Set<string>();
  for (const villain of Object.values(villains as Record<string, VillainDefinition>)) {
    if (villain.ongoing_effect) walkEffect(villain.ongoing_effect, types);
  }
  return types;
}

export function collectVillainDeathEffectTypes(): Set<string> {
  const types = new Set<string>();
  for (const villain of Object.values(villains as Record<string, VillainDefinition>)) {
    if (villain.death_effect) walkEffect(villain.death_effect, types);
  }
  return types;
}

export function unknownVillainEffectTypes(): string[] {
  const known = new Set([...VILLAIN_SUPPORTED_EFFECT_TYPES, ...VILLAIN_UNSUPPORTED_EFFECT_TYPES]);
  return [...new Set([...collectVillainOngoingEffectTypes(), ...collectVillainDeathEffectTypes()])]
    .filter((t) => !known.has(t))
    .sort();
}

export const HERO_UNSUPPORTED_EFFECT_TYPES = new Set<string>([]);

function walkHeroEffects(effects: EffectData[] | undefined, types: Set<string>): void {
  for (const effect of effects ?? []) walkEffect(effect, types);
}

export function collectHeroAbilityEffectTypes(): Set<string> {
  const types = new Set<string>();
  for (const hero of Object.values(heroes as Record<string, HeroDefinition>)) {
    walkHeroEffects(hero.ability?.effects, types);
  }
  return types;
}

export function collectHeroAbilityTriggers(): Set<string> {
  const triggers = new Set<string>();
  for (const hero of Object.values(heroes as Record<string, HeroDefinition>)) {
    if (hero.ability?.trigger) triggers.add(hero.ability.trigger);
  }
  return triggers;
}

export function unknownHeroAbilityEffectTypes(): string[] {
  const known = new Set([
    ...HERO_SUPPORTED_EFFECT_TYPES,
    ...HERO_UNSUPPORTED_EFFECT_TYPES,
    ...VILLAIN_SUPPORTED_EFFECT_TYPES,
  ]);
  return [...collectHeroAbilityEffectTypes()].filter((t) => !known.has(t)).sort();
}

export function unknownHeroAbilityTriggers(): string[] {
  return [...collectHeroAbilityTriggers()].filter((t) => !HERO_SUPPORTED_TRIGGERS.has(t)).sort();
}

export const PROFICIENCY_UNSUPPORTED_EFFECT_TYPES = new Set<string>([]);

function walkProficiencyEffects(proficiency: ProficiencyDefinition, types: Set<string>): void {
  for (const effect of proficiency.effects ?? []) walkEffect(effect, types);
  for (const effect of proficiency.on_creature_killed ?? []) walkEffect(effect, types);
}

export function collectProficiencyEffectTypes(): Set<string> {
  const types = new Set<string>();
  for (const proficiency of Object.values(proficiencies as Record<string, ProficiencyDefinition>)) {
    walkProficiencyEffects(proficiency, types);
  }
  return types;
}

export function collectProficiencyTriggers(): Set<string> {
  const triggers = new Set<string>();
  for (const proficiency of Object.values(proficiencies as Record<string, ProficiencyDefinition>)) {
    if (proficiency.trigger) triggers.add(proficiency.trigger);
  }
  return triggers;
}

export function unknownProficiencyEffectTypes(): string[] {
  const known = new Set([
    ...PROFICIENCY_SUPPORTED_EFFECT_TYPES,
    ...PROFICIENCY_PASSIVE_EFFECT_TYPES,
    ...PROFICIENCY_UNSUPPORTED_EFFECT_TYPES,
    ...VILLAIN_SUPPORTED_EFFECT_TYPES,
  ]);
  return [...collectProficiencyEffectTypes()].filter((t) => !known.has(t)).sort();
}

export function unknownProficiencyTriggers(): string[] {
  return [...collectProficiencyTriggers()]
    .filter((t) => !PROFICIENCY_SUPPORTED_TRIGGERS.has(t))
    .sort();
}

const HOUSE_DICE_SUPPORTED_EFFECT_TYPES = new Set([
  'draw_cards',
  'gain_attack',
  'gain_influence',
  'heal',
]);

export function collectHouseDiceFaceEffectTypes(): Set<string> {
  const types = new Set<string>();
  for (const diceId of Object.keys(houseDice as Record<string, unknown>)) {
    const dice = getHouseDiceFromData(diceId);
    for (const face of dice?.faces ?? []) walkEffect(face.effect, types);
  }
  return types;
}

function getHouseDiceFromData(diceId: string) {
  return (houseDice as Record<string, { faces: { effect: EffectData }[] }>)[diceId];
}

export function unknownHouseDiceFaceEffectTypes(): string[] {
  return [...collectHouseDiceFaceEffectTypes()]
    .filter((t) => !HOUSE_DICE_SUPPORTED_EFFECT_TYPES.has(t))
    .sort();
}

export const HORCRUX_UNSUPPORTED_EFFECT_TYPES = new Set<string>([]);

export function unknownHorcruxEffectTypes(): string[] {
  const known = new Set([...HORCRUX_SUPPORTED_EFFECT_TYPES, ...HORCRUX_UNSUPPORTED_EFFECT_TYPES]);
  return [...collectHorcruxEffectTypes()].filter((t) => !known.has(t)).sort();
}

export function unknownHorcruxOngoingTriggers(): string[] {
  return [...collectHorcruxOngoingTriggers()]
    .filter((t) => !HORCRUX_SUPPORTED_ONGOING_TRIGGERS.has(t))
    .sort();
}

export function unknownHorcruxRewardTriggers(): string[] {
  return [...collectHorcruxRewardTriggers()]
    .filter((t) => !HORCRUX_SUPPORTED_REWARD_TRIGGERS.has(t))
    .sort();
}

export {
  collectHorcruxEffectTypes,
  collectHorcruxOngoingTriggers,
  collectHorcruxRewardTriggers,
} from './horcruxes';

/** Effect types used in encounter effects and rewards. */
export const ENCOUNTER_SUPPORTED_EFFECT_TYPES = new Set([
  'encounter_limit_hand_draw',
  'encounter_on_control_added',
  'encounter_on_creature_defeated',
  'encounter_on_villain_defeated',
  'encounter_on_card_played',
  'encounter_on_dice_rolled',
  // Reward effect types (resolved through the main resolver)
  'gain_attack',
  'gain_influence',
  'draw_cards',
  'heal',
  'remove_location_control',
  'roll_creature_die',
  'gain_patronus_charge',
  'multi_effect',
  'none',
]);

/** Completion condition types used in encounter data. */
export const ENCOUNTER_SUPPORTED_CONDITION_TYPES = new Set([
  'play_even_cost_cards',
  'defeat_creatures',
  'defeat_villains_and_creatures',
  'acquire_cards',
  'play_card_types',
  'roll_dice_total',
  'spend_influence',
  'remove_control_total',
]);

export function collectEncounterEffectTypes(): Set<string> {
  const types = new Set<string>();
  for (const enc of Object.values(encountersData as Record<string, EncounterDefinition>)) {
    if (enc.effect) walkEffect(enc.effect, types);
    walkEffect(enc.reward, types);
  }
  return types;
}

export function collectEncounterConditionTypes(): Set<string> {
  const types = new Set<string>();
  for (const enc of Object.values(encountersData as Record<string, EncounterDefinition>)) {
    if (enc.completion_condition?.type) types.add(enc.completion_condition.type);
  }
  return types;
}

export function unknownEncounterEffectTypes(): string[] {
  const known = new Set([
    ...ENCOUNTER_SUPPORTED_EFFECT_TYPES,
    ...CARD_DARK_ARTS_SUPPORTED_EFFECT_TYPES,
    ...VILLAIN_SUPPORTED_EFFECT_TYPES,
  ]);
  return [...collectEncounterEffectTypes()].filter((t) => !known.has(t)).sort();
}

export function unknownEncounterConditionTypes(): string[] {
  return [...collectEncounterConditionTypes()]
    .filter((t) => !ENCOUNTER_SUPPORTED_CONDITION_TYPES.has(t))
    .sort();
}

export const PATRONUS_SUPPORTED_EFFECT_TYPES = new Set([
  'patronus_protect',
  'roll_house_dice',
  'draw_cards',
  'gain_influence',
  'gain_attack',
  'heal',
]);

export function collectPatronusEffectTypes(): Set<string> {
  const types = new Set<string>();
  for (const p of Object.values(patronusData as Record<string, PatronusDefinition>)) {
    for (const effect of p.effects ?? []) walkEffect(effect, types);
  }
  return types;
}

export function unknownPatronusEffectTypes(): string[] {
  const known = new Set([
    ...PATRONUS_SUPPORTED_EFFECT_TYPES,
    ...CARD_DARK_ARTS_SUPPORTED_EFFECT_TYPES,
  ]);
  return [...collectPatronusEffectTypes()].filter((t) => !known.has(t)).sort();
}

export const CREATURE_DIE_SUPPORTED_EFFECT_TYPES = new Set([
  'heal',
  'gain_attack',
  'gain_influence',
  'draw_cards',
  'remove_location_control',
]);

export function collectCreatureDieEffectTypes(): Set<string> {
  const types = new Set<string>();
  for (const die of Object.values(
    creatureDieData as Record<string, { faces: { effect: EffectData }[] }>,
  )) {
    for (const face of die.faces) walkEffect(face.effect, types);
  }
  return types;
}

export function unknownCreatureDieEffectTypes(): string[] {
  return [...collectCreatureDieEffectTypes()]
    .filter((t) => !CREATURE_DIE_SUPPORTED_EFFECT_TYPES.has(t))
    .sort();
}

export const POTION_SUPPORTED_EFFECT_TYPES = new Set([
  'choose_one',
  'multi_effect',
  'heal',
  'draw_cards',
  'gain_attack',
  'gain_influence',
]);

export function collectPotionEffectTypes(): Set<string> {
  const types = new Set<string>();
  for (const potion of Object.values(potionsData as Record<string, PotionDefinition>)) {
    walkEffect(potion.effect, types);
    walkEffect(potion.banish_effect, types);
  }
  return types;
}

export function unknownPotionEffectTypes(): string[] {
  const known = new Set([
    ...POTION_SUPPORTED_EFFECT_TYPES,
    ...CARD_DARK_ARTS_SUPPORTED_EFFECT_TYPES,
  ]);
  return [...collectPotionEffectTypes()].filter((t) => !known.has(t)).sort();
}

export const CHARM_SUPPORTED_EFFECT_TYPES = new Set([
  'gain_influence',
  'gain_attack',
  'heal',
  'draw_cards',
]);

export function collectCharmEffectTypes(): Set<string> {
  const types = new Set<string>();
  for (const charm of Object.values(charmsData as Record<string, CharmDefinition>)) {
    for (const tier of charm.tiers) {
      for (const effect of tier.effects) walkEffect(effect, types);
    }
  }
  return types;
}

export function unknownCharmEffectTypes(): string[] {
  return [...collectCharmEffectTypes()].filter((t) => !CHARM_SUPPORTED_EFFECT_TYPES.has(t)).sort();
}
