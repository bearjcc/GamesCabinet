import { DEFAULT_SCORE_CEILING, SCORE_CEILINGS } from './limits.ts';

export function scoreCeilingFor(gameId: string): number {
  return SCORE_CEILINGS[gameId] ?? DEFAULT_SCORE_CEILING;
}

export function scoreWithinCeiling(gameId: string, score: number): boolean {
  return score <= scoreCeilingFor(gameId);
}
