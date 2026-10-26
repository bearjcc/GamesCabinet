import { describe, expect, it } from 'vitest';
import {
  allArtEngineRotations,
  artEdgesAt,
  artMatchesEngine,
  TILE_ART_FACES,
} from './tileArtEdges';
import { edgesAt } from './tiles';

describe('tile art base edges vs engine', () => {
  it('documents every shipped face', () => {
    expect(TILE_ART_FACES.map((f) => (f.variant ? `${f.kind}-${f.variant}` : f.kind))).toEqual([
      'straight',
      'curve',
      'junction',
      'bridge-start',
      'bridge-mid',
      'tunnel-arch',
      'tunnel-mid',
      'whistlestop',
      'obstacle-river',
      'obstacle-mountain',
    ]);
  });

  it('matches edgesAt at rotation 0 for each face', () => {
    for (const face of TILE_ART_FACES) {
      expect(edgesAt(face.kind, 0)).toEqual(face.edges);
    }
  });

  it('matches edgesAt at every allowed rotation', () => {
    for (const { face, rot } of allArtEngineRotations()) {
      expect(artMatchesEngine(face, rot)).toBe(true);
      expect(artEdgesAt(face, rot)).toEqual(edgesAt(face.kind, rot));
    }
  });
});
