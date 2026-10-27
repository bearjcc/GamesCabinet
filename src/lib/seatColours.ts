import { getGameMeta } from './games';
import { getSeatColour, isSeatColour, SEAT_COLOUR_PALETTE, type SeatColour } from './storage';
import type { TableSeat } from './tableSetup';

function occupiedSeats(seats: readonly TableSeat[]): TableSeat[] {
  return seats.filter((seat) => seat.kind !== 'empty');
}

function gameMeta(gameId?: string) {
  return gameId ? getGameMeta(gameId) : undefined;
}

export function excludedSeatColoursForGame(gameId?: string): ReadonlySet<SeatColour> {
  const excluded = gameMeta(gameId)?.excludedSeatColours ?? [];
  return new Set(excluded.filter(isSeatColour));
}

/** Palette entries allowed for a game (global palette minus exclusions). */
export function allowedSeatColours(gameId?: string): SeatColour[] {
  const excluded = excludedSeatColoursForGame(gameId);
  return SEAT_COLOUR_PALETTE.filter((colour) => !excluded.has(colour));
}

function nextAssignableColour(assigned: ReadonlySet<SeatColour>, gameId?: string): SeatColour {
  const allowed = allowedSeatColours(gameId);
  return allowed.find((candidate) => !assigned.has(candidate)) ?? allowed[0] ?? getSeatColour();
}

function pickDefaultColours(count: number, gameId?: string): SeatColour[] {
  const meta = gameMeta(gameId);
  const excluded = excludedSeatColoursForGame(gameId);
  const presets = (meta?.launchSeatColours ?? []).filter(
    (colour): colour is SeatColour => isSeatColour(colour) && !excluded.has(colour),
  );
  const colours: SeatColour[] = [];
  const used = new Set<SeatColour>();
  for (let i = 0; i < count; i++) {
    const preset = presets[i];
    if (preset && !used.has(preset)) {
      colours.push(preset);
      used.add(preset);
      continue;
    }
    const colour = nextAssignableColour(used, gameId);
    colours.push(colour);
    used.add(colour);
  }
  return colours;
}

/** Assign palette colours to occupied local and bot seats that do not have one yet. */
export function ensureSeatColours(seats: readonly TableSeat[], gameId?: string): TableSeat[] {
  const excluded = excludedSeatColoursForGame(gameId);
  const presets = gameMeta(gameId)?.launchSeatColours ?? [];
  const assigned = new Set<SeatColour>();
  let occupiedIndex = 0;

  return seats.map((seat) => {
    if (seat.kind === 'empty' || seat.kind === 'online') {
      return seat.kind === 'online' ? { ...seat, colour: undefined } : seat;
    }
    const seatIndex = occupiedIndex;
    occupiedIndex += 1;

    if (isSeatColour(seat.colour) && !excluded.has(seat.colour)) {
      assigned.add(seat.colour);
      return seat;
    }

    const preset = presets[seatIndex];
    let colour: SeatColour;
    if (preset && isSeatColour(preset) && !excluded.has(preset) && !assigned.has(preset)) {
      colour = preset;
    } else {
      colour = nextAssignableColour(assigned, gameId);
    }
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

export function seatColoursQuery(seats: readonly TableSeat[], gameId?: string): string | null {
  const colours = occupiedSeatColours(ensureSeatColours(seats, gameId));
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

export function resolveSeatColours(
  parsed: Array<SeatColour | undefined>,
  count: number,
  gameId?: string,
): SeatColour[] {
  const defaults = defaultSeatColours(count, gameId);
  const excluded = excludedSeatColoursForGame(gameId);
  return defaults.map((fallback, index) => {
    const candidate = parsed[index];
    if (candidate && isSeatColour(candidate) && !excluded.has(candidate)) {
      return candidate;
    }
    return fallback;
  });
}

export function defaultSeatColours(count: number, gameId?: string): SeatColour[] {
  return pickDefaultColours(count, gameId);
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
  gameId?: string,
): URLSearchParams {
  const query = seatColoursQuery(ensureSeatColours(seats, gameId), gameId);
  if (query) params.set('colours', query);
  return params;
}

export function nextSeatColour(current: SeatColour | undefined, gameId?: string): SeatColour {
  const allowed = allowedSeatColours(gameId);
  if (allowed.length === 0) return getSeatColour();
  if (!current || !isSeatColour(current)) return allowed[0]!;
  const index = allowed.indexOf(current);
  if (index < 0) return allowed[0]!;
  return allowed[(index + 1) % allowed.length]!;
}

export function launchSeatColourList(seats: readonly TableSeat[]): Array<SeatColour | undefined> {
  return seats.map((seat) =>
    seat.kind === 'empty' || seat.kind === 'online' || !isSeatColour(seat.colour)
      ? undefined
      : seat.colour,
  );
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
