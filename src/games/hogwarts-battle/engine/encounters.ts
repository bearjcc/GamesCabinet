import { getEncounter, getEncountersForSet } from './dataManager';
import { resolveEffects } from './effectResolver';
import { getPlayer } from './gameState';
import type { EffectContext, EncounterDefinition, HogwartsGameState } from './types';

export const ENCOUNTER_SUPPORTED_EFFECT_TYPES = new Set([
  'encounter_limit_hand_draw',
  'encounter_on_control_added',
  'encounter_on_creature_defeated',
  'encounter_on_villain_defeated',
  'encounter_on_card_played',
  'encounter_on_dice_rolled',
]);

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

export function getEncounterSetForGame(gameNumber: number): string {
  if (gameNumber >= 8 && gameNumber <= 11) {
    const boxIndex = gameNumber - 8;
    const sets = ['box1', 'box2', 'box3', 'box4'];
    return sets[boxIndex] ?? 'box1';
  }
  if (gameNumber >= 12 && gameNumber <= 15) {
    const boxIndex = gameNumber - 12;
    const sets = ['potions_box1', 'potions_box2', 'potions_box3', 'potions_box4'];
    return sets[boxIndex] ?? 'potions_box1';
  }
  return '';
}

export function initializeEncounters(state: HogwartsGameState, gameNumber: number): void {
  const setId = getEncounterSetForGame(gameNumber);
  if (!setId) return;
  const encounters = getEncountersForSet(setId);
  if (encounters.length === 0) return;

  const deck = encounters.map((e) => e.id);
  state.encounterState = {
    encounterDeck: deck,
    activeEncounterId: deck[0] ?? null,
    completedEncounterIds: [],
    progress: {},
    controlRemovedThisTurn: 0,
    creaturesDefeatedThisTurn: 0,
    villainsDefeatedThisTurn: 0,
    cardsAcquiredThisTurn: 0,
    influenceSpentThisTurn: 0,
    evenCostCardsPlayedThisTurn: 0,
    spellsPlayedThisTurn: 0,
    itemsPlayedThisTurn: 0,
    alliesPlayedThisTurn: 0,
  };
}

export function getActiveEncounter(state: HogwartsGameState): EncounterDefinition | undefined {
  const id = state.encounterState?.activeEncounterId;
  return id ? getEncounter(id) : undefined;
}

export function allEncountersCompleted(state: HogwartsGameState): boolean {
  if (!state.encounterState) return true;
  return (
    state.encounterState.activeEncounterId === null &&
    state.encounterState.encounterDeck.length === 0
  );
}

export function resetEncounterTurnCounters(state: HogwartsGameState): void {
  if (!state.encounterState) return;
  state.encounterState.controlRemovedThisTurn = 0;
  state.encounterState.creaturesDefeatedThisTurn = 0;
  state.encounterState.villainsDefeatedThisTurn = 0;
  state.encounterState.cardsAcquiredThisTurn = 0;
  state.encounterState.influenceSpentThisTurn = 0;
  state.encounterState.evenCostCardsPlayedThisTurn = 0;
  state.encounterState.spellsPlayedThisTurn = 0;
  state.encounterState.itemsPlayedThisTurn = 0;
  state.encounterState.alliesPlayedThisTurn = 0;
}

export function onEncounterCardPlayed(
  state: HogwartsGameState,
  playerId: string,
  cardType: string,
  cardCost: number,
): void {
  if (!state.encounterState) return;
  const es = state.encounterState;

  if (cardCost > 0 && cardCost % 2 === 0) {
    es.evenCostCardsPlayedThisTurn += 1;
  }
  switch (cardType) {
    case 'spell':
      es.spellsPlayedThisTurn += 1;
      break;
    case 'item':
      es.itemsPlayedThisTurn += 1;
      break;
    case 'ally':
      es.alliesPlayedThisTurn += 1;
      break;
    default:
      break;
  }

  fireEncounterEffect(state, playerId, 'encounter_on_card_played', { cardType });
}

export function onEncounterCreatureDefeated(state: HogwartsGameState, playerId: string): void {
  if (!state.encounterState) return;
  state.encounterState.creaturesDefeatedThisTurn += 1;
  fireEncounterEffect(state, playerId, 'encounter_on_creature_defeated', {});
}

export function onEncounterVillainDefeated(state: HogwartsGameState, playerId: string): void {
  if (!state.encounterState) return;
  state.encounterState.villainsDefeatedThisTurn += 1;
  fireEncounterEffect(state, playerId, 'encounter_on_villain_defeated', {});
}

export function onEncounterControlAdded(state: HogwartsGameState): void {
  if (!state.encounterState) return;
  fireEncounterEffect(state, state.currentPlayerId, 'encounter_on_control_added', {});
}

