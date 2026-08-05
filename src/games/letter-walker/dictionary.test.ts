import { afterEach, describe, expect, it } from 'vitest';
import {
  clearLetterWalkerDictionary,
  dictionarySize,
  isDictionaryWord,
  parseDictionaryText,
  setLetterWalkerDictionary,
} from './dictionary';

afterEach(() => {
  clearLetterWalkerDictionary();
});

describe('parseDictionaryText', () => {
  it('keeps words between three and eight letters', () => {
    expect(parseDictionaryText('cat\na\nabcdefghi\nDOG')).toEqual(['cat', 'dog']);
  });
});

describe('letter walker dictionary', () => {
  it('stores, checks, and clears words', () => {
    setLetterWalkerDictionary(['Cat', 'toolongwordhere', 'ab']);
    expect(isDictionaryWord('cat')).toBe(true);
    expect(isDictionaryWord('missing')).toBe(false);
    expect(dictionarySize()).toBe(1);
    clearLetterWalkerDictionary();
    expect(dictionarySize()).toBe(0);
  });
});
