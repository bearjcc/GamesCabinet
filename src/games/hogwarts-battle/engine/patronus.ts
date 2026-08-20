import { getPatronus, getPatronusForHero } from './dataManager';
import { resolveEffects } from './effectResolver';
import type { EffectContext, HogwartsGameState } from './types';

export function canUsePatronus(state: HogwartsGameState, playerId: string): boolean {
  const player = state.players[playerId];
  if (!player) return false;
  if (!player.patronusId) return false;
  if (player.patronusUsedThisTurn) return false;
  const patronus = getPatronus(player.patronusId);
  if (!patronus) return false;
  if (patronus.trigger !== 'manual') return false;
  return true;
}

export function usePatronus(state: HogwartsGameState, playerId: string): boolean {
  if (!canUsePatronus(state, playerId)) return false;
  const player = state.players[playerId];
  if (!player) return false;

  const patronus = getPatronus(player.patronusId);
  if (!patronus) return false;

  const context: EffectContext = {
    sourcePlayerId: playerId,
    source: 'patronus',
    autoResolve: true,
  };

  resolveEffects(patronus.effects, context, state);
  player.patronusUsedThisTurn = true;
  return true;
}

export function assignPatronus(state: HogwartsGameState, playerId: string, heroId: string): void {
  const patronus = getPatronusForHero(heroId);
  const player = state.players[playerId];
  if (player && patronus) {
    player.patronusId = patronus.id;
  }
}