export function onEncounterControlRemoved(state: HogwartsGameState, amount: number): void {
  if (!state.encounterState) return;
  state.encounterState.controlRemovedThisTurn += amount;
}

export function onEncounterCardAcquired(state: HogwartsGameState, cost: number): void {
  if (!state.encounterState) return;
  state.encounterState.cardsAcquiredThisTurn += 1;
  state.encounterState.influenceSpentThisTurn += cost;
}

export function onEncounterDiceRolled(state: HogwartsGameState): void {
  if (!state.encounterState) return;
  state.diceRolledThisTurn = (state.diceRolledThisTurn ?? 0) + 1;
  fireEncounterEffect(state, state.currentPlayerId, 'encounter_on_dice_rolled', {});
}

export function getEncounterHandDrawLimit(state: HogwartsGameState): number | null {
  const encounter = getActiveEncounter(state);
  if (!encounter?.effect) return null;
  if (encounter.effect.type !== 'encounter_limit_hand_draw') return null;
  const player = getPlayer(state, state.currentPlayerId);
  if (!player) return null;
  const threshold = Number(encounter.effect.params?.health_threshold ?? 0);
  const limit = Number(encounter.effect.params?.draw_limit ?? 5);
  if (player.health <= threshold) return limit;
  return null;
}

function fireEncounterEffect(
  state: HogwartsGameState,
  playerId: string,
  triggerType: string,
  extraParams: Record<string, unknown>,
): void {
  const encounter = getActiveEncounter(state);
  if (!encounter?.effect) return;
  if (encounter.effect.type !== triggerType) return;

  const innerEffect = encounter.effect.params?.effect as
    | { type: string; params?: Record<string, unknown> }
    | undefined;
  if (!innerEffect) return;

  const context: EffectContext = {
    sourcePlayerId: playerId,
    source: 'encounter',
    autoResolve: true,
    ...extraParams,
  };
  resolveEffects([innerEffect], context, state);
}

export function checkEncounterCompletion(state: HogwartsGameState, playerId: string): boolean {
  const encounter = getActiveEncounter(state);
  if (!encounter) return false;
  const es = state.encounterState;
  if (!es) return false;

  const condition = encounter.completion_condition;
  const params = condition.params ?? {};
  const count = Number(params.count ?? 0);
  const cardType = String(params.card_type ?? '');

  let completed = false;

  switch (condition.type) {
    case 'play_even_cost_cards':
      completed = es.evenCostCardsPlayedThisTurn >= count;
      break;
    case 'defeat_creatures': {
      const current = es.progress[encounter.id] ?? 0;
      const total = current + es.creaturesDefeatedThisTurn;
      es.progress[encounter.id] = total;
      completed = total >= count;
      break;
    }
    case 'defeat_villains_and_creatures': {
      const defeated = es.creaturesDefeatedThisTurn + es.villainsDefeatedThisTurn;
      completed = defeated >= count;
      break;
    }
    case 'acquire_cards':
      completed = es.cardsAcquiredThisTurn >= count;
      break;
    case 'play_card_types': {
      let played = 0;
      switch (cardType) {
        case 'spell':
          played = es.spellsPlayedThisTurn;
          break;
        case 'item':
          played = es.itemsPlayedThisTurn;
          break;
        case 'ally':
          played = es.alliesPlayedThisTurn;
          break;
        default:
          break;
      }
      completed = played >= count;
      break;
    }
    case 'roll_dice_total': {
      const current = es.progress[encounter.id] ?? 0;
      const total = current + (state.diceRolledThisTurn ?? 0);
      es.progress[encounter.id] = total;
      completed = total >= count;
      break;
    }
    case 'spend_influence':
      completed = es.influenceSpentThisTurn >= count;
      break;
    case 'remove_control_total': {
      const current = es.progress[encounter.id] ?? 0;
      const total = current + es.controlRemovedThisTurn;
      es.progress[encounter.id] = total;
      completed = total >= count;
      break;
    }
    default:
      break;
  }

  if (completed) {
    completeActiveEncounter(state, playerId);
    return true;
  }
  return false;
}

function completeActiveEncounter(state: HogwartsGameState, playerId: string): void {
  const es = state.encounterState;
  if (!es?.activeEncounterId) return;

  const encounter = getEncounter(es.activeEncounterId);
  es.completedEncounterIds.push(es.activeEncounterId);

  if (encounter?.reward) {
    resolveEffects(
      [encounter.reward],
      {
        sourcePlayerId: playerId,
        source: 'encounter_reward',
        autoResolve: true,
      },
      state,
    );
  }

  const idx = es.encounterDeck.indexOf(es.activeEncounterId);
  if (idx !== -1) es.encounterDeck.splice(idx, 1);

  es.activeEncounterId = es.encounterDeck[0] ?? null;
}
