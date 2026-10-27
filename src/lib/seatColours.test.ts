import { describe, expect, it, vi } from 'vitest';
import * as games from './games';
import {
  allowedSeatColours,
  appendSeatColoursQuery,
  colourForPlayer,
  contrastingInk,
  defaultSeatColours,
  ensureSeatColours,
  launchSeatColourList,
  nextSeatColour,
  occupiedSeatColours,
  parseSeatColoursQuery,
  resolveSeatColours,
  seatColoursQuery,
} from './seatColours';
import { SEAT_COLOUR_PALETTE } from './storage';
import type { TableSeat } from './tableSetup';

function seats(...entries: Array<TableSeat | TableSeat['kind']>): TableSeat[] {
  return entries.map((entry) => (typeof entry === 'string' ? { kind: entry } : entry));
}

describe('seatColours', () => {
  it('cycles palette colours for connect-four without board blue', () => {
    expect(nextSeatColour('#d63328', 'connect-four')).toBe('#ed9f18');
    expect(nextSeatColour('#ed9f18', 'connect-four')).toBe('#5f8536');
    expect(nextSeatColour('#3a6fad', 'connect-four')).toBe('#d63328');
    expect(allowedSeatColours('connect-four')).not.toContain('#3a6fad');
  });

  it('falls back to the saved seat preference when every palette colour is excluded', () => {
    vi.spyOn(games, 'getGameMeta').mockReturnValue({
      id: 'test',
      name: 'Test',
      blurb: '',
      minPlayers: 2,
      maxPlayers: 2,
      hasBot: false,
      excludedSeatColours: [...SEAT_COLOUR_PALETTE],
    });
    expect(nextSeatColour(undefined, 'test')).toBeTruthy();
    const assigned = ensureSeatColours([{ kind: 'local' }, { kind: 'bot' }], 'test');
    expect(assigned[0]?.colour).toBeTruthy();
    vi.restoreAllMocks();
  });

  it('cycles palette colours', () => {
    expect(nextSeatColour(SEAT_COLOUR_PALETTE[0])).toBe(SEAT_COLOUR_PALETTE[1]);
    expect(nextSeatColour(undefined)).toBe(SEAT_COLOUR_PALETTE[0]);
    const last = SEAT_COLOUR_PALETTE[SEAT_COLOUR_PALETTE.length - 1]!;
    expect(nextSeatColour(last)).toBe(SEAT_COLOUR_PALETTE[0]);
  });

  it('maps launch seat colours by seat index', () => {
    expect(
      launchSeatColourList(
        seats({ kind: 'local', colour: SEAT_COLOUR_PALETTE[0] }, 'online', 'empty', {
          kind: 'bot',
          colour: SEAT_COLOUR_PALETTE[2],
        }),
      ),
    ).toEqual([SEAT_COLOUR_PALETTE[0], undefined, undefined, SEAT_COLOUR_PALETTE[2]]);
  });

  it('fills missing local and bot colours from the palette', () => {
    const next = ensureSeatColours(seats('local', 'bot', 'empty'));
    expect(next[0]?.colour).toBe(SEAT_COLOUR_PALETTE[0]);
    expect(next[1]?.colour).toBe(SEAT_COLOUR_PALETTE[1]);
    expect(next[2]?.colour).toBeUndefined();
  });

  it('keeps chosen colours and skips online seats', () => {
    const input = seats(
      { kind: 'local', colour: SEAT_COLOUR_PALETTE[0] },
      { kind: 'online' },
      { kind: 'bot', colour: SEAT_COLOUR_PALETTE[2] },
    );
    expect(occupiedSeatColours(input)).toEqual([
      SEAT_COLOUR_PALETTE[0],
      undefined,
      SEAT_COLOUR_PALETTE[2],
    ]);
  });

  it('round-trips palette indices in the query string', () => {
    const table = ensureSeatColours(
      seats(
        { kind: 'local', colour: SEAT_COLOUR_PALETTE[0] },
        { kind: 'bot', colour: SEAT_COLOUR_PALETTE[1] },
      ),
    );
    const query = seatColoursQuery(table);
    expect(query).toBe('0,1');
    expect(parseSeatColoursQuery(query, 2)).toEqual([
      SEAT_COLOUR_PALETTE[0],
      SEAT_COLOUR_PALETTE[1],
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
    expect(contrastingInk('#ed9f18')).toBe('#1c1917');
    expect(contrastingInk('#3a6fad')).toBe('#fbf6ec');
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

  it('resolveSeatColours keeps valid picks and swaps excluded colours for defaults', () => {
    expect(
      resolveSeatColours([SEAT_COLOUR_PALETTE[2], SEAT_COLOUR_PALETTE[1]], 2, 'connect-four'),
    ).toEqual([SEAT_COLOUR_PALETTE[2], '#ed9f18']);
    expect(resolveSeatColours([undefined, undefined], 2, 'connect-four')).toEqual([
      '#d63328',
      '#ed9f18',
    ]);
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
    expect(next[4]?.colour).toBeTruthy();
  });

  it('omits colour query params when no launch colours exist', () => {
    expect(seatColoursQuery(seats('online', 'online'))).toBeNull();
    const params = appendSeatColoursQuery(new URLSearchParams(), seats('online', 'online'));
    expect(params.get('colours')).toBeNull();
  });

  it('reuses an allowed colour when more seats are requested than palette entries', () => {
    expect(defaultSeatColours(SEAT_COLOUR_PALETTE.length + 1).at(-1)).toBe(SEAT_COLOUR_PALETTE[0]);
  });
});
