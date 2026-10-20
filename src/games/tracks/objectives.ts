/**
 * TRACKS objective deck and scoring.
 */
import {
  type Board,
  boardCounts,
  filledSlots,
  keptCells,
  longestMaterialRun,
  reachableFromStart,
} from './grid';
import { PLACEHOLDER_OBJECTIVE_COUNTS, PUBLIC_OBJECTIVE_IDS } from './placeholders';

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
  | 'speed-layer'
  | 'land-baron';

export type TieRule = 'first' | 'nobody';

export type ObjectiveDef = {
  id: ObjectiveId;
  name: string;
  points: number;
  count: number;
  tie: TieRule;
  text: string;
  bonus?: boolean;
  public?: boolean;
};

export const OBJECTIVES: ObjectiveDef[] = [
  {
    id: 'most-tracks',
    name: 'Most Tracks',
    points: 5,
    count: PLACEHOLDER_OBJECTIVE_COUNTS['most-tracks'],
    tie: 'first',
    text: 'Most track cards played',
    public: true,
  },
  {
    id: 'inner-city',
    name: 'Inner City',
    points: 5,
    count: PLACEHOLDER_OBJECTIVE_COUNTS['inner-city'],
    tie: 'first',
    text: 'Most whistlestops',
  },
  {
    id: 'mayor',
    name: 'Mayor',
    points: 2,
    count: PLACEHOLDER_OBJECTIVE_COUNTS.mayor,
    tie: 'first',
    text: '+2 per whistlestop',
  },
  {
    id: 'mountain-express',
    name: 'Mountain Express',
    points: 2,
    count: PLACEHOLDER_OBJECTIVE_COUNTS['mountain-express'],
    tie: 'first',
    text: '+2 per tunnel or bridge',
  },
  {
    id: 'subway',
    name: 'Subway',
    points: 5,
    count: PLACEHOLDER_OBJECTIVE_COUNTS.subway,
    tie: 'first',
    text: 'Most tunnel cards',
  },
  {
    id: 'rock-blaster',
    name: 'Rock Blaster',
    points: 5,
    count: PLACEHOLDER_OBJECTIVE_COUNTS['rock-blaster'],
    tie: 'first',
    text: 'Longest tunnel',
  },
  {
    id: 'gorge-ous',
    name: 'Gorge-ous',
    points: 5,
    count: PLACEHOLDER_OBJECTIVE_COUNTS['gorge-ous'],
    tie: 'first',
    text: 'Longest bridge',
  },
  {
    id: 'non-stop',
    name: 'Non-Stop',
    points: 3,
    count: PLACEHOLDER_OBJECTIVE_COUNTS['non-stop'],
    tie: 'first',
    text: 'No whistlestops',
  },
  {
    id: 'longest-track',
    name: 'Longest Track',
    points: 5,
    count: PLACEHOLDER_OBJECTIVE_COUNTS['longest-track'],
    tie: 'first',
    text: 'Most cards in route',
    public: true,
  },
  {
    id: 'speed-layer',
    name: 'Speed Layer',
    points: 5,
    count: PLACEHOLDER_OBJECTIVE_COUNTS['speed-layer'],
    tie: 'first',
    text: 'First to connect start to destination',
    bonus: true,
  },
  {
    id: 'land-baron',
    name: 'Land Baron',
    points: 5,
    count: PLACEHOLDER_OBJECTIVE_COUNTS['land-baron'],
    tie: 'first',
    text: 'Most grid slots filled',
    bonus: true,
  },
];

export const PUBLIC_OBJECTIVES: readonly ObjectiveId[] = PUBLIC_OBJECTIVE_IDS;

/** Face-up objectives for the table (Speed Layer + Land Baron join at 4+ players). */
export function publicObjectivesForPlayers(numPlayers: number): ObjectiveId[] {
  const ids: ObjectiveId[] = [...PUBLIC_OBJECTIVE_IDS];
  if (numPlayers >= 4) ids.push('speed-layer', 'land-baron');
  return ids;
}

export function buildObjectiveDeck(): ObjectiveId[] {
  const deck: ObjectiveId[] = [];
  for (const def of OBJECTIVES) {
    if (def.bonus || def.public) continue;
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
    tunnelsAndBridges: counts.tunnelCards + counts.bridgeCards,
    tunnelCards: counts.tunnelCards,
    longestTunnel: longestMaterialRun(board, kept, 'tunnel'),
    longestBridge: longestMaterialRun(board, kept, 'bridge'),
    routeCards: kept.size,
    filled: filledSlots(board),
  };
}

