import type { AgencyCardDef } from './cards';
import { cardDef } from './cards';

/** Ability row colours from Bear's comps — mapped to Agency resources. */
export type AbilityTrack =
  | 'funding'
  | 'innovation'
  | 'leadership'
  | 'engineering'
  | 'rocketry'
  | 'acceleration'
  | 'pilot';

export type PersonFaction = 'us' | 'ussr' | 'international' | 'world';

export type PersonAbilityRow = {
  track: AbilityTrack;
  value: number;
  label: string;
  effect: string;
};

export type PersonDossier = {
  title: string;
  faction: PersonFaction;
  factionLabel: string;
  eras: number[];
  rarity?: 'rare';
  origin?: string;
  program?: string;
  role?: string;
  clearance?: string;
  quote?: string;
  portraitSeed: string;
  abilities: PersonAbilityRow[];
};

const DOSSIERS: Record<string, PersonDossier> = {
  'person-technician': {
    title: 'Technician',
    faction: 'us',
    factionLabel: 'US',
    eras: [1],
    program: 'Mercury',
    role: 'Technician',
    clearance: 'CONFIDENTIAL',
    portraitSeed: 'technician',
    abilities: [
      {
        track: 'funding',
        value: 1,
        label: 'Funding',
        effect: 'Gain 1 Funding when played.',
      },
    ],
  },
  'person-analyst': {
    title: 'Analyst',
    faction: 'us',
    factionLabel: 'US',
    eras: [1],
    program: 'Explorer',
    role: 'Analyst',
    clearance: 'CONFIDENTIAL',
    portraitSeed: 'analyst',
    abilities: [
      {
        track: 'innovation',
        value: 1,
        label: 'Innovation',
        effect: 'Gain 1 Innovation when played.',
      },
    ],
  },
  'person-engineer': {
    title: 'Engineer',
    faction: 'us',
    factionLabel: 'US',
    eras: [1],
    rarity: 'rare',
    program: 'Satellite',
    role: 'Engineer',
    clearance: 'SECRET',
    portraitSeed: 'engineer',
    abilities: [
      {
        track: 'funding',
        value: 1,
        label: 'Funding',
        effect: 'Gain 1 Funding when played.',
      },
      {
        track: 'innovation',
        value: 1,
        label: 'Innovation',
        effect: 'Gain 1 Innovation when played.',
      },
    ],
  },
};

export function personDossier(cardId: string): PersonDossier | undefined {
  return DOSSIERS[cardId];
}

export function isPersonCard(cardId: string): boolean {
  return cardDef(cardId)?.kind === 'person';
}

/** Build ability rows from card def when no dossier override exists. */
export function abilitiesForPerson(def: AgencyCardDef): PersonAbilityRow[] {
  const dossier = DOSSIERS[def.id];
  if (dossier) return dossier.abilities;

  const rows: PersonAbilityRow[] = [];
  if (def.onPlayFunding) {
    rows.push({
      track: 'funding',
      value: def.onPlayFunding,
      label: 'Funding',
      effect: `Gain ${def.onPlayFunding} Funding when played.`,
    });
  }
  if (def.onPlayInnovation) {
    rows.push({
      track: 'innovation',
      value: def.onPlayInnovation,
      label: 'Innovation',
      effect: `Gain ${def.onPlayInnovation} Innovation when played.`,
    });
  }
  return rows;
}
