/**
 * TRACKS PLACEHOLDERS — values the rules never pin down.
 *
 * Every constant in this file is a stand-in until Bear supplies the real
 * number. The canonical rules (2021-05-18 "Rail Co. TRACKS Rules") only say:
 * - one 55-card deck per player; straight is "most common", curve "second
 *   most common", middle bridge / middle tunnel are "rare";
 * - objective cards: "a total of 36+ including duplicates" (no per-type count);
 * - the advanced board side has "2 obstacles" and start/destination on
 *   different rows (positions never given);
 * - "I have not yet designed the boards, or the scoring sheets";
 * - no card art survives (straight/curve art was commissioned, not in vault).
 * Change values here only; nothing else hard-codes them.
 */
import type { ObstacleVariant, TileKind } from './tiles';

/** PLACEHOLDER: per-type counts in one 55-card deck (sums to 55). */
export const PLACEHOLDER_DECK_MANIFEST: {
  kind: TileKind;
  count: number;
  variants?: ObstacleVariant[];
}[] = [
  { kind: 'straight', count: 20 },
  { kind: 'curve', count: 14 },
  { kind: 'junction', count: 6 },
  { kind: 'bridge-start', count: 2 },
  { kind: 'bridge-mid', count: 1 },
  { kind: 'tunnel-arch', count: 2 },
  { kind: 'tunnel-mid', count: 1 },
  { kind: 'town', count: 4 },
  { kind: 'whistlestop', count: 2 },
  { kind: 'obstacle', count: 3, variants: ['river', 'mountain', 'river'] },
];

/**
 * PLACEHOLDER: copies of each objective card in the objective deck
 * (rules: "36+ including duplicates"; these sum to 26 — below 36 on purpose
 * until Bear gives real counts). Bonus objectives are single face-up cards.
 */
export const PLACEHOLDER_OBJECTIVE_COUNTS = {
  'most-tracks': 4,
  'inner-city': 2,
  mayor: 4,
  'mountain-express': 4,
  subway: 2,
  'rock-blaster': 2,
  'gorge-ous': 2,
  'non-stop': 2,
  'longest-track': 4,
  'speed-layer': 1,
  'land-baron': 1,
} as const;

/**
 * PLACEHOLDER: advanced board side. Not playable in milestone 1 — the
 * positions and the start/destination rows are unknown. Shape kept so the
 * advanced mode can be wired once Bear supplies the board.
 */
export const PLACEHOLDER_ADVANCED_SIDE = {
  startRow: 0,
  destinationRow: 2,
  obstacles: [
    { row: 1, col: 3, variant: 'mountain' as ObstacleVariant },
    { row: 1, col: 5, variant: 'river' as ObstacleVariant },
  ],
};

/** PLACEHOLDER: board and score-sheet design — the cabinet draws a plain grid and an on-screen score table. */
export const PLACEHOLDER_BOARD_DESIGN = 'plain-grid';

/** PLACEHOLDER: art — cards are drawn as vector glyphs (TileGlyph), no Kenney/commissioned art yet. */
export const PLACEHOLDER_ART = 'vector-glyphs';
