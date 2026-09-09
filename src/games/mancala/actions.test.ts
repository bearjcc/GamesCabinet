import { describe, expect, it } from 'vitest';
import { getMancalaActions } from './actions';

describe('getMancalaActions', () => {
  it('returns no pew intents; sows stay on pit taps', () => {
    expect(getMancalaActions()).toEqual([]);
  });
});
