import { describe, expect, it } from 'vitest';
import {
  allowedRotations,
  buildPlayerDeck,
  DECK_MANIFEST,
  DECK_SIZE,
  edgesAt,
  isTrackTile,
  overlayBaseKinds,
  type Tile,
  tilePoints,
} from './tiles';

function tile(kind: Tile['kind'], id = 't'): Tile {
  return { id, kind };
}

describe('edgesAt', () => {
  it('rotates edges clockwise in quarter turns', () => {
    expect(edgesAt('curve', 0)).toEqual(['rail', 'rail', null, null]);
    expect(edgesAt('curve', 1)).toEqual([null, 'rail', 'rail', null]);
    expect(edgesAt('curve', 2)).toEqual([null, null, 'rail', 'rail']);
    expect(edgesAt('curve', 3)).toEqual(['rail', null, null, 'rail']);
  });

  it('keeps straight track through two orientations', () => {
    expect(edgesAt('straight', 0)).toEqual(['rail', null, 'rail', null]);
    expect(edgesAt('straight', 1)).toEqual([null, 'rail', null, 'rail']);
    expect(edgesAt('straight', 2)).toEqual(['rail', null, 'rail', null]);
  });

  it('normalises negative and overflowing rotations', () => {
    expect(edgesAt('curve', 4)).toEqual(edgesAt('curve', 0));
    expect(edgesAt('curve', -1)).toEqual(edgesAt('curve', 3));
  });

  it('opens all four ends of a whistlestop', () => {
    expect(edgesAt('whistlestop', 0)).toEqual(['rail', 'rail', 'rail', 'rail']);
  });

  it('runs middles horizontally and matches bridge/tunnel materials', () => {
    expect(edgesAt('bridge-mid', 0)).toEqual([null, 'bridge', null, 'bridge']);
    expect(edgesAt('tunnel-mid', 0)).toEqual([null, 'tunnel', null, 'tunnel']);
    expect(edgesAt('bridge-start', 0)).toEqual([null, 'bridge', null, 'rail']);
    expect(edgesAt('tunnel-arch', 2)).toEqual([null, 'rail', null, 'tunnel']);
  });
});

describe('allowedRotations', () => {
  it('restricts middles to horizontal and collapses symmetric tiles', () => {
    expect(allowedRotations('bridge-mid')).toEqual([0]);
    expect(allowedRotations('tunnel-mid')).toEqual([0]);
    expect(allowedRotations('straight')).toEqual([0, 1]);
    expect(allowedRotations('curve')).toEqual([0, 1, 2, 3]);
    expect(allowedRotations('town')).toEqual([0]);
  });
});

describe('isTrackTile', () => {
  it('separates track-bearing tiles from terrain', () => {
    expect(isTrackTile('straight')).toBe(true);
    expect(isTrackTile('bridge-mid')).toBe(true);
    expect(isTrackTile('town')).toBe(false);
    expect(isTrackTile('obstacle')).toBe(false);
  });
});

describe('overlayBaseKinds', () => {
  it('targets overlays per placement rules 7-8', () => {
    expect(overlayBaseKinds('junction')).toEqual(['straight', 'curve']);
    expect(overlayBaseKinds('whistlestop')).toEqual(['town']);
    expect(overlayBaseKinds('bridge-mid')).toEqual(['obstacle']);
    expect(overlayBaseKinds('tunnel-mid')).toEqual(['obstacle']);
    expect(overlayBaseKinds('straight')).toBeNull();
  });
});

describe('tilePoints', () => {
  it('scores per the printed card values', () => {
    expect(tilePoints(tile('straight'))).toBe(0);
    expect(tilePoints(tile('town'))).toBe(0);
    expect(tilePoints(tile('obstacle'))).toBe(0);
    expect(tilePoints(tile('curve'))).toBe(1);
    expect(tilePoints(tile('bridge-start'))).toBe(2);
    expect(tilePoints(tile('tunnel-arch'))).toBe(2);
    expect(tilePoints(tile('whistlestop'))).toBe(2);
    expect(tilePoints(tile('bridge-mid'))).toBe(3);
    expect(tilePoints(tile('tunnel-mid'))).toBe(3);
  });

  it('scores a junction by what it sits on (rule 7 wins over the scoring list)', () => {
    expect(tilePoints(tile('junction'), 'straight')).toBe(2);
    expect(tilePoints(tile('junction'), 'curve')).toBe(1);
  });
});

describe('buildPlayerDeck', () => {
  it('builds a 55-card deck with unique ids', () => {
    const deck = buildPlayerDeck();
    expect(deck).toHaveLength(DECK_SIZE);
    expect(new Set(deck.map((t) => t.id)).size).toBe(DECK_SIZE);
    expect(DECK_MANIFEST.reduce((n, m) => n + m.count, 0)).toBe(DECK_SIZE);
  });

  it('keeps straight most common, curve second, and middles rare', () => {
    const deck = buildPlayerDeck();
    const count = (kind: Tile['kind']) => deck.filter((t) => t.kind === kind).length;
    expect(count('straight')).toBe(20);
    expect(count('curve')).toBe(14);
    expect(count('bridge-mid')).toBe(1);
    expect(count('tunnel-mid')).toBe(1);
    expect(count('obstacle')).toBe(3);
  });

  it('marks obstacle variants for advanced-mode anchoring', () => {
    const obstacles = buildPlayerDeck().filter((t) => t.kind === 'obstacle');
    expect(obstacles.map((o) => o.variant).sort()).toEqual(['mountain', 'river', 'river']);
  });
});
