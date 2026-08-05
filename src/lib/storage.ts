const NICKNAME_KEY = 'gamescabinet.nickname';
const SEAT_PREFIX = 'gamescabinet.seat.';

export function getNickname(): string {
  return localStorage.getItem(NICKNAME_KEY)?.trim() || '';
}

export function setNickname(name: string): void {
  localStorage.setItem(NICKNAME_KEY, name.trim());
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
