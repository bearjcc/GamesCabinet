import { getCreatureDie } from './dataManager';
import { resolveEffect } from './effectResolver';
import { rngNextInt } from './gameState';
import type { EffectContext, HogwartsGameState } from './types';

export function rollCreatureDie(state: HogwartsGameState, context: EffectContext): void {
  const die = getCreatureDie('creature');
  if (!die || die.faces.length === 0) return;

  const faceIndex = rngNextInt(die.faces.length);
  const face = die.faces[faceIndex];
  if (!face) return;

  resolveEffect(face.effect, context, state);

  if (state.encounterState) {
    state.diceRolledThisTurn = (state.diceRolledThisTurn ?? 0) + 1;
  }
}
