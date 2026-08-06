const NICKNAME_KEY = 'gamescabinet.nickname';
const SEAT_PREFIX = 'gamescabinet.seat.';
export const SEAT_COLOUR_KEY = 'gamescabinet.seatColour';

/** Fixed palette for default seat / pawn colour preference. */
export const SEAT_COLOUR_PALETTE = [
  '#c0392b',
  '#e67e22',
  '#f1c40f',
  '#27ae60',
  '#2980b9',
  '#8e44ad',
] as const;

export type SeatColour = (typeof SEAT_COLOUR_PALETTE)[number];

export const DEFAULT_SEAT_COLOUR: SeatColour = SEAT_COLOUR_PALETTE[4];

export function isSeatColour(value: string | null | undefined): value is SeatColour {
  return !!value && (SEAT_COLOUR_PALETTE as readonly string[]).includes(value);
}

export function getNickname(): string {
  return localStorage.getItem(NICKNAME_KEY)?.trim() || '';
}

export function setNickname(name: string): void {
  localStorage.setItem(NICKNAME_KEY, name.trim());
}

export function getSeatColour(): SeatColour {
  try {
    const raw = localStorage.getItem(SEAT_COLOUR_KEY);
    return isSeatColour(raw) ? raw : DEFAULT_SEAT_COLOUR;
  } catch {
    return DEFAULT_SEAT_COLOUR;
  }
}

export function setSeatColour(colour: SeatColour): void {
  if (!isSeatColour(colour)) return;
  try {
    localStorage.setItem(SEAT_COLOUR_KEY, colour);
  } catch {
    /* private mode / quota */
  }
}

export type SeatSession = {
  matchID: string;
  playerID: string;
  credentials: string;
  gameName: string;
};

export function saveSeat(session: SeatSession): void {
  localStorage.setItem(
    `${SEAT_PREFIX}${session.gameName}:${session.matchID}`,
    JSON.stringify(session),
  );
}

export function loadSeat(gameName: string, matchID: string): SeatSession | null {
  const raw = localStorage.getItem(`${SEAT_PREFIX}${gameName}:${matchID}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SeatSession;
  } catch {
    return null;
  }
}

export function clearSeat(gameName: string, matchID: string): void {
  localStorage.removeItem(`${SEAT_PREFIX}${gameName}:${matchID}`);
}
