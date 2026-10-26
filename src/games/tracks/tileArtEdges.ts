/**
 * Documented base (rotation 0) track connections for Bear's card art.
 * Must stay aligned with TILE_EDGES in tiles.ts and edgesAt().
 */
import type { Edge, TileKind } from './tiles';
import { allowedRotations, edgesAt } from './tiles';

export type TileArtFace = {
  kind: TileKind;
  variant?: 'river' | 'mountain';
  /** Player-facing note for the base orientation. */
  note: string;
  /** N, E, S, W at rotation 0. */
  edges: [Edge, Edge, Edge, Edge];
};

export const TILE_ART_FACES: TileArtFace[] = [
  {
    kind: 'straight',
    note: 'Vertical rail (N and S)',
    edges: ['rail', null, 'rail', null],
  },
  {
    kind: 'curve',
    note: 'Quarter arc N to E (arc centre at top-right)',
    edges: ['rail', 'rail', null, null],
  },
  {
    kind: 'junction',
    note: 'W-E through line with branch to N',
    edges: ['rail', 'rail', null, 'rail'],
  },
  {
    kind: 'bridge-start',
    note: 'Land rail at W, bridge deck at E',
    edges: [null, 'bridge', null, 'rail'],
  },
  {
    kind: 'bridge-mid',
    note: 'Bridge deck W to E',
    edges: [null, 'bridge', null, 'bridge'],
  },
  {
    kind: 'tunnel-arch',
    note: 'Rail at W, tunnel portal at E',
    edges: [null, 'tunnel', null, 'rail'],
  },
  {
    kind: 'tunnel-mid',
    note: 'Tunnel bore W to E',
    edges: [null, 'tunnel', null, 'tunnel'],
  },
  {
    kind: 'whistlestop',
    note: 'Four-way crossing',
    edges: ['rail', 'rail', 'rail', 'rail'],
  },
  {
    kind: 'obstacle',
    variant: 'river',
    note: 'River only, no track',
    edges: [null, null, null, null],
  },
  {
    kind: 'obstacle',
    variant: 'mountain',
    note: 'Mountain only, no track',
    edges: [null, null, null, null],
  },
];

function rotateEdgesClockwise(
  base: [Edge, Edge, Edge, Edge],
  quarterTurns: number,
): [Edge, Edge, Edge, Edge] {
  const r = ((quarterTurns % 4) + 4) % 4;
  return [base[(4 - r) % 4], base[(5 - r) % 4], base[(6 - r) % 4], base[(7 - r) % 4]];
}

export function artEdgesAt(face: TileArtFace, rot: number): [Edge, Edge, Edge, Edge] {
  return rotateEdgesClockwise(face.edges, rot);
}

/** True when documented art connections match the rules engine at every legal rotation. */
export function artMatchesEngine(face: TileArtFace, rot: number): boolean {
  return edgesAt(face.kind, rot).every((edge, i) => edge === artEdgesAt(face, rot)[i]);
}

export function allArtEngineRotations(): { face: TileArtFace; rot: number }[] {
  const out: { face: TileArtFace; rot: number }[] = [];
  for (const face of TILE_ART_FACES) {
    for (const rot of allowedRotations(face.kind)) {
      out.push({ face, rot });
    }
  }
  return out;
}
