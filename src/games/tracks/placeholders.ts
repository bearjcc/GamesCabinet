/**
 * TRACKS PLACEHOLDERS — values the rules never pin down.
 *
 * Every constant in this file is a stand-in until Bear supplies the real
 * number. Change values here only; nothing else hard-codes them.
 */
import type { ObstacleVariant, TileKind } from './tiles';

export type DeckManifestEntry = {
  kind: TileKind;
  count: number;
  variants?: ObstacleVariant[];
};

/** PLACEHOLDER: ~50-card deck (sim compares against PLACEHOLDER_DECK_MANIFEST_55). */
export const PLACEHOLDER_DECK_MANIFEST: DeckManifestEntry[] = [
  { kind: 'straight', count: 17 },
  { kind: 'curve', count: 14 },
  { kind: 'junction', count: 5 },
  { kind: 'bridge-start', count: 2 },
  { kind: 'bridge-mid', count: 1 },
  { kind: 'tunnel-arch', count: 2 },
  { kind: 'tunnel-mid', count: 1 },
  { kind: 'whistlestop', count: 5 },
  { kind: 'obstacle', count: 3, variants: ['river', 'mountain', 'river'] },
];

/**
 * PROPOSAL (not wired to sims): route-heavy ~50-card mix targeting ~15–30 turn solo
 * connects with oracle play. Bear must approve before replacing PLACEHOLDER_DECK_MANIFEST.
 */
export const PLACEHOLDER_DECK_MANIFEST_ROUTE_PROPOSAL: DeckManifestEntry[] = [
  { kind: 'straight', count: 24 },
  { kind: 'curve', count: 12 },
  { kind: 'junction', count: 4 },
  { kind: 'bridge-start', count: 2 },
  { kind: 'bridge-mid', count: 1 },
  { kind: 'tunnel-arch', count: 2 },
  { kind: 'tunnel-mid', count: 1 },
  { kind: 'whistlestop', count: 2 },
  { kind: 'obstacle', count: 2, variants: ['river', 'mountain'] },
];

/** PLACEHOLDER: alternate 55-card mix for manufacturing / balance sims. */
export const PLACEHOLDER_DECK_MANIFEST_55: DeckManifestEntry[] = [
  { kind: 'straight', count: 20 },
  { kind: 'curve', count: 14 },
  { kind: 'junction', count: 6 },
  { kind: 'bridge-start', count: 2 },
  { kind: 'bridge-mid', count: 1 },
  { kind: 'tunnel-arch', count: 2 },
  { kind: 'tunnel-mid', count: 1 },
  { kind: 'whistlestop', count: 6 },
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

/** Face-up comparative objectives scored each round (ticket-style public goals). */
export const PUBLIC_OBJECTIVE_IDS = ['longest-track', 'most-tracks'] as const;

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

/** Bear tunnel tiles plus composed WebP faces for all card kinds. */
export const PLACEHOLDER_ART = 'bear-tracks-webp';
