import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearSeat, getNickname, loadSeat, saveSeat, setNickname } from './storage';

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
});
