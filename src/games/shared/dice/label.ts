import type { DieFaceValue } from './types';

/** Accessible label for a face, optionally noting held state. */
export function formatDieLabel(face: DieFaceValue, held?: boolean): string {
  return held ? `${face}, held` : String(face);
}
