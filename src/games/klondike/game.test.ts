import { Client } from 'boardgame.io/client';
import { describe, expect, it } from 'vitest';
import { makeCard } from '../shared/cards';
import {
  dealKlondike,
  emptyKlondike,
  foundationCount,
  isLegalRun,
  Klondike,
  type KlondikeState,
  type TableCard,
} from './game';

function startClient(seed = 'klondike-test') {
  const client = Client({ game: { ...Klondike, seed }, numPlayers: 1 });
  client.start();
  return client;
}

function GOf(client: ReturnType<typeof startClient>): KlondikeState {
  const state = client.getState();
  if (!state) throw new Error('missing state');
  return state.G as KlondikeState;
}

function clientWithSetup(setup: () => KlondikeState, seed = 'setup') {
  const client = Client({
    game: { ...Klondike, seed, setup },
    numPlayers: 1,
  });
  client.start();
  return client;
}

function face(card: ReturnType<typeof makeCard>, faceUp = true): TableCard {
  return { ...card, faceUp };
}

describe('Klondike', () => {
  it('names the game klondike', () => {
    expect(Klondike.name).toBe('klondike');
  });

  it('deals 7 tableau columns (1..7), stock remainder, empty waste and foundations', () => {
    const client = startClient();
    const G = GOf(client);
    expect(G.tableau).toHaveLength(7);
    let tableauCards = 0;
    for (let col = 0; col < 7; col++) {
      expect(G.tableau[col]).toHaveLength(col + 1);
      tableauCards += G.tableau[col].length;
      const top = G.tableau[col][G.tableau[col].length - 1];
      expect(top.faceUp).toBe(true);
      for (let i = 0; i < G.tableau[col].length - 1; i++) {
        expect(G.tableau[col][i].faceUp).toBe(false);
      }
    }
    expect(tableauCards).toBe(28);
    expect(G.stock).toHaveLength(24);
    expect(G.stock.every((c) => !c.faceUp)).toBe(true);
    expect(G.waste).toEqual([]);
    expect(G.foundations).toHaveLength(4);
    expect(G.foundations.every((f) => f.length === 0)).toBe(true);
    expect(foundationCount(G) + G.stock.length + G.waste.length + tableauCards).toBe(52);
  });

  it('dealKlondike uses the full 52-card deck without duplicates', () => {
    const deck = [
      ...Array.from({ length: 52 }, (_, i) => {
        const suits = ['clubs', 'diamonds', 'hearts', 'spades'] as const;
        const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;
        return makeCard(suits[Math.floor(i / 13)], ranks[i % 13]);
      }),
    ];
    const G = dealKlondike(deck);
    const ids = [...G.stock, ...G.waste, ...G.foundations.flat(), ...G.tableau.flat()].map(
      (c) => c.id,
    );
    expect(new Set(ids).size).toBe(52);
  });

  it('draw moves stock top to waste face-up', () => {
    const client = startClient();
    const before = GOf(client);
    const expected = before.stock[0];
    client.moves.draw();
    const G = GOf(client);
    expect(G.stock).toHaveLength(23);
    expect(G.waste).toHaveLength(1);
    expect(G.waste[0].id).toBe(expected.id);
    expect(G.waste[0].faceUp).toBe(true);
  });

  it('draw recycles waste into stock face-down when stock is empty', () => {
    const client = clientWithSetup(() => {
      const G = emptyKlondike();
      G.waste = [
        face(makeCard('clubs', 'A')),
        face(makeCard('hearts', '2')),
        face(makeCard('spades', '3')),
      ];
      return G;
    });
    client.moves.draw();
    const G = GOf(client);
    expect(G.waste).toEqual([]);
    expect(G.stock).toHaveLength(3);
    expect(G.stock.every((c) => !c.faceUp)).toBe(true);
    expect(G.stock.map((c) => c.id)).toEqual(['clubs-A', 'hearts-2', 'spades-3']);
  });

  it('draw is illegal when stock and waste are empty', () => {
    const client = clientWithSetup(() => emptyKlondike());
    client.moves.draw();
    expect(GOf(client)).toEqual(emptyKlondike());
  });

  it('wasteToFoundation places an Ace on an empty foundation', () => {
    const client = clientWithSetup(() => {
      const G = emptyKlondike();
      G.waste = [face(makeCard('hearts', 'A'))];
      return G;
    });
    client.moves.wasteToFoundation();
    const G = GOf(client);
    expect(G.waste).toEqual([]);
    expect(foundationCount(G)).toBe(1);
    expect(G.foundations.some((f) => f[0]?.id === 'hearts-A')).toBe(true);
  });

  it('wasteToFoundation builds same suit ascending and rejects illegal', () => {
    const client = clientWithSetup(() => {
      const G = emptyKlondike();
      G.foundations[0] = [face(makeCard('spades', 'A'))];
      G.waste = [face(makeCard('hearts', '2'))];
      return G;
    });
    const before = GOf(client);
    client.moves.wasteToFoundation();
    expect(GOf(client)).toEqual(before);

    const ok = clientWithSetup(() => {
      const G = emptyKlondike();
      G.foundations[0] = [face(makeCard('spades', 'A'))];
      G.waste = [face(makeCard('spades', '2'))];
      return G;
    });
    ok.moves.wasteToFoundation();
    expect(GOf(ok).foundations[0].map((c) => c.id)).toEqual(['spades-A', 'spades-2']);
  });

  it('wasteToTableau places on alternating colour descending and King on empty', () => {
    const kingClient = clientWithSetup(() => {
      const G = emptyKlondike();
      G.waste = [face(makeCard('clubs', 'K'))];
      return G;
    });
    kingClient.moves.wasteToTableau(0);
    expect(GOf(kingClient).tableau[0].map((c) => c.id)).toEqual(['clubs-K']);
    expect(GOf(kingClient).waste).toEqual([]);

    const bad = clientWithSetup(() => {
      const G = emptyKlondike();
      G.waste = [face(makeCard('hearts', 'Q'))];
      return G;
    });
    bad.moves.wasteToTableau(1);
    expect(GOf(bad).waste).toHaveLength(1);

    const build = clientWithSetup(() => {
      const G = emptyKlondike();
      G.tableau[2] = [face(makeCard('spades', '10'))];
      G.waste = [face(makeCard('hearts', '9'))];
      return G;
    });
    build.moves.wasteToTableau(2);
    expect(GOf(build).tableau[2].map((c) => c.id)).toEqual(['spades-10', 'hearts-9']);
  });

  it('tableauToFoundation moves the face-up top and flips the newly exposed card', () => {
    const client = clientWithSetup(() => {
      const G = emptyKlondike();
      G.tableau[0] = [face(makeCard('clubs', '5'), false), face(makeCard('diamonds', 'A'))];
      return G;
    });
    client.moves.tableauToFoundation(0);
    const G = GOf(client);
    expect(G.foundations.some((f) => f[0]?.id === 'diamonds-A')).toBe(true);
    expect(G.tableau[0]).toHaveLength(1);
    expect(G.tableau[0][0].id).toBe('clubs-5');
    expect(G.tableau[0][0].faceUp).toBe(true);
  });

  it('tableauToFoundation rejects illegal builds', () => {
    const client = clientWithSetup(() => {
      const G = emptyKlondike();
      G.tableau[0] = [face(makeCard('hearts', '3'))];
      return G;
    });
    client.moves.tableauToFoundation(0);
    expect(GOf(client).tableau[0]).toHaveLength(1);
    expect(foundationCount(GOf(client))).toBe(0);
  });

  it('tableauToTableau moves a legal face-up run and flips the exposed card', () => {
    const client = clientWithSetup(() => {
      const G = emptyKlondike();
      G.tableau[0] = [
        face(makeCard('diamonds', 'J'), false),
        face(makeCard('hearts', '7')),
        face(makeCard('spades', '6')),
      ];
      G.tableau[1] = [face(makeCard('clubs', '8'))];
      return G;
    });
    client.moves.tableauToTableau(0, 1, 2);
    const G = GOf(client);
    expect(G.tableau[0].map((c) => c.id)).toEqual(['diamonds-J']);
    expect(G.tableau[0][0].faceUp).toBe(true);
    expect(G.tableau[1].map((c) => c.id)).toEqual(['clubs-8', 'hearts-7', 'spades-6']);
  });

  it('tableauToTableau rejects illegal runs or destinations', () => {
    const client = clientWithSetup(() => {
      const G = emptyKlondike();
      G.tableau[0] = [face(makeCard('hearts', '7')), face(makeCard('hearts', '6'))];
      G.tableau[1] = [face(makeCard('spades', '8'))];
      return G;
    });
    const before = structuredClone(GOf(client));
    client.moves.tableauToTableau(0, 1, 2);
    expect(GOf(client)).toEqual(before);

    client.moves.tableauToTableau(0, 1, 1);
    expect(GOf(client)).toEqual(before);
  });

  it('ends with won when all 52 cards are on foundations', () => {
    const client = clientWithSetup(() => {
      const G = emptyKlondike();
      const suits = ['clubs', 'diamonds', 'hearts', 'spades'] as const;
      const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;
      for (let s = 0; s < 4; s++) {
        for (const rank of ranks) {
          if (s === 3 && rank === 'K') continue;
          G.foundations[s].push(face(makeCard(suits[s], rank)));
        }
      }
      G.tableau[0] = [face(makeCard('spades', 'K'))];
      return G;
    });
    expect(client.getState()?.ctx.gameover).toBeUndefined();
    client.moves.tableauToFoundation(0);
    expect(client.getState()?.ctx.gameover).toEqual({ won: true, score: 52 });
  });

  it('isLegalRun rejects empty, face-down, and non-descending stacks', () => {
    expect(isLegalRun([])).toBe(false);
    expect(isLegalRun([face(makeCard('hearts', '7'), false)])).toBe(false);
    expect(isLegalRun([face(makeCard('hearts', '7')), face(makeCard('spades', '5'))])).toBe(false);
  });

  it('dealKlondike throws when the deck is too short', () => {
    expect(() => dealKlondike([makeCard('clubs', 'A')])).toThrow(/exhausted/);
  });

  it('rejects empty sources and out-of-range columns', () => {
    const empty = clientWithSetup(() => emptyKlondike());
    empty.moves.wasteToFoundation();
    empty.moves.wasteToTableau(0);
    empty.moves.tableauToFoundation(0);
    expect(GOf(empty)).toEqual(emptyKlondike());

    const client = clientWithSetup(() => {
      const G = emptyKlondike();
      G.waste = [face(makeCard('clubs', 'K'))];
      G.tableau[0] = [face(makeCard('hearts', '5'), false)];
      G.tableau[1] = [face(makeCard('spades', 'Q')), face(makeCard('hearts', 'J'))];
      G.tableau[2] = [face(makeCard('clubs', 'Q'))];
      return G;
    });
    const before = structuredClone(GOf(client));
    client.moves.wasteToTableau(-1);
    client.moves.wasteToTableau(7);
    client.moves.tableauToFoundation(9);
    client.moves.tableauToFoundation(0);
    client.moves.tableauToTableau(1, 1, 1);
    client.moves.tableauToTableau(1, 2, 0);
    client.moves.tableauToTableau(1, 2, 1.5);
    client.moves.tableauToTableau(1, 2, 3);
    expect(GOf(client)).toEqual(before);

    // Leave a face-up card under a moved run (flipExposed no-op on already face-up).
    client.moves.tableauToTableau(1, 2, 1);
    expect(GOf(client).tableau[1].map((c) => c.id)).toEqual(['spades-Q']);
    expect(GOf(client).tableau[1][0].faceUp).toBe(true);
    expect(GOf(client).tableau[2].map((c) => c.id)).toEqual(['clubs-Q', 'hearts-J']);
  });
});
