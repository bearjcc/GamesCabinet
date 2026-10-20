import { describe, expect, it } from 'vitest';
import { type Board, emptyBoard, placeTile, START_ROW } from './grid';
import {
  type BoardMetrics,
  boardMetrics,
  buildObjectiveDeck,
  comparativeIdsForState,
  initComparativeRaces,
  objectiveDef,
  publicObjectivesForPlayers,
  recordComparativeRace,
  scoreObjective,
  scorePublicObjectives,
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
  it('deals the secret July manifest (public cards excluded)', () => {
    const deck = buildObjectiveDeck();
    expect(deck.filter((id) => id === 'most-tracks')).toHaveLength(0);
    expect(deck.filter((id) => id === 'mayor')).toHaveLength(4);
    expect(deck.filter((id) => id === 'longest-track')).toHaveLength(0);
    expect(deck.filter((id) => id === 'non-stop')).toHaveLength(2);
    expect(deck).toHaveLength(18);
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
  it('measures kept route cards, whistlestops, chains, and filled slots', () => {
    const board: Board = emptyBoard();
    placeTile(board, tile('whistlestop'), START_ROW, 0, 0);
    placeTile(board, tile('tunnel-arch'), START_ROW, 1, 0);
    placeTile(board, tile('obstacle', 'mountain'), START_ROW, 2, 0);
    placeTile(board, tile('tunnel-mid'), START_ROW, 2, 0);
    const m = boardMetrics(board);
    expect(m.whistlestops).toBe(1);
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
    const boards = [metrics({ whistlestops: 3, tunnelsAndBridges: 2 }), metrics()];
    expect(scoreObjective('mayor', 0, boards)).toBe(6);
    expect(scoreObjective('mountain-express', 0, boards)).toBe(4);
    expect(scoreObjective('mayor', 1, boards)).toBe(0);
    expect(scoreObjective('mountain-express', 1, boards)).toBe(0);
    expect(scoreObjective('mayor', 0, [metrics({ whistlestops: 0 })])).toBe(0);
  });

  it('scores Non-Stop only with zero whistlestops', () => {
    const boards = [metrics({ whistlestops: 0 }), metrics({ whistlestops: 1 })];
    expect(scoreObjective('non-stop', 0, boards)).toBe(3);
    expect(scoreObjective('non-stop', 1, boards)).toBe(0);
  });

  it('awards comparative objectives to the first player to hit the lead', () => {
    const boards = [
      metrics({ trackCards: 8, longestBridge: 3 }),
      metrics({ trackCards: 8, longestBridge: 3 }),
      metrics({ trackCards: 5, longestBridge: 2 }),
    ];
    const races = initComparativeRaces(['most-tracks', 'gorge-ous']);
    recordComparativeRace(races, boards, '0');
    recordComparativeRace(races, boards, '1');
    expect(scoreObjective('most-tracks', 0, boards, { races })).toBe(5);
    expect(scoreObjective('most-tracks', 1, boards, { races })).toBe(0);
    expect(scoreObjective('gorge-ous', 0, boards, { races })).toBe(5);
    expect(scoreObjective('gorge-ous', 1, boards, { races })).toBe(0);
  });

  it('never scores a zero showing even when everyone has none', () => {
    const boards = [metrics(), metrics()];
    expect(scoreObjective('subway', 0, boards)).toBe(0);
    expect(scoreObjective('inner-city', 1, boards)).toBe(0);
  });

  it('adds Speed Layer and Land Baron to the public row at 4+ players', () => {
    expect(publicObjectivesForPlayers(3)).toEqual(['longest-track', 'most-tracks']);
    expect(publicObjectivesForPlayers(4)).toEqual([
      'longest-track',
      'most-tracks',
      'speed-layer',
      'land-baron',
    ]);
  });

  it('includes Land Baron races only at 4+ players', () => {
    expect(comparativeIdsForState([], 3)).not.toContain('land-baron');
    expect(comparativeIdsForState([], 4)).toContain('land-baron');
  });

  it('scores public objectives to the round leader', () => {
    const boards = [metrics({ routeCards: 9 }), metrics({ routeCards: 4 })];
    const races = initComparativeRaces(['longest-track']);
    recordComparativeRace(races, boards, '0');
    const scores = [0, 0];
    scorePublicObjectives(['longest-track'], boards, scores, races);
    expect(scores).toEqual([5, 0]);
  });

  it('scores public Speed Layer to the first connector', () => {
    const boards = [metrics(), metrics()];
    const scores = [0, 0];
    scorePublicObjectives(['speed-layer'], boards, scores, {}, 1);
    const noConnect: number[] = [0, 0];
    scorePublicObjectives(['speed-layer'], boards, noConnect, {}, undefined);
    expect(noConnect).toEqual([0, 0]);
    expect(scores).toEqual([0, 5]);
  });

  it('reinitialises a missing race bucket', () => {
    const races: Partial<Record<'most-tracks', import('./objectives').ComparativeRace>> = {
      'most-tracks': undefined,
    };
    recordComparativeRace(races, [metrics({ trackCards: 2 }), metrics()], '0');
    expect(races['most-tracks']?.order).toEqual(['0']);
  });

  it('pays nobody on a comparative tie without race order', () => {
    const boards = [metrics({ trackCards: 4 }), metrics({ trackCards: 4 })];
    expect(scoreObjective('most-tracks', 0, boards, { races: {} })).toBe(0);
    expect(
      scoreObjective('most-tracks', 0, boards, {
        races: { 'most-tracks': { value: 4, order: ['2'] } },
      }),
    ).toBe(0);
  });

  it('ignores duplicate race entries for the same player', () => {
    const races = initComparativeRaces(['most-tracks']);
    const boards = [metrics({ trackCards: 3 }), metrics()];
    recordComparativeRace(races, boards, '0');
    recordComparativeRace(races, boards, '0');
    expect(races['most-tracks']?.order).toEqual(['0']);
  });

  it('scores Speed Layer for the first connector only', () => {
    const boards = [metrics(), metrics()];
    expect(scoreObjective('speed-layer', 0, boards, { connectedFirst: 0 })).toBe(5);
    expect(scoreObjective('speed-layer', 1, boards, { connectedFirst: 0 })).toBe(0);
    expect(scoreObjective('speed-layer', 0, boards, { connectedFirst: undefined })).toBe(0);
  });
});
