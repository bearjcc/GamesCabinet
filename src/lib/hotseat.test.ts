import { describe, expect, it } from 'vitest';
import { HOTSEAT_TURN_HOLD_MS } from './hotseat';

describe('hotseat', () => {
  it('holds turn presentation long enough to read a seat change', () => {
    expect(HOTSEAT_TURN_HOLD_MS).toBeGreaterThanOrEqual(1200);
  });
});
