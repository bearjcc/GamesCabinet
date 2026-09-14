import { describe, expect, it } from 'vitest';
import { relativeSeatLabel, roomShareUrl, summariseSeats } from './matchSeats';

describe('matchSeats', () => {
  it('summarises filled and open seats', () => {
    expect(summariseSeats(undefined)).toBeNull();
    expect(summariseSeats([])).toBeNull();
    const summary = summariseSeats([{ name: 'Bear' }, { name: '   ' }, { name: 'Alex' }] as never);
    expect(summary).toEqual({
      total: 3,
      filled: 2,
      full: false,
      labels: ['Bear', 'Seat 2 open', 'Alex'],
    });
  });

  it('labels the viewer You and the other chair Them', () => {
    expect(relativeSeatLabel(0, '0')).toBe('You');
    expect(relativeSeatLabel(1, '0')).toBe('Them');
    expect(relativeSeatLabel(1, '1')).toBe('You');
    expect(relativeSeatLabel(0, null)).toBe('Them');
  });

  it('builds a share URL for a room', () => {
    expect(roomShareUrl('tic-tac-toe', 'ABC123', 'https://games.test')).toBe(
      'https://games.test/g/tic-tac-toe/ABC123',
    );
  });
});
