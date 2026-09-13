import { describe, expect, it } from 'vitest';
import {
  abilityIconSrc,
  capsuleWatermarkSrc,
  factionIconSrc,
  fundingCostIconSrc,
  orbitWatermarkSrc,
  portraitSrc,
} from './cardAssets';

describe('cardAssets', () => {
  it('resolves ComfyUI icon paths under public/games/agency', () => {
    expect(abilityIconSrc('funding')).toBe('/games/agency/icons/funding.png');
    expect(abilityIconSrc('innovation')).toBe('/games/agency/icons/science.png');
    expect(abilityIconSrc('engineering')).toBe('/games/agency/icons/engineering.png');
    expect(abilityIconSrc('pilot')).toBe('/games/agency/icons/pilot.png');
    expect(factionIconSrc('international')).toBe('/games/agency/icons/globe.png');
    expect(factionIconSrc('world')).toBe('/games/agency/icons/globe.png');
    expect(factionIconSrc('us')).toBeUndefined();
    expect(fundingCostIconSrc()).toBe('/games/agency/icons/funding.png');
    expect(orbitWatermarkSrc()).toBe('/games/agency/icons/orbit.png');
    expect(capsuleWatermarkSrc()).toBe('/games/agency/icons/capsule.png');
    expect(portraitSrc('technician')).toBe('/games/agency/portraits/technician.png');
  });
});
