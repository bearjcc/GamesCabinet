/** Normalise a room code for lookup (trim + uppercase). Empty after trim is invalid. */
export function normaliseRoomCode(code: string): string | null {
  const matchID = String(code || '')
    .trim()
    .toUpperCase();
  return matchID || null;
}
