/**
 * TRACKS tile model and deck content.
 */
import {
  type DeckManifestEntry,
  PLACEHOLDER_DECK_MANIFEST,
  PLACEHOLDER_DECK_MANIFEST_55,
} from './placeholders';

export type EdgeMat = 'rail' | 'bridge' | 'tunnel';
/** One cell edge: a materialised connection or nothing. Edges are N,E,S,W order. */
export type Edge = EdgeMat | null;

export type TileKind =
  | 'straight'
  | 'curve'
  | 'junction'
  | 'bridge-start'
  | 'bridge-mid'
  | 'tunnel-arch'
  | 'tunnel-mid'
  | 'whistlestop'
  | 'obstacle';

export type ObstacleVariant = 'river' | 'mountain';

export type Tile = {
  id: string;
  kind: TileKind;
  /** Obstacles only: easy mode anchors either middle on either variant. */
  variant?: ObstacleVariant;
};

/** Base edges at rotation 0, clockwise from north. */
const TILE_EDGES: Record<TileKind, [Edge, Edge, Edge, Edge]> = {
  straight: ['rail', null, 'rail', null],
  curve: ['rail', 'rail', null, null],
  junction: ['rail', 'rail', null, 'rail'],
  'bridge-start': [null, 'bridge', null, 'rail'],
  'bridge-mid': [null, 'bridge', null, 'bridge'],
  'tunnel-arch': [null, 'tunnel', null, 'rail'],
  'tunnel-mid': [null, 'tunnel', null, 'tunnel'],
  whistlestop: ['rail', 'rail', 'rail', 'rail'],
  obstacle: [null, null, null, null],
};

/**
 * Distinct rotations per kind (quarter-turns clockwise from base).
 * Middle bridge/tunnel are horizontal-only per rule 4; symmetric kinds collapse.
 */
const TILE_ROTATIONS: Record<TileKind, number[]> = {
  straight: [0, 1],
  curve: [0, 1, 2, 3],
  junction: [0, 1, 2, 3],
  'bridge-start': [0, 1, 2, 3],
  'bridge-mid': [0],
  'tunnel-arch': [0, 1, 2, 3],
  'tunnel-mid': [0],
  whistlestop: [0],
  obstacle: [0],
};

export function allowedRotations(kind: TileKind): number[] {
  return TILE_ROTATIONS[kind];
}

export function edgesAt(kind: TileKind, rot: number): [Edge, Edge, Edge, Edge] {
  const base = TILE_EDGES[kind];
  const r = ((rot % 4) + 4) % 4;
  return [base[(4 - r) % 4], base[(5 - r) % 4], base[(6 - r) % 4], base[(7 - r) % 4]];
}

/** True when the tile carries any track/bridge/tunnel edge. */
export function isTrackTile(kind: TileKind): boolean {
  return TILE_EDGES[kind].some((e) => e !== null);
}

/** Optional overlay targets (middles may still stack on obstacles). */
export function overlayBaseKinds(kind: TileKind): TileKind[] | null {
  if (kind === 'bridge-mid' || kind === 'tunnel-mid') return ['obstacle'];
  return null;
}

export type TilePointOptions = { junctionPoints?: 1 | 2 };

/** Card points per the scoring list; junction value is a playtest variant. */
export function tilePoints(tile: Tile, opts: TilePointOptions = {}): number {
  const junctionPts = opts.junctionPoints ?? 2;
  switch (tile.kind) {
    case 'curve':
      return 1;
    case 'junction':
      return junctionPts;
    case 'bridge-start':
    case 'tunnel-arch':
    case 'whistlestop':
      return 2;
    case 'bridge-mid':
    case 'tunnel-mid':
      return 3;
    default:
      return 0;
  }
}

/** PLACEHOLDER counts — see placeholders.ts. */
export const DECK_MANIFEST = PLACEHOLDER_DECK_MANIFEST;

export const DECK_SIZE = PLACEHOLDER_DECK_MANIFEST.reduce((n, m) => n + m.count, 0);

export const DECK_SIZE_55 = PLACEHOLDER_DECK_MANIFEST_55.reduce((n, m) => n + m.count, 0);

/** One player's deck with unique ids. */
export function buildPlayerDeck(manifest: DeckManifestEntry[] = DECK_MANIFEST): Tile[] {
  const deck: Tile[] = [];
  for (const { kind, count, variants } of manifest) {
    for (let i = 0; i < count; i++) {
      deck.push({ id: `${kind}-${i}`, kind, variant: variants?.[i] });
    }
  }
  return deck;
}
