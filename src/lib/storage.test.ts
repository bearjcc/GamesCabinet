import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearSeat,
  DEFAULT_SEAT_COLOUR,
  getNickname,
  getSeatColour,
  loadSeat,
  SEAT_COLOUR_PALETTE,
  saveSeat,
  setNickname,
  setSeatColour,
} from './storage';

const store = new Map<string, string>();

afterEach(() => {
  store.clear();
  vi.unstubAllGlobals();
});

function stubLocalStorage() {
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  });
}

describe('storage', () => {
  it('stores and reads nicknames', () => {
    stubLocalStorage();
    expect(getNickname()).toBe('');
    setNickname('  Bear  ');
    expect(getNickname()).toBe('Bear');
  });

  it('persists seat sessions per match', () => {
    stubLocalStorage();
    const session = {
      matchID: 'ABC123',
      playerID: '0',
      credentials: 'secret',
      gameName: 'tic-tac-toe',
    };
    saveSeat(session);
    expect(loadSeat('tic-tac-toe', 'ABC123')).toEqual(session);
    clearSeat('tic-tac-toe', 'ABC123');
    expect(loadSeat('tic-tac-toe', 'ABC123')).toBeNull();
  });

  it('returns null for corrupt seat JSON', () => {
    stubLocalStorage();
    store.set('gamescabinet.seat.tic-tac-toe:ABC123', '{bad');
    expect(loadSeat('tic-tac-toe', 'ABC123')).toBeNull();
  });

  it('defaults seat colour when unset', () => {
    stubLocalStorage();
    expect(getSeatColour()).toBe(DEFAULT_SEAT_COLOUR);
  });

  it('persists seat colour from the palette', () => {
    stubLocalStorage();
    const colour = SEAT_COLOUR_PALETTE[2]!;
    setSeatColour(colour);
    expect(getSeatColour()).toBe(colour);
    expect(store.get('gamescabinet.seatColour')).toBe(colour);
  });

  it('ignores unknown seat colours', () => {
    stubLocalStorage();
    store.set('gamescabinet.seatColour', '#not-a-palette-colour');
    expect(getSeatColour()).toBe(DEFAULT_SEAT_COLOUR);
    setSeatColour('#ffffff' as typeof DEFAULT_SEAT_COLOUR);
    expect(store.get('gamescabinet.seatColour')).toBe('#not-a-palette-colour');
  });

  it('falls back when seat colour storage is unavailable', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    });
    expect(getSeatColour()).toBe(DEFAULT_SEAT_COLOUR);
    expect(() => setSeatColour(DEFAULT_SEAT_COLOUR)).not.toThrow();
  });
});
