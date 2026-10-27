import type { CatalogueShelfView } from './catalogueShelves';
import { flatShelfGames } from './catalogueShelves';

export function browseFocus(
  shelves: readonly CatalogueShelfView[],
  focusId: string,
  direction: 'prev' | 'next' | 'up' | 'down',
): string {
  const flat = flatShelfGames(shelves);
  const index = flat.findIndex((game) => game.id === focusId);
  if (index < 0) return flat[0]?.id ?? focusId;

  if (direction === 'prev') {
    return flat[Math.max(0, index - 1)]!.id;
  }
  if (direction === 'next') {
    return flat[Math.min(flat.length - 1, index + 1)]!.id;
  }

  let shelfIndex = 0;
  let offset = 0;
  for (let s = 0; s < shelves.length; s++) {
    const games = shelves[s]!.games;
    const local = games.findIndex((game) => game.id === focusId);
    if (local >= 0) {
      shelfIndex = s;
      offset = local;
      break;
    }
  }

  const targetShelf =
    direction === 'up' ? Math.max(0, shelfIndex - 1) : Math.min(shelves.length - 1, shelfIndex + 1);
  const targetGames = shelves[targetShelf]!.games;
  if (!targetGames.length) return focusId;
  const targetIndex = Math.min(offset, targetGames.length - 1);
  return targetGames[targetIndex]!.id;
}
