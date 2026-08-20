/**
 * TRACKS tile model and deck content.
 * Rules source: 2021-05-18 "Rail Co. TRACKS Rules" email (verbatim in the vault).
 * The per-type 55-card manifest exists nowhere in readable text (it lives in the
 * unreadable 2021-07-03 docx); DECK_MANIFEST below is rules-as-data tuned to the
 * written hints: straight most common, curve second, middle bridge/tunnel rare.
 */

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
  | 'town'
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
  town: [null, null, null, null],
  // House ruling (Bear, 2026-08): a whistlestop on a town opens all four ends.
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
  town: [0],
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

/** Overlay targets: junction on straight/curve (rule 7), middles on obstacles (rule 8). */
export function overlayBaseKinds(kind: TileKind): TileKind[] | null {
  if (kind === 'junction') return ['straight', 'curve'];
  if (kind === 'whistlestop') return ['town'];
  if (kind === 'bridge-mid' || kind === 'tunnel-mid') return ['obstacle'];
  return null;
}

/** Card points per the scoring list; junction-on-curve is handled at scoring time. */
export function tilePoints(tile: Tile, baseKind?: TileKind): number {
  switch (tile.kind) {
    case 'curve':
      return 1;
    case 'junction':
      // Rules contradict themselves: the scoring list says junction 1, but rule 7
      // says "1 point for a junction on top of a curve, not 2". The specific
      // placement rule wins: 2 on a straight, 1 on a curve.
      return baseKind === 'curve' ? 1 : 2;
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

/** Rules-as-data: per-type counts summing to one 55-card deck. */
export const DECK_MANIFEST: { kind: TileKind; count: number; variants?: ObstacleVariant[] }[] = [
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

export const DECK_SIZE = 55;

/** One player's 55-card deck with unique ids. */
export function buildPlayerDeck(): Tile[] {
  const deck: Tile[] = [];
  for (const { kind, count, variants } of DECK_MANIFEST) {
    for (let i = 0; i < count; i++) {
      deck.push({ id: `${kind}-${i}`, kind, variant: variants?.[i] });
    }
  }
  return deck;
}
