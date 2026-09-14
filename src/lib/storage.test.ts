import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearSeat,
  DEFAULT_SEAT_COLOUR,
  deviceSeats,
  getNickname,
  getSeatColour,
  getSoloBestScore,
  getUnlockedGames,
  loadSeat,
  SEAT_COLOUR_LABELS,
  SEAT_COLOUR_PALETTE,
  saveSeat,
  seatColourLabel,
  setNickname,
  setSeatColour,
  setSoloBestScore,
  unlockGame,
  updateSoloBestScore,
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

  it('persists every this-table seat on a mixed host', () => {
    stubLocalStorage();
    const session = {
      matchID: 'MIX9',
      playerID: '0',
      credentials: 'cred-0',
      gameName: 'crazy-eights',
      localSeats: [
        { playerID: '0', credentials: 'cred-0' },
        { playerID: '2', credentials: 'cred-2', kind: 'bot' as const },
      ],
    };
    saveSeat(session);
    expect(loadSeat('crazy-eights', 'MIX9')).toEqual(session);
    expect(deviceSeats(session)).toEqual(session.localSeats);
    expect(deviceSeats({ playerID: '1', credentials: 'only' })).toEqual([
      { playerID: '1', credentials: 'only' },
    ]);
    expect(deviceSeats({ playerID: '1', credentials: 'only', localSeats: [] })).toEqual([
      { playerID: '1', credentials: 'only' },
    ]);
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

  it('names every palette colour so swatches are not colour-only', () => {
    for (const colour of SEAT_COLOUR_PALETTE) {
      expect(SEAT_COLOUR_LABELS[colour].length).toBeGreaterThan(0);
      expect(seatColourLabel(colour)).toBe(SEAT_COLOUR_LABELS[colour]);
    }
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

describe('solo best scores', () => {
  it('reads and writes best scores per game', () => {
    stubLocalStorage();
    expect(getSoloBestScore('2048')).toBe(0);
    setSoloBestScore('2048', 128);
    expect(getSoloBestScore('2048')).toBe(128);
    expect(store.get('gamescabinet.best.2048')).toBe('128');
  });

  it('updateSoloBestScore only increases the stored best', () => {
    stubLocalStorage();
    setSoloBestScore('2048', 100);
    expect(updateSoloBestScore('2048', 80)).toBe(100);
    expect(updateSoloBestScore('2048', 240)).toBe(240);
    expect(getSoloBestScore('2048')).toBe(240);
  });

  it('falls back when best score storage is unavailable', () => {
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
    expect(getSoloBestScore('2048')).toBe(0);
    expect(() => setSoloBestScore('2048', 42)).not.toThrow();
  });

  it('ignores invalid stored best scores and bad writes', () => {
    stubLocalStorage();
    store.set('gamescabinet.best.2048', 'not-a-number');
    expect(getSoloBestScore('2048')).toBe(0);
    setSoloBestScore('2048', -5);
    expect(getSoloBestScore('2048')).toBe(0);
    setSoloBestScore('2048', Number.NaN);
    expect(getSoloBestScore('2048')).toBe(0);
  });
});
