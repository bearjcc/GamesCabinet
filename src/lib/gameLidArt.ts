/** Box-lid art is not ready; show the cabinet placeholder on the home shelf. */
const LID_PLACEHOLDER_GAMES = new Set(['hogwarts-battle', 'orbits', 'backgammon', 'letter-walker']);

export function usesLidPlaceholder(gameId: string): boolean {
  return LID_PLACEHOLDER_GAMES.has(gameId);
}
