import { describe, expect, it } from 'vitest';
import { browseFocus } from './catalogueFocusNav';
import { catalogueShelves } from './catalogueShelves';
import { GAMES, type GameMeta, visibleGames } from './games';

describe('catalogueFocusNav', () => {
  it('steps along the flat shelf order', () => {
    const shelves = catalogueShelves(visibleGames([]));
    const first = shelves[0]!.games[0]!.id;
    const second = browseFocus(shelves, first, 'next');
    expect(second).not.toBe(first);
    expect(browseFocus(shelves, second, 'prev')).toBe(first);
  });

  it('moves between shelves with up and down', () => {
    const shelves = catalogueShelves(GAMES);
    const boards = shelves.find((s) => s.id === 'boards')!;
    const cards = shelves.find((s) => s.id === 'cards')!;
    const from = boards.games[0]!.id;
    const down = browseFocus(shelves, from, 'down');
    expect(cards.games.some((game) => game.id === down)).toBe(true);
    const up = browseFocus(shelves, down, 'up');
    expect(boards.games.some((game) => game.id === up)).toBe(true);
  });

  it('falls back when focus id is missing', () => {
    const shelves = catalogueShelves(GAMES);
    expect(browseFocus(shelves, 'not-a-game', 'next')).toBe(shelves[0]!.games[0]!.id);
    expect(browseFocus([], 'orphan', 'next')).toBe('orphan');
  });

  it('holds at the ends of the shelf order', () => {
    const shelves = catalogueShelves(GAMES);
    const flat = shelves.flatMap((shelf) => shelf.games);
    const first = flat[0]!.id;
    const last = flat.at(-1)!.id;
    expect(browseFocus(shelves, first, 'prev')).toBe(first);
    expect(browseFocus(shelves, last, 'next')).toBe(last);
  });

  it('keeps focus when the target shelf is empty', () => {
    const game = GAMES.find((entry) => entry.id === 'connect-four')! as GameMeta;
    const shelves = [
      { id: 'boards' as const, label: 'Boards', gameIds: ['connect-four'], games: [game] },
      { id: 'cards' as const, label: 'Cards', gameIds: [], games: [] },
    ];
    expect(browseFocus(shelves, 'connect-four', 'down')).toBe('connect-four');
  });
});
