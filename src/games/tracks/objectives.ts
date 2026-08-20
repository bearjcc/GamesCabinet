/**
 * TRACKS objective deck. Manifest from the 2021-07-16 "Rail Co Objectives"
 * spreadsheet image (newest; supersedes the "36+" note in the May rules).
 * Tie handling is per the sheet; Longest Track has no tie note, so it follows
 * the majority convention (no one scores on a tie).
 */
import {
  type Board,
  boardCounts,
  filledSlots,
  keptCells,
  longestMaterialRun,
  reachableFromStart,
} from './grid';

export type ObjectiveId =
  | 'most-tracks'
  | 'inner-city'
  | 'mayor'
  | 'mountain-express'
  | 'subway'
  | 'rock-blaster'
  | 'gorge-ous'
  | 'non-stop'
  | 'longest-track'
  // Bonus objectives (4+ players, face up, one scorer per round).
  | 'speed-layer'
  | 'land-baron';

export type TieRule = 'nobody' | 'both';

export type ObjectiveDef = {
  id: ObjectiveId;
  name: string;
  points: number;
  count: number;
  tie: TieRule;
  text: string;
  bonus?: boolean;
};

export const OBJECTIVES: ObjectiveDef[] = [
  {
    id: 'most-tracks',
    name: 'Most Tracks',
    points: 5,
    count: 4,
    tie: 'nobody',
    text: 'Most track cards played',
  },
  {
    id: 'inner-city',
    name: 'Inner City',
    points: 5,
    count: 2,
    tie: 'nobody',
    text: 'Most whistlestops',
  },
  {
    id: 'mayor',
    name: 'Mayor',
    points: 2,
    count: 4,
    tie: 'both',
    text: '+2 per whistlestop or town',
  },
  {
    id: 'mountain-express',
    name: 'Mountain Express',
    points: 2,
    count: 4,
    tie: 'both',
    text: '+2 per tunnel or bridge',
  },
  { id: 'subway', name: 'Subway', points: 5, count: 2, tie: 'nobody', text: 'Most tunnel cards' },
  {
    id: 'rock-blaster',
    name: 'Rock Blaster',
    points: 5,
    count: 2,
    tie: 'both',
    text: 'Longest tunnel',
  },
  { id: 'gorge-ous', name: 'Gorge-ous', points: 5, count: 2, tie: 'both', text: 'Longest bridge' },
  { id: 'non-stop', name: 'Non-Stop', points: 3, count: 2, tie: 'both', text: 'No whistlestops' },
  {
    id: 'longest-track',
    name: 'Longest Track',
    points: 5,
    count: 4,
    tie: 'nobody',
    text: 'Most cards in route',
  },
  {
    id: 'speed-layer',
    name: 'Speed Layer',
    points: 5,
    count: 1,
    tie: 'nobody',
    text: 'First to connect start to destination',
    bonus: true,
  },
  {
    id: 'land-baron',
    name: 'Land Baron',
    points: 5,
    count: 1,
    tie: 'nobody',
    text: 'Most grid slots filled',
    bonus: true,
  },
];

export function buildObjectiveDeck(): ObjectiveId[] {
  const deck: ObjectiveId[] = [];
  for (const def of OBJECTIVES) {
    if (def.bonus) continue;
    for (let i = 0; i < def.count; i++) deck.push(def.id);
  }
  return deck;
}

export function objectiveDef(id: ObjectiveId): ObjectiveDef {
  const def = OBJECTIVES.find((d) => d.id === id);
  if (!def) throw new Error(`unknown objective ${id}`);
  return def;
}

/** Per-board metrics one objective might compare. */
export type BoardMetrics = {
  trackCards: number;
  whistlestops: number;
  whistlestopsAndTowns: number;
  tunnelsAndBridges: number;
  tunnelCards: number;
  longestTunnel: number;
  longestBridge: number;
  routeCards: number;
  filled: number;
};

export function boardMetrics(board: Board): BoardMetrics {
  const reachable = reachableFromStart(board);
  const kept = keptCells(board, reachable);
  const counts = boardCounts(board, kept);
  return {
    trackCards: counts.trackCards,
    whistlestops: counts.whistlestops,
    whistlestopsAndTowns: counts.whistlestops + counts.towns,
    tunnelsAndBridges: counts.tunnelCards + counts.bridgeCards,
    tunnelCards: counts.tunnelCards,
    longestTunnel: longestMaterialRun(board, kept, 'tunnel'),
    longestBridge: longestMaterialRun(board, kept, 'bridge'),
    routeCards: kept.size,
    filled: filledSlots(board),
  };
}

/** Objectives that compare boards across players. */
type ComparativeId =
  | 'most-tracks'
  | 'inner-city'
  | 'subway'
  | 'rock-blaster'
  | 'gorge-ous'
  | 'longest-track'
  | 'land-baron';

function metricOf(id: ComparativeId, m: BoardMetrics): number {
  switch (id) {
    case 'most-tracks':
      return m.trackCards;
    case 'inner-city':
      return m.whistlestops;
    case 'subway':
      return m.tunnelCards;
    case 'rock-blaster':
      return m.longestTunnel;
    case 'gorge-ous':
      return m.longestBridge;
    case 'longest-track':
      return m.routeCards;
    case 'land-baron':
      return m.filled;
  }
}

/**
 * Score one held objective for a player given everyone's board metrics.
 * `connectedFirst` marks the Speed Layer winner (connection order recorded in
 * play). Returns 0 when the objective is not completed (it is kept instead).
 */
export function scoreObjective(
  id: ObjectiveId,
  player: number,
  metrics: BoardMetrics[],
  connectedFirst?: number,
): number {
  const def = objectiveDef(id);
  switch (id) {
    case 'mayor':
      return 2 * metrics[player].whistlestopsAndTowns;
    case 'mountain-express':
      return 2 * metrics[player].tunnelsAndBridges;
    case 'non-stop':
      return metrics[player].whistlestops === 0 ? def.points : 0;
    case 'speed-layer':
      return connectedFirst === player ? def.points : 0;
    default: {
      const mine = metricOf(id, metrics[player]);
      if (mine === 0) return 0;
      const best = Math.max(...metrics.map((m) => metricOf(id, m)));
      if (mine < best) return 0;
      const tied = metrics.filter((m) => metricOf(id, m) === best).length > 1;
      if (tied && def.tie === 'nobody') return 0;
      return def.points;
    }
  }
}
