import {
  DEFAULT_SEAT_COLOUR,
  getSeatColour,
  isSeatColour,
  SEAT_COLOUR_PALETTE,
  type SeatColour,
} from './storage';
import type { TableSeat } from './tableSetup';

function occupiedSeats(seats: readonly TableSeat[]): TableSeat[] {
  return seats.filter((seat) => seat.kind !== 'empty');
}

function nextColour(seats: readonly TableSeat[]): SeatColour {
  const used = new Set(
    seats.map((seat) => seat.colour).filter((colour): colour is SeatColour => isSeatColour(colour)),
  );
  return SEAT_COLOUR_PALETTE.find((colour) => !used.has(colour)) ?? getSeatColour();
}

/** Assign palette colours to occupied local and bot seats that do not have one yet. */
export function ensureSeatColours(seats: readonly TableSeat[]): TableSeat[] {
  const assigned = new Set<SeatColour>();
  return seats.map((seat) => {
    if (seat.kind === 'empty' || seat.kind === 'online') {
      return seat.kind === 'online' ? { ...seat, colour: undefined } : seat;
    }
    if (isSeatColour(seat.colour)) {
      assigned.add(seat.colour);
      return seat;
    }
    const colour =
      SEAT_COLOUR_PALETTE.find((candidate) => !assigned.has(candidate)) ?? nextColour(seats);
    assigned.add(colour);
    return { ...seat, colour };
  });
}

/** Launch colours indexed by boardgame.io player id (occupied seat order). */
export function occupiedSeatColours(seats: readonly TableSeat[]): Array<SeatColour | undefined> {
  return occupiedSeats(seats).map((seat) =>
    seat.kind === 'online' || !isSeatColour(seat.colour) ? undefined : seat.colour,
  );
}

function paletteIndex(colour: SeatColour): number {
  return SEAT_COLOUR_PALETTE.indexOf(colour);
}

export function seatColoursQuery(seats: readonly TableSeat[]): string | null {
  const colours = occupiedSeatColours(ensureSeatColours(seats));
  if (!colours.some(Boolean)) return null;
  return colours
    .map((colour) => {
      if (!colour) return '-';
      return String(paletteIndex(colour));
    })
    .join(',');
}

export function parseSeatColoursQuery(
  raw: string | null | undefined,
  count: number,
): Array<SeatColour | undefined> {
  if (!raw?.trim()) return [];
  const parts = raw.split(',');
  const colours: Array<SeatColour | undefined> = [];
  for (let i = 0; i < count; i++) {
    const token = parts[i]?.trim();
    if (!token || token === '-') {
      colours.push(undefined);
      continue;
    }
    const index = Number(token);
    const colour = Number.isInteger(index) ? SEAT_COLOUR_PALETTE[index] : undefined;
    colours.push(isSeatColour(colour) ? colour : undefined);
  }
  return colours;
}

export function defaultSeatColours(count: number): SeatColour[] {
  const colours: SeatColour[] = [];
  const used = new Set<SeatColour>();
  for (let i = 0; i < count; i++) {
    const colour =
      SEAT_COLOUR_PALETTE.find((candidate) => !used.has(candidate)) ?? DEFAULT_SEAT_COLOUR;
    used.add(colour);
    colours.push(colour);
  }
  return colours;
}

export function colourForPlayer(
  colours: readonly (SeatColour | undefined)[],
  player: string | number,
): SeatColour | undefined {
  const index = Number(player);
  if (!Number.isInteger(index) || index < 0 || index >= colours.length) return undefined;
  return colours[index];
}

export function appendSeatColoursQuery(
  params: URLSearchParams,
  seats: readonly TableSeat[],
): URLSearchParams {
  const query = seatColoursQuery(ensureSeatColours(seats));
  if (query) params.set('colours', query);
  return params;
}

export function contrastingInk(hex: string): string {
  const raw = hex.replace('#', '');
  if (raw.length !== 6) return '#fbf6ec';
  const r = Number.parseInt(raw.slice(0, 2), 16);
  const g = Number.parseInt(raw.slice(2, 4), 16);
  const b = Number.parseInt(raw.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.55 ? '#1c1917' : '#fbf6ec';
}
