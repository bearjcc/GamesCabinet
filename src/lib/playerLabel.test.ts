import { describe, expect, it } from 'vitest';
import { playerSeatLabel } from './playerLabel';

describe('playerSeatLabel', () => {
  it('uses the seat name when present', () => {
    expect(
      playerSeatLabel(
        '0',
        [
          { id: 0, name: 'Bear' },
          { id: 1, name: 'Guest' },
        ],
        'Yellow',
      ),
    ).toBe('Bear');
  });

  it('falls back when the seat name is blank', () => {
    expect(
      playerSeatLabel(
        1,
        [
          { id: 0, name: 'Bear' },
          { id: 1, name: '  ' },
        ],
        'Red',
      ),
    ).toBe('Red');
  });
});