/** Objectives that compare boards across players. */
export type ComparativeId =
  | 'most-tracks'
  | 'inner-city'
  | 'subway'
  | 'rock-blaster'
  | 'gorge-ous'
  | 'longest-track'
  | 'land-baron';

export function metricOf(id: ComparativeId, m: BoardMetrics): number {
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

export type ComparativeRace = { value: number; order: string[] };

/** Update first-to-the-lead tracking after a board changes. */
export function recordComparativeRace(
  races: Partial<Record<ComparativeId, ComparativeRace>>,
  metrics: BoardMetrics[],
  playerId: string,
): void {
  const p = Number(playerId);
  for (const id of Object.keys(races) as ComparativeId[]) {
    const value = metricOf(id, metrics[p]);
    if (value <= 0) continue;
    const state = races[id] ?? { value: 0, order: [] };
    if (value > state.value) {
      races[id] = { value, order: [playerId] };
    } else if (value === state.value && !state.order.includes(playerId)) {
      state.order.push(playerId);
      races[id] = state;
    }
  }
}

export function initComparativeRaces(
  ids: ComparativeId[],
): Partial<Record<ComparativeId, ComparativeRace>> {
  const races: Partial<Record<ComparativeId, ComparativeRace>> = {};
  for (const id of ids) races[id] = { value: 0, order: [] };
  return races;
}

const ALL_COMPARATIVE: ComparativeId[] = [
  'most-tracks',
  'inner-city',
  'subway',
  'rock-blaster',
  'gorge-ous',
  'longest-track',
  'land-baron',
];

export function comparativeIdsForState(
  _publicObjectives: ObjectiveId[],
  numPlayers: number,
): ComparativeId[] {
  const ids = ALL_COMPARATIVE.filter((id) => id !== 'land-baron' || numPlayers >= 4);
  return ids;
}

function winnerAmongTied(
  id: ComparativeId,
  metrics: BoardMetrics[],
  races: Partial<Record<ComparativeId, ComparativeRace>> | undefined,
): number | null {
  const mine = metrics.map((m) => metricOf(id, m));
  const best = Math.max(...mine);
  if (best <= 0) return null;
  const tied = mine.map((v, i) => (v === best ? i : -1)).filter((i) => i >= 0);
  if (tied.length === 1) return tied[0];
  const order = races?.[id]?.order ?? [];
  for (const pid of order) {
    const i = Number(pid);
    if (tied.includes(i)) return i;
  }
  return null;
}

/**
 * Score one held objective for a player given everyone's board metrics.
 * Returns 0 when the objective is not completed (it is kept instead).
 */
export function scoreObjective(
  id: ObjectiveId,
  player: number,
  metrics: BoardMetrics[],
  opts?: {
    connectedFirst?: number;
    races?: Partial<Record<ComparativeId, ComparativeRace>>;
  },
): number {
  const def = objectiveDef(id);
  switch (id) {
    case 'mayor':
      return metrics[player].whistlestops > 0 ? 2 * metrics[player].whistlestops : 0;
    case 'mountain-express':
      return metrics[player].tunnelsAndBridges > 0 ? 2 * metrics[player].tunnelsAndBridges : 0;
    case 'non-stop':
      return metrics[player].whistlestops === 0 ? def.points : 0;
    case 'speed-layer':
      return opts?.connectedFirst === player ? def.points : 0;
    default: {
      const winner = winnerAmongTied(id as ComparativeId, metrics, opts?.races);
      return winner === player ? def.points : 0;
    }
  }
}

/** Award public objectives to the round winner(s) of each face-up card. */
export function scorePublicObjectives(
  publicIds: ObjectiveId[],
  metrics: BoardMetrics[],
  scores: number[],
  races: Partial<Record<ComparativeId, ComparativeRace>>,
  connectedFirst?: number,
): void {
  for (const id of publicIds) {
    if (id === 'speed-layer') {
      if (connectedFirst !== undefined) scores[connectedFirst] += objectiveDef(id).points;
      continue;
    }
    const winner = winnerAmongTied(id as ComparativeId, metrics, races);
    if (winner === null) continue;
    scores[winner] += objectiveDef(id).points;
  }
}
