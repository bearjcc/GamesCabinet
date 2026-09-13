/** Card definitions for Agency slice 1 (Era 1 solo). */

export type AgencyCardKind = 'resource' | 'person' | 'program';

export type AgencyCardDef = {
  id: string;
  name: string;
  kind: AgencyCardKind;
  /** Funding cost in market row. */
  marketCost: number;
  fundingGain?: number;
  innovationGain?: number;
  /** One-shot when played from hand (non-assign). */
  onPlayFunding?: number;
  onPlayInnovation?: number;
  draw?: number;
  blurb: string;
};

export const ERA_TARGET_SOLO = 10;

export const HAND_SIZE = 5;

export const BUILDING_IDS = [
  'research-facility',
  'administration-building',
  'mission-control',
] as const;

export type BuildingId = (typeof BUILDING_IDS)[number];

export const BUILDING_LABELS: Record<BuildingId, string> = {
  'research-facility': 'Research Facility',
  'administration-building': 'Administration Building',
  'mission-control': 'Mission Control',
};

export const SLOTS_PER_BUILDING = 2;

export const CARD_DEFS: Record<string, AgencyCardDef> = {
  'funding-1': {
    id: 'funding-1',
    name: 'Government Funding',
    kind: 'resource',
    marketCost: 2,
    fundingGain: 1,
    blurb: 'Gain 1 Funding.',
  },
  'innovation-1': {
    id: 'innovation-1',
    name: 'Research Grant',
    kind: 'resource',
    marketCost: 2,
    innovationGain: 1,
    blurb: 'Gain 1 Innovation.',
  },
  'person-technician': {
    id: 'person-technician',
    name: 'Technician',
    kind: 'person',
    marketCost: 3,
    onPlayFunding: 1,
    blurb: 'Assign to a building, or play for 1 Funding.',
  },
  'person-analyst': {
    id: 'person-analyst',
    name: 'Analyst',
    kind: 'person',
    marketCost: 3,
    onPlayInnovation: 1,
    blurb: 'Assign to a building, or play for 1 Innovation.',
  },
  'person-engineer': {
    id: 'person-engineer',
    name: 'Engineer',
    kind: 'person',
    marketCost: 4,
    onPlayFunding: 1,
    onPlayInnovation: 1,
    blurb: 'Assign to a building, or play for 1 Funding and 1 Innovation.',
  },
  'operations-team': {
    id: 'operations-team',
    name: 'Operations Team',
    kind: 'program',
    marketCost: 3,
    draw: 1,
    blurb: 'Draw 1 card.',
  },
  'test-rocket': {
    id: 'test-rocket',
    name: 'Test Rocket',
    kind: 'program',
    marketCost: 2,
    fundingGain: 1,
    innovationGain: 1,
    blurb: 'Gain 1 Funding and 1 Innovation.',
  },
};

export function cardDef(id: string): AgencyCardDef | undefined {
  return CARD_DEFS[id];
}

export function buildStartingDeck(): string[] {
  return [
    'funding-1',
    'funding-1',
    'funding-1',
    'funding-1',
    'innovation-1',
    'innovation-1',
    'innovation-1',
    'innovation-1',
    'person-technician',
    'person-analyst',
  ];
}

export function buildMarketDeck(): string[] {
  const pool: string[] = [];
  for (let i = 0; i < 4; i++) pool.push('funding-1');
  for (let i = 0; i < 4; i++) pool.push('innovation-1');
  for (let i = 0; i < 2; i++) pool.push('person-technician');
  for (let i = 0; i < 2; i++) pool.push('person-analyst');
  for (let i = 0; i < 2; i++) pool.push('person-engineer');
  for (let i = 0; i < 2; i++) pool.push('operations-team');
  for (let i = 0; i < 2; i++) pool.push('test-rocket');
  return pool;
}

export type MissionDef = {
  id: string;
  name: string;
  fundingRequired: number;
  innovationRequired: number;
  eraReward: number;
};

export const EXPLORER_I: MissionDef = {
  id: 'explorer-i',
  name: 'Explorer I',
  fundingRequired: 4,
  innovationRequired: 3,
  eraReward: 3,
};
