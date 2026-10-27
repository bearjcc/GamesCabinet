import { describe, expect, it } from 'vitest';
import {
  catalogueShelves,
  defaultFocusGameId,
  flatShelfGames,
  shelfGameAt,
} from './catalogueShelves';
import { GAMES, visibleGames } from './games';

describe('catalogueShelves', () => {
  it('places every visible game on a shelf once', () => {
    const visible = visibleGames(['tracks', 'hogwarts-battle', 'orbits']);
    const shelves = catalogueShelves(visible);
    const listed = flatShelfGames(shelves).map((game) => game.id);
    expect(new Set(listed).size).toBe(listed.length);
    for (const game of visible) {
      expect(listed).toContain(game.id);
    }
  });

  it('omits a draw shelf and keeps big games first', () => {
    const shelves = catalogueShelves(GAMES);
    expect(shelves[0]?.id).toBe('big-games');
    expect(shelves.some((shelf) => shelf.label.toLowerCase().includes('draw'))).toBe(false);
  });

  it('resolves shelf position for focus navigation', () => {
    const shelves = catalogueShelves(GAMES);
    const spot = shelfGameAt(shelves, 'connect-four');
    expect(spot?.shelf.id).toBe('boards');
    expect(defaultFocusGameId(shelves)).toBeTruthy();
    expect(shelfGameAt(shelves, 'missing-game')).toBeNull();
  });

  it('parks unknown visible games on the boards shelf', () => {
    const mystery = {
      ...GAMES[0]!,
      id: 'mystery-game',
      name: 'Mystery',
    };
    const shelves = catalogueShelves([mystery]);
    expect(shelves.find((shelf) => shelf.id === 'boards')?.games[0]?.id).toBe('mystery-game');
  });

  it('appends unlisted games to an existing boards shelf', () => {
    const c4 = GAMES.find((game) => game.id === 'connect-four')!;
    const extra = { ...c4, id: 'bonus-game', name: 'Bonus' };
    const boards = catalogueShelves([c4, extra]).find((shelf) => shelf.id === 'boards')!;
    expect(boards.games.map((game) => game.id)).toContain('bonus-game');
  });

  it('falls back when no game is visible', () => {
    expect(defaultFocusGameId([])).toBe('connect-four');
    expect(flatShelfGames([])).toEqual([]);
  });
});
