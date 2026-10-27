/** Comma-separated seat labels from `?names=Bear,Ana,Kit` (local / hot-seat). */
export function parseSeatNamesQuery(
  raw: string | null | undefined,
  numPlayers: number,
): readonly string[] | undefined {
  if (!raw?.trim()) return undefined;
  const parts = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) return undefined;
  return Array.from({ length: numPlayers }, (_, i) => parts[i] ?? parts[parts.length - 1]!);
}
