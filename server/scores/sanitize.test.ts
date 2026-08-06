import { describe, expect, it } from 'vitest';
import { sanitizeMeta } from './sanitize.ts';

describe('sanitizeMeta', () => {
  it('returns undefined for missing or non-object meta', () => {
    expect(sanitizeMeta(undefined)).toBeUndefined();
    expect(sanitizeMeta(null)).toBeUndefined();
    expect(sanitizeMeta('x')).toBeUndefined();
    expect(sanitizeMeta([1, 2])).toBeUndefined();
    expect(sanitizeMeta({})).toBeUndefined();
    expect(sanitizeMeta({ n: Number.NaN, arr: [1] })).toBeUndefined();
  });

  it('keeps shallow primitive fields and truncates strings', () => {
    const meta = sanitizeMeta({
      mode: 'hard',
      moves: 12,
      ok: true,
      empty: null,
      long: 'a'.repeat(300),
      nested: { a: 1, deep: { skip: true } },
      arr: [1],
      bad: undefined,
    });
    expect(meta).toEqual({
      mode: 'hard',
      moves: 12,
      ok: true,
      empty: null,
      long: 'a'.repeat(200),
      nested: { a: 1 },
    });
  });

  it('drops meta that exceeds the JSON byte budget', () => {
    const fat: Record<string, string> = {};
    for (let i = 0; i < 20; i++) {
      fat[`k${i}`] = 'x'.repeat(200);
    }
    expect(sanitizeMeta(fat)).toBeUndefined();
  });

  it('caps the number of keys', () => {
    const many: Record<string, number> = {};
    for (let i = 0; i < 30; i++) many[`k${i}`] = i;
    const meta = sanitizeMeta(many);
    expect(Object.keys(meta ?? {})).toHaveLength(20);
  });
});
