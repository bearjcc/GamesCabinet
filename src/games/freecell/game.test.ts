import { Client } from 'boardgame.io/client';
import { describe, expect, it } from 'vitest';
import { makeCard } from '../shared/cards';
import {
  dealFreeCell,
  emptyFreeCell,
  FreeCell,
  type FreeCellState,
  foundationCount,
  isLegalCascadeRun,
  maxSupermove,
} from './game';

function startClient(seed = 'freecell-test') {
  const client = Client({ game: { ...FreeCell, seed }, numPlayers: 1 });
  client.start();
  return client;
}

function GOf(client: ReturnType<typeof startClient>): FreeCellState {
  const state = client.getState();
  if (!state) throw new Error('missing state');
  return state.G as FreeCellState;
}

function clientWithSetup(setup: () => FreeCellState, seed = 'setup') {
  const client = Client({
    game: { ...FreeCell, seed, setup },
    numPlayers: 1,
  });
  client.start();
  return client;
}

describe('FreeCell', () => {
  it('names the game freecell', () => {
    expect(FreeCell.name).toBe('freecell');
  });

  it('deals 8 cascades 7/7/7/7/6/6/6/6, empty freecells and foundations', () => {
    const client = startClient();
    const G = GOf(client);
    expect(G.cascades).toHaveLength(8);
    const lengths = G.cascades.map((c) => c.length);
    expect(lengths).toEqual([7, 7, 7, 7, 6, 6, 6, 6]);
    expect(G.cascades.flat()).toHaveLength(52);
    expect(G.freecells).toEqual([null, null, null, null]);
    expect(G.foundations).toHaveLength(4);
    expect(G.foundations.every((f) => f.length === 0)).toBe(true);
    expect(foundationCount(G)).toBe(0);
  });

  it('dealFreeCell uses the full 52-card deck without duplicates', () => {
    const suits = ['clubs', 'diamonds', 'hearts', 'spades'] as const;
    const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;
    const deck = Array.from({ length: 52 }, (_, i) =>
      makeCard(suits[Math.floor(i / 13)], ranks[i % 13]),
    );
    const G = dealFreeCell(deck);
    const ids = [...G.cascades.flat(), ...G.foundations.flat(), ...G.freecells.filter(Boolean)].map(
      (c) => c!.id,
    );
    expect(new Set(ids).size).toBe(52);
  });

  it('cascadeToFreecell parks the top card in an empty freecell', () => {
    const client = clientWithSetup(() => {
      const G = emptyFreeCell();
      G.cascades[0] = [makeCard('hearts', '5')];
      return G;
    });
    client.moves.cascadeToFreecell(0, 2);
    const G = GOf(client);
    expect(G.cascades[0]).toEqual([]);
    expect(G.freecells[2]?.id).toBe('hearts-5');
  });

  it('cascadeToFreecell rejects occupied freecell or empty cascade', () => {
    const client = clientWithSetup(() => {
      const G = emptyFreeCell();
      G.cascades[0] = [makeCard('hearts', '5')];
      G.freecells[1] = makeCard('clubs', '3');
      return G;
    });
    const before = structuredClone(GOf(client));
    client.moves.cascadeToFreecell(0, 1);
    client.moves.cascadeToFreecell(3, 0);
    expect(GOf(client)).toEqual(before);
  });

  it('freecellToCascade builds alternating descending; empty cascade accepts any card', () => {
    const any = clientWithSetup(() => {
      const G = emptyFreeCell();
      G.freecells[0] = makeCard('diamonds', '4');
      return G;
    });
    any.moves.freecellToCascade(0, 0);
    expect(GOf(any).cascades[0].map((c) => c.id)).toEqual(['diamonds-4']);
    expect(GOf(any).freecells[0]).toBeNull();

    const build = clientWithSetup(() => {
      const G = emptyFreeCell();
      G.cascades[1] = [makeCard('spades', '10')];
      G.freecells[2] = makeCard('hearts', '9');
      return G;
    });
    build.moves.freecellToCascade(2, 1);
    expect(GOf(build).cascades[1].map((c) => c.id)).toEqual(['spades-10', 'hearts-9']);

    const bad = clientWithSetup(() => {
      const G = emptyFreeCell();
      G.cascades[1] = [makeCard('spades', '10')];
      G.freecells[2] = makeCard('clubs', '9');
      return G;
    });
    bad.moves.freecellToCascade(2, 1);
    expect(GOf(bad).freecells[2]?.id).toBe('clubs-9');
  });

  it('cascadeToFoundation and freecellToFoundation build Ace-up same suit', () => {
    const fromCascade = clientWithSetup(() => {
      const G = emptyFreeCell();
      G.cascades[0] = [makeCard('hearts', 'A')];
      return G;
    });
    fromCascade.moves.cascadeToFoundation(0);
    expect(foundationCount(GOf(fromCascade))).toBe(1);
    expect(GOf(fromCascade).foundations.some((f) => f[0]?.id === 'hearts-A')).toBe(true);

    const fromFree = clientWithSetup(() => {
      const G = emptyFreeCell();
      G.foundations[0] = [makeCard('spades', 'A')];
      G.freecells[0] = makeCard('spades', '2');
      return G;
    });
    fromFree.moves.freecellToFoundation(0);
    expect(GOf(fromFree).foundations[0].map((c) => c.id)).toEqual(['spades-A', 'spades-2']);
    expect(GOf(fromFree).freecells[0]).toBeNull();

    const reject = clientWithSetup(() => {
      const G = emptyFreeCell();
      G.cascades[0] = [makeCard('hearts', '3')];
      return G;
    });
    reject.moves.cascadeToFoundation(0);
    expect(GOf(reject).cascades[0]).toHaveLength(1);
  });

  it('cascadeToCascade moves a legal run when supermove capacity allows', () => {
    const client = clientWithSetup(() => {
      const G = emptyFreeCell();
      G.cascades[0] = [makeCard('hearts', '7'), makeCard('spades', '6')];
      G.cascades[1] = [makeCard('clubs', '8')];
      return G;
    });
    // 4 empty freecells, 6 empty cascades (excluding dest) => plenty of capacity
    client.moves.cascadeToCascade(0, 1, 2);
    const G = GOf(client);
    expect(G.cascades[0]).toEqual([]);
    expect(G.cascades[1].map((c) => c.id)).toEqual(['clubs-8', 'hearts-7', 'spades-6']);
  });

  it('cascadeToCascade rejects illegal runs, destinations, or oversized supermoves', () => {
    const illegalRun = clientWithSetup(() => {
      const G = emptyFreeCell();
      G.cascades[0] = [makeCard('hearts', '7'), makeCard('hearts', '6')];
      G.cascades[1] = [makeCard('spades', '8')];
      return G;
    });
    const beforeRun = structuredClone(GOf(illegalRun));
    illegalRun.moves.cascadeToCascade(0, 1, 2);
    expect(GOf(illegalRun)).toEqual(beforeRun);

    // Fill freecells; leave only one empty cascade that is the destination.
    // emptyFreecells=0, emptyCascades(excl dest)=0 => max = 1; two-card move fails.
    const tight = clientWithSetup(() => {
      const G = emptyFreeCell();
      G.freecells = [
        makeCard('clubs', 'A'),
        makeCard('diamonds', 'A'),
        makeCard('hearts', 'A'),
        makeCard('spades', 'A'),
      ];
      for (let i = 0; i < 8; i++) {
        if (i === 0 || i === 1) continue;
        G.cascades[i] = [makeCard('clubs', 'K')];
      }
      G.cascades[0] = [makeCard('hearts', '7'), makeCard('spades', '6')];
      G.cascades[1] = [makeCard('clubs', '8')];
      return G;
    });
    expect(maxSupermove(GOf(tight), 1)).toBe(1);
    const beforeTight = structuredClone(GOf(tight));
    tight.moves.cascadeToCascade(0, 1, 2);
    expect(GOf(tight)).toEqual(beforeTight);

    // Single card still moves when build is legal (black 6 onto red 7).
    const single = clientWithSetup(() => {
      const G = emptyFreeCell();
      G.freecells = [
        makeCard('clubs', 'A'),
        makeCard('diamonds', 'A'),
        makeCard('hearts', 'A'),
        makeCard('spades', 'A'),
      ];
      for (let i = 0; i < 8; i++) {
        if (i === 0 || i === 1) continue;
        G.cascades[i] = [makeCard('clubs', 'K')];
      }
      G.cascades[0] = [makeCard('hearts', '5'), makeCard('spades', '6')];
      G.cascades[1] = [makeCard('hearts', '7')];
      return G;
    });
    single.moves.cascadeToCascade(0, 1, 1);
    expect(GOf(single).cascades[1].map((c) => c.id)).toEqual(['hearts-7', 'spades-6']);
  });

  it('ends with won when all 52 cards are on foundations', () => {
    const client = clientWithSetup(() => {
      const G = emptyFreeCell();
      const suits = ['clubs', 'diamonds', 'hearts', 'spades'] as const;
      const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;
      for (let s = 0; s < 4; s++) {
        for (const rank of ranks) {
          if (s === 3 && rank === 'K') continue;
          G.foundations[s].push(makeCard(suits[s], rank));
        }
      }
      G.cascades[0] = [makeCard('spades', 'K')];
      return G;
    });
    expect(client.getState()?.ctx.gameover).toBeUndefined();
    client.moves.cascadeToFoundation(0);
    expect(client.getState()?.ctx.gameover).toEqual({ won: true, score: 52 });
  });

  it('isLegalCascadeRun rejects empty and non-alternating stacks', () => {
    expect(isLegalCascadeRun([])).toBe(false);
    expect(isLegalCascadeRun([makeCard('hearts', '7'), makeCard('spades', '5')])).toBe(false);
    expect(isLegalCascadeRun([makeCard('hearts', '7'), makeCard('spades', '6')])).toBe(true);
  });

  it('rejects out-of-range indices and empty sources', () => {
    const empty = clientWithSetup(() => emptyFreeCell());
    empty.moves.cascadeToFreecell(0, 0);
    empty.moves.cascadeToFoundation(0);
    empty.moves.freecellToCascade(0, 0);
    empty.moves.freecellToFoundation(0);
    expect(GOf(empty)).toEqual(emptyFreeCell());

    const client = clientWithSetup(() => {
      const G = emptyFreeCell();
      G.cascades[0] = [makeCard('hearts', '5')];
      G.freecells[0] = makeCard('clubs', 'K');
      return G;
    });
    const before = structuredClone(GOf(client));
    client.moves.cascadeToFreecell(-1, 1);
    client.moves.cascadeToFreecell(0, 4);
    client.moves.cascadeToFoundation(9);
    client.moves.cascadeToCascade(0, 0, 1);
    client.moves.cascadeToCascade(0, 1, 0);
    client.moves.cascadeToCascade(0, 1, 1.5);
    client.moves.cascadeToCascade(0, 1, 2);
    client.moves.freecellToCascade(4, 1);
    client.moves.freecellToFoundation(-1);
    expect(GOf(client)).toEqual(before);
  });

  it('freecellToFoundation rejects cards that do not build', () => {
    const client = clientWithSetup(() => {
      const G = emptyFreeCell();
      G.freecells[0] = makeCard('hearts', '3');
      return G;
    });
    client.moves.freecellToFoundation(0);
    expect(GOf(client).freecells[0]?.id).toBe('hearts-3');
    expect(foundationCount(GOf(client))).toBe(0);
  });

  it('cascadeToCascade rejects a legal run that does not build on the destination', () => {
    const client = clientWithSetup(() => {
      const G = emptyFreeCell();
      G.cascades[0] = [makeCard('hearts', '7'), makeCard('spades', '6')];
      G.cascades[1] = [makeCard('diamonds', '9')];
      return G;
    });
    const before = structuredClone(GOf(client));
    client.moves.cascadeToCascade(0, 1, 2);
    expect(GOf(client)).toEqual(before);
  });

  it('dealFreeCell throws when the deck is the wrong length', () => {
    expect(() => dealFreeCell([makeCard('clubs', 'A')])).toThrow(/exhausted/);
    const suits = ['clubs', 'diamonds', 'hearts', 'spades'] as const;
    const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;
    const deck = Array.from({ length: 52 }, (_, i) =>
      makeCard(suits[Math.floor(i / 13)], ranks[i % 13]),
    );
    expect(() => dealFreeCell([...deck, makeCard('clubs', 'A')])).toThrow(/leftover/);
  });
});
