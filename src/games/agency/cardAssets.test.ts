import { describe, expect, it } from 'vitest';
import {
  abilityIconSrc,
  blueprintWatermarkSrc,
  factionIconSrc,
  fundingCostIconSrc,
  orbitWatermarkSrc,
  portraitSrc,
} from './cardAssets';

describe('cardAssets', () => {
  it('resolves icon and portrait paths under public/games/agency', () => {
    expect(abilityIconSrc('funding')).toBe('/games/agency/icons/ability-funding.png');
    expect(factionIconSrc('us')).toBe('/games/agency/icons/faction-us.png');
    expect(fundingCostIconSrc()).toBe('/games/agency/icons/funding-cost.png');
    expect(orbitWatermarkSrc()).toBe('/games/agency/icons/orbit-watermark.png');
    expect(blueprintWatermarkSrc()).toBe('/games/agency/icons/blueprint-watermark.png');
    expect(portraitSrc('technician')).toBe('/games/agency/portraits/technician.png');
  });
});
