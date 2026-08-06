import { describe, expect, it } from 'vitest';
import { isRepresentationMode, isZoneContext } from './types';

describe('isRepresentationMode', () => {
  it('accepts known modes', () => {
    expect(isRepresentationMode('physical')).toBe(true);
    expect(isRepresentationMode('detail')).toBe(true);
  });

  it('rejects unknowns', () => {
    expect(isRepresentationMode('fan')).toBe(false);
    expect(isRepresentationMode(null)).toBe(false);
    expect(isRepresentationMode(undefined)).toBe(false);
  });
});

describe('isZoneContext', () => {
  it('accepts known contexts', () => {
    expect(isZoneContext('peek')).toBe(true);
    expect(isZoneContext('choose')).toBe(true);
  });

  it('rejects unknowns', () => {
    expect(isZoneContext('open')).toBe(false);
    expect(isZoneContext('')).toBe(false);
  });
});
