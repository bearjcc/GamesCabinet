import { getPotion, getPotionsForSet } from './dataManager';
import { resolveEffects } from './effectResolver';
import { getPlayer, shuffleArray } from './gameState';
import type {
  EffectContext,
  HogwartsGameState,
  IngredientType,
  PotionDefinition,
  PotionInProgress,
} from './types';

export const ALL_INGREDIENT_TYPES: IngredientType[] = [
  'bicorn_horn',
  'mandrake_leaf',
  'flobber_worm',
  'hellebore',
  'lacewing',
  'wild',
];

export function getPotionSetForGame(gameNumber: number): string {
  if (gameNumber >= 12 && gameNumber <= 15) {
    const boxIndex = gameNumber - 12;
    const sets = ['potions_box1', 'potions_box2', 'potions_box3', 'potions_box4'];
    return sets[boxIndex] ?? 'potions_box1';
  }
  return '';
}

export function isPotionGame(gameNumber: number): boolean {
  return gameNumber >= 13 && gameNumber <= 15;
}

export function initializePotions(state: HogwartsGameState, gameNumber: number): void {
  if (!isPotionGame(gameNumber)) return;

  // Collect all potion cards from sets up to the current game
  const allPotionIds: string[] = [];
  for (let n = 13; n <= gameNumber; n += 1) {
    const setId = getPotionSetForGame(n);
    if (!setId) continue;
    const potions = getPotionsForSet(setId);
    for (const p of potions) {
      allPotionIds.push(p.id);
    }
  }

  if (allPotionIds.length === 0) return;

  shuffleArray(allPotionIds);

  const ingredientSupply: IngredientType[] = [];
  const standardIngredients: IngredientType[] = [
    'bicorn_horn',
    'mandrake_leaf',
    'flobber_worm',
    'hellebore',
    'lacewing',
  ];
  // Place 2 of each standard ingredient + 2 wild
  for (const ing of standardIngredients) {
    ingredientSupply.push(ing, ing);
  }
  ingredientSupply.push('wild', 'wild');
  shuffleArray(ingredientSupply);

  // Reveal top 2 potions
  const revealed: string[] = [];
  const deck = [...allPotionIds];
  for (let i = 0; i < Math.min(2, deck.length); i += 1) {
    revealed.push(deck.shift()!);
  }

  state.potionState = {
    potionDeck: deck,
    revealedPotions: revealed,
    ingredientSupply,
    shelfRequirement: 'A',
    potionsInProgress: [],
  };
}

export function gatherIngredient(
  state: HogwartsGameState,
  playerId: string,
  shelfIndex: number,
): IngredientType | null {
  if (!state.potionState) return null;
  const ps = state.potionState;
  if (shelfIndex < 0 || shelfIndex >= ps.ingredientSupply.length) return null;

  const ingredient = ps.ingredientSupply.splice(shelfIndex, 1)[0] ?? null;
  if (!ingredient) return null;

  const player = getPlayer(state, playerId);
  if (player) {
    player.gatheredIngredients.push(ingredient);
  }

  return ingredient;
}

export function placeIngredientOnPotion(
  state: HogwartsGameState,
  playerId: string,
  potionIndex: number,
  ingredientIndex: number,
): boolean {
  if (!state.potionState) return false;
  const player = getPlayer(state, playerId);
  if (!player) return false;
  if (ingredientIndex < 0 || ingredientIndex >= player.gatheredIngredients.length) return false;

  const ps = state.potionState;
  if (potionIndex < 0 || potionIndex >= ps.revealedPotions.length) return false;

  const potionId = ps.revealedPotions[potionIndex];
  if (!potionId) return false;

  const ingredient = player.gatheredIngredients.splice(ingredientIndex, 1)[0]!;

  // Find or create in-progress potion
  let inProgress = ps.potionsInProgress.find((p) => p.potionId === potionId);
  if (!inProgress) {
    inProgress = { potionId, placedIngredients: [] };
    ps.potionsInProgress.push(inProgress);
  }

  inProgress.placedIngredients.push(ingredient);

  // Check if potion is complete
  const potionDef = getPotion(potionId);
  if (potionDef && isPotionComplete(potionDef, inProgress)) {
    completePotion(state, playerId, potionIndex, false);
  }

  return true;
}

export function isPotionComplete(
  potionDef: PotionDefinition,
  inProgress: PotionInProgress,
): boolean {
  const required = [...potionDef.ingredients];
  const placed = [...inProgress.placedIngredients];

  for (let i = required.length - 1; i >= 0; i -= 1) {
    const needed = required[i]!;
    // First try exact match
    const exactIdx = placed.indexOf(needed);
    if (exactIdx !== -1) {
      placed.splice(exactIdx, 1);
      required.splice(i, 1);
      continue;
    }
    // Then try wild
    const wildIdx = placed.indexOf('wild');
    if (wildIdx !== -1) {
      placed.splice(wildIdx, 1);
      required.splice(i, 1);
      continue;
    }
    return false;
  }

  return required.length === 0;
}

