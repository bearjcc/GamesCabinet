import { describe, expect, it } from 'vitest';
import { roomShareUrl, summariseSeats } from './matchSeats';

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

  it('builds a share URL for a room', () => {
    expect(roomShareUrl('tic-tac-toe', 'ABC123', 'https://games.test')).toBe(
      'https://games.test/g/tic-tac-toe/ABC123',
    );
  });
});
