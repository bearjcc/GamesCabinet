import type { DieFaceValue } from './types';

/** Kenney Board Game Icons dice faces (CC0) - individual SVGs. */
export const KENNEY_DICE_DIR = '/assets/kenney/board-game-icons/Vector/Icons';

/** Optional skull face for games that override the one-pip (ADR Decision 5). */
export const KENNEY_DICE_SKULL = `${KENNEY_DICE_DIR}/dice_skull.svg`;

export function kenneyDieFacePath(face: DieFaceValue): string {
  return `${KENNEY_DICE_DIR}/dice_${face}.svg`;
}

/** Default Kenney SVG for a d6 face. */
export function kenneyDieFaceAsset(face: DieFaceValue): string {
  return kenneyDieFacePath(face);
}
