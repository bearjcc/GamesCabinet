import { describe, expect, it } from 'vitest';
import { type Board, emptyBoard, placeTile } from './grid';
import {
  type BoardMetrics,
  boardMetrics,
  buildObjectiveDeck,
  objectiveDef,
  scoreObjective,
} from './objectives';
import type { Tile } from './tiles';

let seq = 0;
function tile(kind: Tile['kind'], variant?: Tile['variant']): Tile {
  seq += 1;
  return { id: `t${seq}`, kind, variant };
}

function metrics(partial: Partial<BoardMetrics> = {}): BoardMetrics {
  return {
    trackCards: 0,
    whistlestops: 0,
    whistlestopsAndTowns: 0,
    tunnelsAndBridges: 0,
    tunnelCards: 0,
    longestTunnel: 0,
    longestBridge: 0,
    routeCards: 0,
    filled: 0,
    ...partial,
  };
}

describe('buildObjectiveDeck', () => {
  it('deals the 26-card July manifest plus face-up bonuses', () => {
    const deck = buildObjectiveDeck();
    expect(deck.filter((id) => id === 'most-tracks')).toHaveLength(4);
    expect(deck.filter((id) => id === 'mayor')).toHaveLength(4);
    expect(deck.filter((id) => id === 'longest-track')).toHaveLength(4);
    expect(deck.filter((id) => id === 'non-stop')).toHaveLength(2);
    expect(deck).toHaveLength(26);
  });

  it('keeps bonus objectives out of the dealt deck', () => {
    const deck = buildObjectiveDeck();
    expect(deck).not.toContain('speed-layer');
    expect(deck).not.toContain('land-baron');
    expect(objectiveDef('speed-layer').bonus).toBe(true);
  });

  it('throws on unknown objective ids', () => {
    expect(() => objectiveDef('nope' as never)).toThrow(/unknown objective/);
  });
});

describe('boardMetrics', () => {
  it('measures kept route cards, towns, chains, and filled slots', () => {
    const board: Board = emptyBoard();
    placeTile(board, tile('town'), 1, 0, 0);
    placeTile(board, tile('whistlestop'), 1, 0, 0);
    placeTile(board, tile('tunnel-arch'), 1, 1, 0); // tunnel E, rail W
    placeTile(board, tile('obstacle', 'mountain'), 1, 2, 0);
    placeTile(board, tile('tunnel-mid'), 1, 2, 0);
    const m = boardMetrics(board);
    expect(m.whistlestops).toBe(1);
    expect(m.whistlestopsAndTowns).toBe(2);
    expect(m.tunnelCards).toBe(2);
    expect(m.tunnelsAndBridges).toBe(2);
    expect(m.longestTunnel).toBe(2);
    expect(m.longestBridge).toBe(0);
    expect(m.routeCards).toBe(3);
    expect(m.filled).toBe(3);
  });
});

describe('scoreObjective', () => {
  it('scores countable objectives from your own board', () => {
    const boards = [metrics({ whistlestopsAndTowns: 3, tunnelsAndBridges: 2 }), metrics()];
    expect(scoreObjective('mayor', 0, boards)).toBe(6);
    expect(scoreObjective('mountain-express', 0, boards)).toBe(4);
    expect(scoreObjective('mayor', 1, boards)).toBe(0);
  });

  it('scores Non-Stop only with zero whistlestops', () => {
    const boards = [metrics({ whistlestops: 0 }), metrics({ whistlestops: 1 })];
    expect(scoreObjective('non-stop', 0, boards)).toBe(3);
    expect(scoreObjective('non-stop', 1, boards)).toBe(0);
  });

  it('scores comparative objectives only for the outright or tied best', () => {
    const boards = [
      metrics({ trackCards: 8, longestBridge: 3 }),
      metrics({ trackCards: 8, longestBridge: 3 }),
      metrics({ trackCards: 5, longestBridge: 2 }),
    ];
    // Most Tracks: tie -> nobody scores.
    expect(scoreObjective('most-tracks', 0, boards)).toBe(0);
    expect(scoreObjective('most-tracks', 2, boards)).toBe(0);
    // Gorge-ous: tie -> both score.
    expect(scoreObjective('gorge-ous', 0, boards)).toBe(5);
    expect(scoreObjective('gorge-ous', 1, boards)).toBe(5);
    expect(scoreObjective('gorge-ous', 2, boards)).toBe(0);
  });

  it('never scores a zero showing even when everyone has none', () => {
    const boards = [metrics(), metrics()];
    expect(scoreObjective('subway', 0, boards)).toBe(0);
    expect(scoreObjective('inner-city', 1, boards)).toBe(0);
  });

  it('scores Speed Layer for the first connector only', () => {
    const boards = [metrics(), metrics()];
    expect(scoreObjective('speed-layer', 0, boards, 0)).toBe(5);
    expect(scoreObjective('speed-layer', 1, boards, 0)).toBe(0);
    expect(scoreObjective('speed-layer', 0, boards, undefined)).toBe(0);
  });

  it('scores Rock Blaster ties for both holders', () => {
    const boards = [metrics({ longestTunnel: 3 }), metrics({ longestTunnel: 3 })];
    expect(scoreObjective('rock-blaster', 0, boards)).toBe(5);
    expect(scoreObjective('rock-blaster', 1, boards)).toBe(5);
  });

  it('scores Longest Track and Land Baron comparatively, ties to nobody', () => {
    const boards = [
      metrics({ routeCards: 9, filled: 12 }),
      metrics({ routeCards: 9, filled: 10 }),
      metrics({ routeCards: 7, filled: 12 }),
    ];
    expect(scoreObjective('longest-track', 0, boards)).toBe(0);
    expect(scoreObjective('longest-track', 2, boards)).toBe(0);
    expect(scoreObjective('land-baron', 0, boards)).toBe(0);
    expect(scoreObjective('land-baron', 2, boards)).toBe(0);
    expect(
      scoreObjective(
        'land-baron',
        0,
        boards.map((b, i) => (i === 0 ? b : metrics())),
      ),
    ).toBe(5);
  });
});
