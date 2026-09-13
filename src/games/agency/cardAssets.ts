import type { AbilityTrack, PersonFaction } from './personData';

const ICON_BASE = '/games/agency/icons';
const PORTRAIT_BASE = '/games/agency/portraits';

/** ComfyUI flat icons — track keys map to PNG basenames under icons/. */
const TRACK_ICON: Record<AbilityTrack, string> = {
  funding: 'funding',
  innovation: 'science',
  leadership: 'leadership',
  engineering: 'engineering',
  rocketry: 'rocketry',
  acceleration: 'acceleration',
  pilot: 'pilot',
};

export function abilityIconSrc(track: AbilityTrack): string {
  return `${ICON_BASE}/${TRACK_ICON[track]}.png`;
}

/** Globe icon for international / world factions only. */
export function factionIconSrc(faction: PersonFaction): string | undefined {
  if (faction === 'international' || faction === 'world') {
    return `${ICON_BASE}/globe.png`;
  }
  return undefined;
}

export function fundingCostIconSrc(): string {
  return `${ICON_BASE}/funding.png`;
}

export function orbitWatermarkSrc(): string {
  return `${ICON_BASE}/orbit.png`;
}

export function capsuleWatermarkSrc(): string {
  return `${ICON_BASE}/capsule.png`;
}

/** Portrait plate per person seed (separate from icons). */
export function portraitSrc(portraitSeed: string): string {
  return `${PORTRAIT_BASE}/${portraitSeed}.png`;
}