export function completePotion(
  state: HogwartsGameState,
  playerId: string,
  potionIndex: number,
  useBanish: boolean,
): boolean {
  if (!state.potionState) return false;
  const ps = state.potionState;
  if (potionIndex < 0 || potionIndex >= ps.revealedPotions.length) return false;

  const potionId = ps.revealedPotions[potionIndex];
  if (!potionId) return false;

  const potionDef = getPotion(potionId);
  if (!potionDef) return false;

  const context: EffectContext = {
    sourcePlayerId: playerId,
    source: 'potion',
    autoResolve: true,
  };

  if (useBanish) {
    // Banish: resolve banish effect, card is removed from deck
    resolveEffects([potionDef.banish_effect], context, state);
  } else {
    // Play effect: resolve play effect, card goes to discard pile
    resolveEffects([potionDef.effect], context, state);
    // Add potion card to player's discard pile (it cycles through their deck)
    const player = getPlayer(state, playerId);
    if (player) {
      // Generate an instance for the potion card
      const instanceId = `potion_${potionId}_${state.nextInstanceCounter}`;
      state.nextInstanceCounter += 1;
      state.cardInstances[instanceId] = {
        instanceId,
        cardId: potionId,
        ownerPlayer: playerId,
        zone: 'discard',
      };
      player.discard.push(instanceId);
    }
  }

  ps.potionsInProgress = ps.potionsInProgress.filter((p) => p.potionId !== potionId);

  ps.revealedPotions.splice(potionIndex, 1);
  if (ps.potionDeck.length > 0) {
    ps.revealedPotions.push(ps.potionDeck.shift()!);
  }

  // Refill ingredients from discard pile if supply is empty
  refillIngredientSupply(state);

  return true;
}

function refillIngredientSupply(state: HogwartsGameState): void {
  const ps = state.potionState;
  if (!ps || ps.ingredientSupply.length > 0) return;
  const standardIngredients: IngredientType[] = [
    'bicorn_horn',
    'mandrake_leaf',
    'flobber_worm',
    'hellebore',
    'lacewing',
  ];
  for (const ing of standardIngredients) {
    ps.ingredientSupply.push(ing, ing);
  }
  ps.ingredientSupply.push('wild', 'wild');
  shuffleArray(ps.ingredientSupply);
}

export function discardIngredient(
  state: HogwartsGameState,
  playerId: string,
  ingredientIndex: number,
): boolean {
  if (!state.potionState) return false;
  const player = getPlayer(state, playerId);
  if (!player) return false;
  if (ingredientIndex < 0 || ingredientIndex >= player.gatheredIngredients.length) return false;

  // Remove ingredient (it goes back to the bottom of the supply)
  const ingredient = player.gatheredIngredients.splice(ingredientIndex, 1)[0]!;
  state.potionState.ingredientSupply.push(ingredient);
  return true;
}

export function resetPotionTurnCounters(state: HogwartsGameState): void {
  // Clear gathered ingredients for all players at end of gathering phase
  for (const player of Object.values(state.players)) {
    // Ungathered ingredients go back to supply
    if (state.potionState && player.gatheredIngredients.length > 0) {
      state.potionState.ingredientSupply.push(...player.gatheredIngredients);
      player.gatheredIngredients = [];
    }
  }
}

export function usePotion(
  state: HogwartsGameState,
  playerId: string,
  potionCardInstanceId: string,
  useBanish: boolean,
): boolean {
  const ci = state.cardInstances[potionCardInstanceId];
  if (!ci) return false;
  if (ci.ownerPlayer !== playerId) return false;

  const potionDef = getPotion(ci.cardId);
  if (!potionDef) return false;

  const context: EffectContext = {
    sourcePlayerId: playerId,
    sourceCardInstanceId: potionCardInstanceId,
    source: 'potion',
    autoResolve: false,
  };

  if (useBanish) {
    resolveEffects([potionDef.banish_effect], context, state);
    const player = getPlayer(state, playerId);
    if (player) {
      const idx = player.discard.indexOf(potionCardInstanceId);
      if (idx !== -1) player.discard.splice(idx, 1);
      const handIdx = player.hand.indexOf(potionCardInstanceId);
      if (handIdx !== -1) player.hand.splice(handIdx, 1);
    }
    delete state.cardInstances[potionCardInstanceId];
  } else {
    resolveEffects([potionDef.effect], context, state);
  }

  return true;
}
