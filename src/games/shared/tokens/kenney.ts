/** Kenney Board Game Icons (CC0) - individual SVGs. Same pack as dice and chess. */
export const KENNEY_ICONS_DIR = '/assets/kenney/board-game-icons/Vector/Icons';

export type KenneyTokenVariant = 'disc' | 'chip' | 'pawn';

export function kenneyIcon(name: string): string {
  return `${KENNEY_ICONS_DIR}/${name}.svg`;
}

/**
 * Silhouette for Token mask. Solid discs stay CSS so Go / Reversi / C4
 * read as stones, not ring-chips.
 */
export function kenneyTokenGlyph(variant: KenneyTokenVariant): string | null {
  if (variant === 'pawn') return kenneyIcon('pawn');
  if (variant === 'chip') return kenneyIcon('token');
  return null;
}

export const KENNEY_CROWN = kenneyIcon('crown_a');
export const KENNEY_HIT = kenneyIcon('fire');
export const KENNEY_MISS = kenneyIcon('token');
export const KENNEY_SUNK = kenneyIcon('skull');
export const KENNEY_LADDER = kenneyIcon('pawn_up');
export const KENNEY_SNAKE = kenneyIcon('arrow_right_curve');
