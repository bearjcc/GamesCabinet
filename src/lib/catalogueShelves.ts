import { type GameMeta, getGameMeta, isGameVisible } from './games';

export type CatalogueShelfId = 'big-games' | 'boards' | 'cards' | 'dice-tiles-words';

export type CatalogueShelf = {
  id: CatalogueShelfId;
  label: string;
  gameIds: readonly string[];
};

/** Shelf order and membership (Draw shelf omitted until those games ship). */
export const CATALOGUE_SHELF_DEFS: readonly CatalogueShelf[] = [
  {
    id: 'big-games',
    label: 'Big games',
    gameIds: ['tracks', 'hogwarts-battle', 'orbits'],
  },
  {
    id: 'boards',
    label: 'Boards',
    gameIds: [
      'connect-four',
      'chess',
      'checkers',
      'reversi',
      'go',
      'backgammon',
      'tic-tac-toe',
      'mancala',
      'chinese-checkers',
      'battleship',
      'nine-mens-morris',
      'dots-and-boxes',
      'snakes-and-ladders',
    ],
  },
  {
    id: 'cards',
    label: 'Cards',
    gameIds: ['klondike', 'freecell', 'crazy-eights', 'go-fish', 'war', 'memory'],
  },
  {
    id: 'dice-tiles-words',
    label: 'Dice, tiles & words',
    gameIds: ['yatzy', '2048', 'dominoes', 'letter-walker', 'nim'],
  },
];

export type CatalogueShelfGame = GameMeta & {
  /** Access-gated title shown on the shelf but not yet unlocked. */
  catalogueLocked?: boolean;
};

export type CatalogueShelfView = CatalogueShelf & {
  games: CatalogueShelfGame[];
};

/** How many lids show before the dashed “N more” tile (boards row only). */
export const BOARDS_SHELF_COLLAPSED_LIMIT = 5;

export function catalogueShelves(
  visible: readonly GameMeta[],
  unlocked: readonly string[] = [],
): CatalogueShelfView[] {
  const byId = new Map(visible.map((game) => [game.id, game]));
  const placed = new Set<string>();
  const shelves: CatalogueShelfView[] = [];

  for (const def of CATALOGUE_SHELF_DEFS) {
    let games: CatalogueShelfGame[];
    if (def.id === 'big-games') {
      games = def.gameIds
        .map((id) => getGameMeta(id))
        .filter((game): game is GameMeta => !!game)
        .map((game) => ({
          ...game,
          catalogueLocked: !isGameVisible(game, unlocked),
        }));
    } else {
      games = def.gameIds
        .map((id) => byId.get(id))
        .filter((game): game is GameMeta => !!game)
        .map((game) => ({ ...game }));
    }
    for (const game of games) placed.add(game.id);
    if (games.length) shelves.push({ ...def, games });
  }

  const overflow = visible.filter((game) => !placed.has(game.id));
  if (overflow.length) {
    const boards = shelves.find((shelf) => shelf.id === 'boards');
    if (boards) boards.games = [...boards.games, ...overflow.map((game) => ({ ...game }))];
    else shelves.push({ id: 'boards', label: 'Boards', gameIds: [], games: [...overflow] });
  }

  return shelves;
}

export function flatShelfGames(shelves: readonly CatalogueShelfView[]): CatalogueShelfGame[] {
  return shelves.flatMap((shelf) => shelf.games);
}

export function shelfGameAt(
  shelves: readonly CatalogueShelfView[],
  gameId: string,
): { shelf: CatalogueShelfView; index: number } | null {
  for (const shelf of shelves) {
    const index = shelf.games.findIndex((game) => game.id === gameId);
    if (index >= 0) return { shelf, index };
  }
  return null;
}

export function defaultFocusGameId(shelves: readonly CatalogueShelfView[]): string {
  const flat = flatShelfGames(shelves);
  return flat.find((game) => game.id === 'connect-four')?.id ?? flat[0]?.id ?? 'connect-four';
}
