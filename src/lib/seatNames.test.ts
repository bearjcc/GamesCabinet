import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultSeatDisplayName, seatColourLabel } from './seatNames';
import type { SeatColour } from './storage';
import * as storage from './storage';

describe('seatNames', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('labels palette colours for table talk', () => {
    expect(seatColourLabel('#d63328')).toBe('Red');
    expect(seatColourLabel('#ed9f18')).toBe('Yellow');
    expect(seatColourLabel('#000000' as SeatColour)).toBe('Seat');
  });

  it('uses the saved nickname for seat 0', () => {
    vi.spyOn(storage, 'getNickname').mockReturnValue('Bear');
    expect(defaultSeatDisplayName('0')).toBe('Bear');
  });

  it('defaults seat 0 to You when no nickname is saved', () => {
    vi.spyOn(storage, 'getNickname').mockReturnValue('');
    expect(defaultSeatDisplayName('0')).toBe('You');
  });

  it('names other seats by colour when no lobby name exists', () => {
    vi.spyOn(storage, 'getNickname').mockReturnValue('');
    expect(defaultSeatDisplayName('1')).toBe('Blue');
  });

  it('labels non-numeric ids as seats', () => {
    expect(defaultSeatDisplayName('alpha')).toBe('Seat alpha');
  });
});
