import { describe, expect, it } from 'vitest';
import { GAMES } from '../lib/games';
import { boards } from './boards';
import { gameList, gamesById } from './registry';

describe('game registry', () => {
  it('keeps catalogue, engine registry, and boards in sync', () => {
    const catalogueIds = GAMES.map((g) => g.id).sort();
    const registryIds = Object.keys(gamesById).sort();
    const boardIds = Object.keys(boards).sort();
    const listNames = gameList.map((g) => g.name).sort();

    expect(registryIds).toEqual(catalogueIds);
    expect(boardIds).toEqual(catalogueIds);
    expect(listNames).toEqual(catalogueIds);
    expect(gameList).toHaveLength(GAMES.length);

    for (const meta of GAMES) {
      expect(gamesById[meta.id as keyof typeof gamesById].name).toBe(meta.id);
    }
  });
});
