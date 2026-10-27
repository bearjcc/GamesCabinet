import { describe, expect, it } from 'vitest';
import { GAMES } from './games';
import {
  allowedSeatColours,
  defaultSeatColours,
  ensureSeatColours,
  excludedSeatColoursForGame,
} from './seatColours';
import { isSeatColour } from './storage';
import type { TableSeat } from './tableSetup';

describe('per-game seat colours', () => {
  it('connect-four defaults to red and yellow without board blue', () => {
    const colours = defaultSeatColours(2, 'connect-four');
    expect(colours).toEqual(['#d63328', '#ed9f18']);
    expect(colours).not.toContain('#3a6fad');
  });

  it('each game with launch presets uses distinct, non-excluded colours', () => {
    for (const meta of GAMES) {
      const excluded = new Set(meta.excludedSeatColours ?? []);
      const presets = (meta.launchSeatColours ?? []).filter(isSeatColour);
      if (presets.length === 0) continue;
      expect(new Set(presets).size).toBe(presets.length);
      for (const colour of presets) {
        expect(excluded.has(colour)).toBe(false);
      }
    }
  });

  it('default seat colours stay off the exclusion list and distinct when the palette allows', () => {
    for (const meta of GAMES) {
      if (!meta.minPlayers || meta.minPlayers < 2) continue;
      const count = Math.min(meta.maxPlayers, Math.max(meta.minPlayers, 2));
      const colours = defaultSeatColours(count, meta.id);
      const excluded = excludedSeatColoursForGame(meta.id);
      expect(colours.length).toBe(count);
      for (const colour of colours) {
        expect(excluded.has(colour)).toBe(false);
      }
      if (count <= allowedSeatColours(meta.id).length) {
        expect(new Set(colours).size).toBe(count);
      }
    }
  });

  it('ensureSeatColours strips excluded colours from launch seats', () => {
    const seats: TableSeat[] = [
      { kind: 'local', colour: '#3a6fad' },
      { kind: 'bot', colour: '#3a6fad' },
    ];
    const next = ensureSeatColours(seats, 'connect-four');
    expect(next[0]?.colour).toBe('#d63328');
    expect(next[1]?.colour).toBe('#ed9f18');
  });
});
