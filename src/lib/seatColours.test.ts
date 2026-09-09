import { describe, expect, it } from 'vitest';
import {
  appendSeatColoursQuery,
  colourForPlayer,
  contrastingInk,
  defaultSeatColours,
  ensureSeatColours,
  occupiedSeatColours,
  parseSeatColoursQuery,
  seatColoursQuery,
} from './seatColours';
import { DEFAULT_SEAT_COLOUR, SEAT_COLOUR_PALETTE } from './storage';
import type { TableSeat } from './tableSetup';

function seats(...entries: Array<TableSeat | TableSeat['kind']>): TableSeat[] {
  return entries.map((entry) => (typeof entry === 'string' ? { kind: entry } : entry));
}

describe('seatColours', () => {
  it('fills missing local and bot colours from the palette', () => {
    const next = ensureSeatColours(seats('local', 'bot', 'empty'));
    expect(next[0]?.colour).toBe(SEAT_COLOUR_PALETTE[0]);
    expect(next[1]?.colour).toBe(SEAT_COLOUR_PALETTE[1]);
    expect(next[2]?.colour).toBeUndefined();
  });

  it('keeps chosen colours and skips online seats', () => {
    const input = seats(
      { kind: 'local', colour: SEAT_COLOUR_PALETTE[3] },
      { kind: 'online' },
      { kind: 'bot', colour: SEAT_COLOUR_PALETTE[5] },
    );
    expect(occupiedSeatColours(input)).toEqual([
      SEAT_COLOUR_PALETTE[3],
      undefined,
      SEAT_COLOUR_PALETTE[5],
    ]);
  });

  it('round-trips palette indices in the query string', () => {
    const table = ensureSeatColours(
      seats(
        { kind: 'local', colour: SEAT_COLOUR_PALETTE[0] },
        { kind: 'bot', colour: SEAT_COLOUR_PALETTE[4] },
      ),
    );
    const query = seatColoursQuery(table);
    expect(query).toBe('0,4');
    expect(parseSeatColoursQuery(query, 2)).toEqual([
      SEAT_COLOUR_PALETTE[0],
      SEAT_COLOUR_PALETTE[4],
    ]);
  });

  it('uses a dash for online seats without a launch colour', () => {
    const table = seats(
      { kind: 'local', colour: SEAT_COLOUR_PALETTE[2] },
      { kind: 'online' },
      { kind: 'bot', colour: SEAT_COLOUR_PALETTE[1] },
    );
    expect(seatColoursQuery(table)).toBe('2,-,1');
    expect(parseSeatColoursQuery('2,-,1', 3)).toEqual([
      SEAT_COLOUR_PALETTE[2],
      undefined,
      SEAT_COLOUR_PALETTE[1],
    ]);
  });

  it('picks readable ink for light and dark fills', () => {
    expect(contrastingInk('#f1c40f')).toBe('#1c1917');
    expect(contrastingInk('#2980b9')).toBe('#fbf6ec');
    expect(contrastingInk('bad')).toBe('#fbf6ec');
  });

  it('builds default colours without repeating palette entries', () => {
    expect(defaultSeatColours(3)).toEqual([
      SEAT_COLOUR_PALETTE[0],
      SEAT_COLOUR_PALETTE[1],
      SEAT_COLOUR_PALETTE[2],
    ]);
  });

  it('looks up colours by player id and appends them to launch params', () => {
    const colours = [SEAT_COLOUR_PALETTE[0], SEAT_COLOUR_PALETTE[2]];
    expect(colourForPlayer(colours, '1')).toBe(SEAT_COLOUR_PALETTE[2]);
    expect(colourForPlayer(colours, '9')).toBeUndefined();
    const params = appendSeatColoursQuery(
      new URLSearchParams({ seats: '2' }),
      seats('local', 'bot'),
    );
    expect(params.get('colours')).toBe('0,1');
  });

  it('ignores invalid palette indices when parsing', () => {
    expect(parseSeatColoursQuery('99,abc', 2)).toEqual([undefined, undefined]);
    expect(parseSeatColoursQuery('', 2)).toEqual([]);
  });

  it('falls back to the saved preference when the palette is exhausted', () => {
    const fullTable = [
      ...SEAT_COLOUR_PALETTE.map((colour) => ({ kind: 'local' as const, colour })),
      { kind: 'local' as const },
    ];
    const next = ensureSeatColours(fullTable);
    expect(next[6]?.colour).toBeTruthy();
  });

  it('omits colour query params when no launch colours exist', () => {
    expect(seatColoursQuery(seats('online', 'online'))).toBeNull();
    const params = appendSeatColoursQuery(new URLSearchParams(), seats('online', 'online'));
    expect(params.get('colours')).toBeNull();
  });

  it('reuses the default colour when more seats are requested than palette entries', () => {
    expect(defaultSeatColours(SEAT_COLOUR_PALETTE.length + 1).at(-1)).toBe(DEFAULT_SEAT_COLOUR);
  });
});
