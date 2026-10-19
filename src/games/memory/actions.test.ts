import { describe, expect, it } from 'vitest';
import { getMemoryActions } from './actions';

describe('getMemoryActions', () => {
  it('returns no pew intents; flips stay on the board', () => {
    expect(getMemoryActions()).toEqual([]);
  });
});
