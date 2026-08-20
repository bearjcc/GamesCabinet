import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearSeat,
  DEFAULT_SEAT_COLOUR,
  getNickname,
  getSeatColour,
  getUnlockedGames,
  loadSeat,
  SEAT_COLOUR_PALETTE,
  saveSeat,
  setNickname,
  setSeatColour,
  unlockGame,
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

describe('access code unlocks', () => {
  it('starts with no unlocked games', () => {
    stubLocalStorage();
    expect(getUnlockedGames()).toEqual([]);
  });

  it('persists unlocked games without duplicates', () => {
    stubLocalStorage();
    unlockGame('orbits');
    unlockGame('tracks');
    unlockGame('orbits');
    expect(getUnlockedGames()).toEqual(['orbits', 'tracks']);
    expect(store.get('gamescabinet.unlockedGames')).toBe('["orbits","tracks"]');
  });

  it('treats corrupt or non-array unlock data as empty', () => {
    stubLocalStorage();
    store.set('gamescabinet.unlockedGames', '{bad');
    expect(getUnlockedGames()).toEqual([]);
    store.set('gamescabinet.unlockedGames', '{"game":1}');
    expect(getUnlockedGames()).toEqual([]);
  });

  it('drops non-string entries from stored unlocks', () => {
    stubLocalStorage();
    store.set('gamescabinet.unlockedGames', '["orbits",7,null]');
    expect(getUnlockedGames()).toEqual(['orbits']);
  });

  it('survives storage being unavailable', () => {
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
    expect(getUnlockedGames()).toEqual([]);
    expect(() => unlockGame('orbits')).not.toThrow();
  });
});
