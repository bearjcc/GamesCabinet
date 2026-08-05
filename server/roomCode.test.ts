import { describe, expect, it } from 'vitest';
import { normaliseRoomCode } from './roomCode';

describe('normaliseRoomCode', () => {
  it('trims and uppercases a valid code', () => {
    expect(normaliseRoomCode(' ab12cd ')).toBe('AB12CD');
  });

  it('returns null for empty or whitespace-only input', () => {
    expect(normaliseRoomCode('')).toBeNull();
    expect(normaliseRoomCode('   ')).toBeNull();
  });
});
