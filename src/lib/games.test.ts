import { describe, expect, it } from 'vitest';
import {
  catalogueGroups,
  findGameByAccessCode,
  GAMES,
  type GameMeta,
  getGameMeta,
  isAccessGated,
  isGameVisible,
  isSoloOnly,
  soloPlayPath,
  supportsBotPlay,
  supportsLocalPlay,
  visibleGames,
} from './games';

describe('games catalogue', () => {
  it('finds metadata by id', () => {
    expect(getGameMeta('2048')?.name).toBe('2048');
    expect(getGameMeta('missing')).toBeUndefined();
  });

  it('detects local and bot support flags', () => {
    const solo = getGameMeta('2048')!;
    const local = getGameMeta('tic-tac-toe')!;
    expect(supportsLocalPlay(solo)).toBe(true);
    expect(supportsBotPlay(solo)).toBe(false);
    expect(supportsLocalPlay(local)).toBe(true);
    expect(supportsBotPlay(local)).toBe(true);
    expect(GAMES.length).toBeGreaterThan(0);
  });

  it('marks solo-only titles from explicit soloOnly flag', () => {
    expect(isSoloOnly(getGameMeta('2048')!)).toBe(true);
    expect(isSoloOnly(getGameMeta('letter-walker')!)).toBe(true);
    expect(isSoloOnly(getGameMeta('klondike')!)).toBe(true);
    expect(isSoloOnly(getGameMeta('freecell')!)).toBe(true);
    expect(isSoloOnly(getGameMeta('orbits')!)).toBe(true);
    expect(isSoloOnly(getGameMeta('yatzy')!)).toBe(false);
    expect(isSoloOnly(getGameMeta('hogwarts-battle')!)).toBe(false);
    expect(isSoloOnly(getGameMeta('tic-tac-toe')!)).toBe(false);
  });

  it('builds solo play paths without table setup', () => {
    expect(soloPlayPath('2048')).toBe('/play/2048');
  });

  it('partitions the catalogue without duplicating games', () => {
    const groups = catalogueGroups();
    expect(groups.map((g) => g.id)).toEqual(['solo', 'with-others']);
    const listed = groups.flatMap((g) => g.games.map((game) => game.id));
    expect(listed).toHaveLength(GAMES.length);
    expect(new Set(listed).size).toBe(GAMES.length);
    expect(groups[0]?.games.every(isSoloOnly)).toBe(true);
    expect(groups[1]?.games.every((g) => !isSoloOnly(g))).toBe(true);
  });

  it('keeps catalogue blurbs free of pipeline notes', () => {
    for (const game of GAMES) {
      expect(game.blurb, game.id).not.toMatch(/\bGame \d+\b/);
      expect(game.blurb, game.id).not.toMatch(/\bPhase \d+\b/);
    }
  });

  it('omits empty catalogue groups', () => {
    expect(catalogueGroups([])).toEqual([]);
    const soloOnly = GAMES.filter(isSoloOnly);
    expect(catalogueGroups(soloOnly).map((g) => g.id)).toEqual(['solo']);
    const withOthersOnly = GAMES.filter((g) => !isSoloOnly(g));
    expect(catalogueGroups(withOthersOnly).map((g) => g.id)).toEqual(['with-others']);
  });
});

describe('access codes', () => {
  const open: GameMeta = {
    id: 'open-game',
    name: 'Open Game',
    blurb: 'Visible to all.',
    minPlayers: 2,
    maxPlayers: 2,
    hasBot: true,
  };
  const hidden: GameMeta = {
    id: 'hidden-game',
    name: 'Hidden Game',
    blurb: 'Behind a code.',
    minPlayers: 1,
    maxPlayers: 1,
    hasBot: false,
    accessCode: '  Shelf-Word  ',
  };

  it('marks games with an access code as gated', () => {
    expect(isAccessGated(hidden)).toBe(true);
    expect(isAccessGated(open)).toBe(false);
  });

  it('shows open games and hides gated games until unlocked', () => {
    expect(isGameVisible(open, [])).toBe(true);
    expect(isGameVisible(hidden, [])).toBe(false);
    expect(isGameVisible(hidden, ['hidden-game'])).toBe(true);
  });

  it('filters the catalogue down to visible games', () => {
    expect(visibleGames([], [open, hidden])).toEqual([open]);
    expect(visibleGames(['hidden-game'], [open, hidden])).toEqual([open, hidden]);
    expect(visibleGames([])).toEqual(GAMES.filter((g) => !isAccessGated(g)));
    expect(visibleGames(GAMES.filter(isAccessGated).map((g) => g.id))).toEqual(GAMES);
  });

  it('finds gated games by access code, ignoring case and whitespace', () => {
    const games = [open, hidden];
    expect(findGameByAccessCode('shelf-word', games)).toBe(hidden);
    expect(findGameByAccessCode('  SHELF-WORD ', games)).toBe(hidden);
    expect(findGameByAccessCode('wrong', games)).toBeUndefined();
    expect(findGameByAccessCode('   ', games)).toBeUndefined();
    expect(findGameByAccessCode('anything', [])).toBeUndefined();
  });

  it('unlocks Hogwarts Battle with LUNALOVEGOOD and enables private online play', () => {
    const hogwarts = getGameMeta('hogwarts-battle')!;
    expect(hogwarts.accessCode).toBe('LUNALOVEGOOD');
    expect(findGameByAccessCode('lunalovegood')).toBe(hogwarts);
    expect(hogwarts.hasOnline).toBe(true);
    expect(hogwarts.hasSolo).toBe(true);
    expect(hogwarts.hasLocal).toBe(true);
    expect(isGameVisible(hogwarts, [])).toBe(false);
    expect(isGameVisible(hogwarts, ['hogwarts-battle'])).toBe(true);
  });
});
