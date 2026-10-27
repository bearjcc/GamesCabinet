import { defaultSeatColours } from './seatColours';
import { getNickname, type SeatColour } from './storage';

/** Player-facing label for a palette seat colour. */
const PALETTE_LABELS: Record<SeatColour, string> = {
  '#d63328': 'Red',
  '#3a6fad': 'Blue',
  '#ed9f18': 'Yellow',
  '#5f8536': 'Green',
};

export function seatColourLabel(colour: SeatColour): string {
  return PALETTE_LABELS[colour] ?? 'Seat';
}

/** Default name for a boardgame.io player id when lobby metadata is missing. */
export function defaultSeatDisplayName(playerID: string): string {
  const index = Number(playerID);
  if (!Number.isFinite(index) || index < 0) {
    return `Seat ${playerID}`;
  }
  if (index === 0) {
    const nick = getNickname();
    if (nick) return nick;
    return 'You';
  }
  const colours = defaultSeatColours(Math.max(index + 1, 2));
  return seatColourLabel(colours[index]!);
}
