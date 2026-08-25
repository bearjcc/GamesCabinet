import { KENNEY_ICONS_DIR, kenneyIcon } from '../tokens';
import type { DieFaceValue } from './types';

/** Kenney Board Game Icons dice faces (CC0) - individual SVGs. */
export const KENNEY_DICE_DIR = KENNEY_ICONS_DIR;

/** Optional skull face for games that override the one-pip (ADR Decision 5). */
export const KENNEY_DICE_SKULL = kenneyIcon('dice_skull');

export function kenneyDieFacePath(face: DieFaceValue): string {
  return kenneyIcon(`dice_${face}`);
}

/** Default Kenney SVG for a d6 face. */
export function kenneyDieFaceAsset(face: DieFaceValue): string {
  return kenneyDieFacePath(face);
}
