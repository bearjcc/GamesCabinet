import { describe, expect, it } from 'vitest';
import { parseSeatNamesQuery } from './parseSeatNamesQuery';

describe('parseSeatNamesQuery', () => {
  it('returns undefined for empty input', () => {
    expect(parseSeatNamesQuery(null, 3)).toBeUndefined();
    expect(parseSeatNamesQuery('  ', 3)).toBeUndefined();
    expect(parseSeatNamesQuery(',', 3)).toBeUndefined();
  });

  it('pads labels to seat count', () => {
    expect(parseSeatNamesQuery('Bear,Ana,Kit', 3)).toEqual(['Bear', 'Ana', 'Kit']);
    expect(parseSeatNamesQuery('Bear', 2)).toEqual(['Bear', 'Bear']);
    expect(parseSeatNamesQuery('Solo', 4)).toEqual(['Solo', 'Solo', 'Solo', 'Solo']);
  });
});
