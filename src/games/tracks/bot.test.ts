import { Client } from 'boardgame.io/client';
import { describe, expect, it, vi } from 'vitest';
import * as botModule from './bot';
import {
  extensionCols,
  finishDraft,
  legalPlacements,
  mainRowFrontierCol,
  pickPlacement,
  placementScore,
  playBotTurn,
} from './bot';
import { ROUNDS, Tracks, type TracksState } from './game';
import { emptyBoard, placeTile, START_ROW, WIDTH } from './grid';
import type { Tile } from './tiles';

let seq = 0;
function tile(kind: Tile['kind']): Tile {
  seq += 1;
  return { id: `t${seq}`, kind };
}

function prepPlayClient(patch: (g: TracksState) => void) {
  return Client({
    game: {
      ...Tracks,
      seed: 'bot-prep',
      setup: () => {
        const g = Tracks.setup!({ ctx: { numPlayers: 2 } } as never) as TracksState;
        g.prepared = true;
        g.draftsDealt = true;
        for (const p of g.players) {
          p.draft = [];
          p.objectives = ['mayor'];
        }
        patch(g);
        return g;
      },
    },
    numPlayers: 2,
  });
}

describe('tracks bot', () => {
  it('finishes draft and advances multiple rounds with greedy bots', { timeout: 30_000 }, () => {
    const client = Client({ game: { ...Tracks, seed: 'bot-module' }, numPlayers: 2 });
    client.start();
    finishDraft(client);
    let steps = 0;
    while (!client.getState()?.ctx.gameover && steps < 12_000) {
      steps++;
      playBotTurn(client, 2);
    }
    expect(client.getState()?.G.round).toBeGreaterThanOrEqual(2);
  });

  it('scores main-row extension and frontier helpers', () => {
    const board = emptyBoard();
    placeTile(board, tile('straight'), START_ROW, 0, 1);
    expect(mainRowFrontierCol(board)).toBe(0);
    expect(extensionCols(board)).toContain(1);
    const straight = tile('straight');
    const better = placementScore(board, straight, START_ROW, 1, 1);
    const worse = placementScore(board, straight, 0, 3, 1);
    expect(better).toBeGreaterThan(worse);
  });

  it('prefers a connecting destination play over blocking the terminal', () => {
    const board = emptyBoard();
    for (let c = 0; c < WIDTH - 1; c++) {
      placeTile(board, tile('straight'), START_ROW, c, 1);
    }
    const g = {
      players: [{ board }, { board: emptyBoard() }],
    } as Parameters<typeof pickPlacement>[1];
    const end = tile('straight');
    const spots = legalPlacements(g, 0, end);
    const pick = pickPlacement(spots, g, 0, end);
    expect(pick.col).toBe(WIDTH - 1);
    expect(pick.rot).toBe(1);
  });

  it('reshuffles the discard pile when the deck is empty and the top discard does not fit', () => {
    const client = prepPlayClient((g) => {
      g.deck = [];
      g.discard = [tile('straight'), tile('curve')];
      for (const p of g.players) {
        for (let i = 0; i < WIDTH * 3; i++) {
          placeTile(p.board, tile('obstacle'), Math.floor(i / WIDTH), i % WIDTH, 0);
        }
      }
    });
    client.start();
    expect(playBotTurn(client, 2)).toBe('ok');
    expect(client.getState()?.G.drawnId).not.toBeNull();
  });

  it('draws from the discard pile when the deck is empty and the top card fits', () => {
    const top = tile('straight');
    const client = prepPlayClient((g) => {
      g.deck = [];
      g.discard = [top];
    });
    client.start();
    expect(playBotTurn(client, 2)).toBe('ok');
    expect(client.getState()?.G.drawnId).toBe(top.id);
  });

  it('returns stuck when drawnId does not resolve to a card', () => {
    const client = prepPlayClient((g) => {
      g.drawnId = 'ghost';
    });
    client.start();
    expect(playBotTurn(client, 2)).toBe('stuck');
  });

  it('returns stuck when the draw pile and discard are empty', () => {
    const client = prepPlayClient((g) => {
      g.deck = [];
      g.discard = [];
    });
    client.start();
    expect(playBotTurn(client, 2)).toBe('stuck');
  });

  it('routes obstacles away from the home main line when attacking', () => {
    const home = emptyBoard();
    const away = emptyBoard();
    const obs = tile('obstacle');
    const g = {
      players: [{ board: home }, { board: away }],
    } as Parameters<typeof pickPlacement>[1];
    const spots = legalPlacements(g, 0, obs);
    const pick = pickPlacement(spots, g, 0, obs);
    expect(pick.target).toBe(1);
  });

  it('returns stuck when a forced discard has no legal placements', () => {
    vi.spyOn(botModule, 'legalPlacements').mockReturnValue([]);
    const held = tile('curve');
    const client = prepPlayClient((g) => {
      g.drawnId = held.id;
      g.drewFromDiscard = true;
      g.players[0].hand = [held];
    });
    client.start();
    expect(playBotTurn(client, 2)).toBe('stuck');
    vi.restoreAllMocks();
  });

  it('falls back to any legal spot on a forced discard draw', () => {
    const board = emptyBoard();
    for (let c = 0; c < WIDTH - 1; c++) {
      placeTile(board, tile('straight'), START_ROW, c, 1);
    }
    const endCurve = tile('curve');
    const client = prepPlayClient((g) => {
      g.players[0].board = board;
      g.drawnId = endCurve.id;
      g.drewFromDiscard = true;
      g.discard = [endCurve];
      g.players[0].hand = [];
    });
    client.start();
    expect(playBotTurn(client, 2)).toBe('ok');
  });

  it('keeps solo obstacles off the home main line', () => {
    const board = emptyBoard();
    const obs = tile('obstacle');
    const g = {
      players: [{ board }],
    } as Parameters<typeof pickPlacement>[1];
    const spots = legalPlacements(g, 0, obs);
    const pick = pickPlacement(spots, g, 0, obs);
    expect(pick.row).not.toBe(START_ROW);
  });

  it('reports over when the match has ended', () => {
    const client = Client({
      game: {
        ...Tracks,
        seed: 'bot-over',
        setup: (ctx) => {
          const g = Tracks.setup!(ctx) as TracksState;
          g.round = ROUNDS + 1;
          return g;
        },
      },
      numPlayers: 2,
    });
    client.start();
    expect(playBotTurn(client, 2)).toBe('over');
  });
});
