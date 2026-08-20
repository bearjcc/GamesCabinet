import { getCharmForHero } from './dataManager';
import { resolveEffects } from './effectResolver';
import { getPlayer } from './gameState';
import type { CharmDefinition, CharmTier, EffectContext, HogwartsGameState } from './types';

export function isCharmGame(gameNumber: number): boolean {
  return gameNumber >= 12 && gameNumber <= 15;
}

export function initializeCharms(state: HogwartsGameState, gameNumber: number): void {
  if (!isCharmGame(gameNumber)) return;
  state.charmState = {
    activeCharmId: null,
  };
}

export function getActiveCharmTier(state: HogwartsGameState, playerId: string): CharmTier | null {
  const player = getPlayer(state, playerId);
  if (!player) return null;

  const charm = getCharmForHero(player.characterId);
  if (!charm) return null;

  // Find the lowest health threshold that the player's health is at or below
  // Tiers are ordered from highest health (weakest) to lowest health (strongest)
  // The player qualifies for a tier if their health <= health_threshold
  // We want the strongest tier they qualify for (lowest health_threshold >= their health)
  let bestTier: CharmTier | null = null;
  for (const tier of charm.tiers) {
    if (player.health <= tier.health_threshold) {
      bestTier = tier;
    }
  }

  return bestTier;
}

export function canUseCharm(state: HogwartsGameState, playerId: string): boolean {
  if (!state.charmState) return false;
  const player = getPlayer(state, playerId);
  if (!player) return false;
  if (player.charmUsedThisTurn) return false;

  const tier = getActiveCharmTier(state, playerId);
  return tier !== null;
}

export function useCharm(state: HogwartsGameState, playerId: string): boolean {
  if (!canUseCharm(state, playerId)) return false;
  const player = getPlayer(state, playerId);
  if (!player) return false;

  const tier = getActiveCharmTier(state, playerId);
  if (!tier) return false;

  const context: EffectContext = {
    sourcePlayerId: playerId,
    source: 'charm',
    autoResolve: false,
  };

  resolveEffects(tier.effects, context, state);
  player.charmUsedThisTurn = true;
  return true;
}

export function resetCharmTurnCounters(state: HogwartsGameState): void {
  for (const player of Object.values(state.players)) {
    player.charmUsedThisTurn = false;
  }
}

export function getCharmDefinition(
  state: HogwartsGameState,
  playerId: string,
): CharmDefinition | undefined {
  const player = getPlayer(state, playerId);
  if (!player) return undefined;
  return getCharmForHero(player.characterId);
}
