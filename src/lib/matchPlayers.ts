import type { FilteredMetadata } from 'boardgame.io';

export type PlayerNameOptions = {
  matchData?: FilteredMetadata;
  /** Game-specific seat labels (colour, symbol, hero name). */
  nameForPlayer?: (playerID: string) => string;
};

/** Display name for a seat: lobby name, custom label, or Player N. */
export function playerDisplayName(
  playerID: string,
  { matchData, nameForPlayer }: PlayerNameOptions = {},
): string {
  const custom = nameForPlayer?.(playerID);
  if (custom?.trim()) return custom.trim();

  const index = Number(playerID);
  if (Number.isFinite(index)) {
    const lobby = matchData?.[index]?.name?.trim();
    if (lobby) return lobby;
    return `Player ${index + 1}`;
  }

  return `Player ${playerID}`;
}

/** Turn line for the active seat — always names who is up. */
export function turnStatusText(
  currentPlayer: string,
  options?: PlayerNameOptions,
  hint?: string,
): string {
  const name = playerDisplayName(currentPlayer, options);
  const base = `${name}'s turn`;
  const trimmedHint = hint?.trim();
  return trimmedHint ? `${base} — ${trimmedHint}` : base;
}

/** Pull an action hint from legacy "Your turn — …" copy. */
export function hintFromLegacyYourTurn(label: string | undefined): string | undefined {
  if (!label?.trim()) return undefined;
  const trimmed = label.trim();
  const dash = /^your turn\s*[—–-]\s*(.+)$/i.exec(trimmed);
  if (dash) return dash[1].trim();
  const space = /^your turn\s+(.+)$/i.exec(trimmed);
  if (space) return space[1].trim();
  if (/^your turn\.?$/i.test(trimmed)) return undefined;
  return trimmed;
}
