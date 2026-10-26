import { defaultSeatColours } from './seatColours';
import { getNickname, type SeatColour } from './storage';

/** Player-facing label for a palette seat colour (logo names land in step 4). */
const PALETTE_LABELS: Record<SeatColour, string> = {
  '#c0392b': 'Red',
  '#e67e22': 'Orange',
  '#f1c40f': 'Yellow',
  '#27ae60': 'Green',
  '#2980b9': 'Blue',
  '#8e44ad': 'Purple',
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
  }
  const colours = defaultSeatColours(Math.max(index + 1, 2));
  return seatColourLabel(colours[index]!);
}
