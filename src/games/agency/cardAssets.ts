import type { AbilityTrack, PersonFaction } from './personData';

const ICON_BASE = '/games/agency/icons';
const PORTRAIT_BASE = '/games/agency/portraits';

/** Flat icon PNGs (ComfyUI + sdxl-simple-icons LoRA). */
export function abilityIconSrc(track: AbilityTrack): string {
  return `${ICON_BASE}/ability-${track}.png`;
}

export function factionIconSrc(faction: PersonFaction): string {
  return `${ICON_BASE}/faction-${faction}.png`;
}

export function fundingCostIconSrc(): string {
  return `${ICON_BASE}/funding-cost.png`;
}

export function orbitWatermarkSrc(): string {
  return `${ICON_BASE}/orbit-watermark.png`;
}

export function blueprintWatermarkSrc(): string {
  return `${ICON_BASE}/blueprint-watermark.png`;
}

/** Portrait plate per person seed (separate from icons). */
export function portraitSrc(portraitSeed: string): string {
  return `${PORTRAIT_BASE}/${portraitSeed}.png`;
}
