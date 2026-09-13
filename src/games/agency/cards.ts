/** Card definitions for Agency slice 1 (Era 1 solo). */

export type AgencyCardKind = 'resource' | 'person' | 'program' | 'facility';

export type FacilityRole = 'research' | 'administration' | 'mission-control';

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
  /** Placed facility: passive role and staff slots. */
  facilityRole?: FacilityRole;
  staffSlots?: number;
  blurb: string;
};

export const ERA_TARGET_SOLO = 10;

export const HAND_SIZE = 5;

export const MAX_FACILITIES = 5;

export const DEFAULT_STAFF_SLOTS = 2;

export const STARTER_FACILITY_IDS = [
  'facility-research',
  'facility-admin',
  'facility-mission-control',
] as const;

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
    blurb: 'Assign to a facility for ongoing bonuses, or play once for 1 Funding.',
  },
  'person-analyst': {
    id: 'person-analyst',
    name: 'Analyst',
    kind: 'person',
    marketCost: 3,
    onPlayInnovation: 1,
    blurb: 'Assign to a facility for ongoing bonuses, or play once for 1 Innovation.',
  },
  'person-engineer': {
    id: 'person-engineer',
    name: 'Engineer',
    kind: 'person',
    marketCost: 4,
    onPlayFunding: 1,
    onPlayInnovation: 1,
    blurb: 'Assign to a facility for ongoing bonuses, or play once for 1 of each.',
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
  'facility-research': {
    id: 'facility-research',
    name: 'Research Facility',
    kind: 'facility',
    marketCost: 0,
    facilityRole: 'research',
    staffSlots: DEFAULT_STAFF_SLOTS,
    blurb: 'Staff here grant Innovation each turn.',
  },
  'facility-admin': {
    id: 'facility-admin',
    name: 'Administration Building',
    kind: 'facility',
    marketCost: 0,
    facilityRole: 'administration',
    staffSlots: DEFAULT_STAFF_SLOTS,
    blurb: 'Staff here grant Funding each turn.',
  },
  'facility-mission-control': {
    id: 'facility-mission-control',
    name: 'Mission Control',
    kind: 'facility',
    marketCost: 0,
    facilityRole: 'mission-control',
    staffSlots: DEFAULT_STAFF_SLOTS,
    blurb: 'Staff here lower mission requirements.',
  },
  'facility-cape-canaveral': {
    id: 'facility-cape-canaveral',
    name: 'Cape Canaveral',
    kind: 'facility',
    marketCost: 4,
    facilityRole: 'administration',
    staffSlots: DEFAULT_STAFF_SLOTS,
    blurb: 'Launch site. Staff grant Funding each turn.',
  },
  'facility-jpl': {
    id: 'facility-jpl',
    name: 'Jet Propulsion Laboratory',
    kind: 'facility',
    marketCost: 4,
    facilityRole: 'research',
    staffSlots: DEFAULT_STAFF_SLOTS,
    blurb: 'Research centre. Staff grant Innovation each turn.',
  },
};

export function cardDef(id: string): AgencyCardDef | undefined {
  return CARD_DEFS[id];
}

export function facilityStaffSlots(cardId: string): number {
  return cardDef(cardId)?.staffSlots ?? DEFAULT_STAFF_SLOTS;
}

export function facilityRole(cardId: string): FacilityRole | undefined {
  return cardDef(cardId)?.facilityRole;
}

/** Turn-start passive label when facility has staff (shown on board). */
export function facilityStaffedPassive(cardId: string, staffCount: number): string | null {
  if (staffCount === 0) return null;
  const role = facilityRole(cardId);
  if (role === 'research') {
    return `+${staffCount} Innovation each turn`;
  }
  if (role === 'administration') {
    return `+${staffCount} Funding each turn`;
  }
  if (role === 'mission-control') {
    return 'Lowers mission requirements';
  }
  return null;
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
  pool.push('facility-cape-canaveral', 'facility-jpl');
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

export type FacilityState = {
  instanceId: string;
  cardId: string;
  assigned: string[];
};

export function starterFacilities(): FacilityState[] {
  return [
    { instanceId: 'starter-research', cardId: 'facility-research', assigned: [] },
    { instanceId: 'starter-admin', cardId: 'facility-admin', assigned: [] },
    { instanceId: 'starter-mission-control', cardId: 'facility-mission-control', assigned: [] },
  ];
}
