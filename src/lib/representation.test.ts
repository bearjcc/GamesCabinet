import { describe, expect, it } from 'vitest';
import {
  CARD_HAND_COMPACT_MAX,
  CARD_HAND_PHYSICAL_MAX,
  chooseCardHandMode,
} from './representation';

describe('chooseCardHandMode', () => {
  it('documents Mum-simple thresholds', () => {
    expect(CARD_HAND_PHYSICAL_MAX).toBe(8);
    expect(CARD_HAND_COMPACT_MAX).toBe(14);
  });

  it('uses physical for small hands (count < 8)', () => {
    expect(chooseCardHandMode(0)).toBe('physical');
    expect(chooseCardHandMode(1)).toBe('physical');
    expect(chooseCardHandMode(7)).toBe('physical');
  });

  it('uses compact for medium hands (8 <= count < 14)', () => {
    expect(chooseCardHandMode(8)).toBe('compact');
    expect(chooseCardHandMode(13)).toBe('compact');
  });

  it('uses list for large hands (count >= 14)', () => {
    expect(chooseCardHandMode(14)).toBe('list');
    expect(chooseCardHandMode(25)).toBe('list');
  });

  it('ignores viewportHint for Mum-simple thresholds', () => {
    expect(chooseCardHandMode(7, 'narrow')).toBe('physical');
    expect(chooseCardHandMode(8, 'narrow')).toBe('compact');
    expect(chooseCardHandMode(14, 'wide')).toBe('list');
  });
});
