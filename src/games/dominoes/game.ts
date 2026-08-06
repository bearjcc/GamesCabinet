import type { Game } from 'boardgame.io';
import { INVALID_MOVE } from '../invalidMove';

/** Double-six draw Dominoes. First double played is the spinner (4 arms). */
export type Tile = { a: number; b: number; id: string };

export type PlacedTile = {
  tile: Tile;
  x: number;
  y: number;
  rot: 0 | 90 | 180 | 270;
};

export type Dir = 'N' | 'E' | 'S' | 'W';

export type OpenEnd = {
  id: string;
  value: number;
  x: number;
  y: number;
  dir: Dir;
};

export type DominoesState = {
  hands: Tile[][];
  boneyard: Tile[];
  ends: OpenEnd[];
  board: PlacedTile[];
  spinnerId: string | null;
};

function allTiles(): Tile[] {
  const tiles: Tile[] = [];
  for (let a = 0; a <= 6; a++) {
    for (let b = a; b <= 6; b++) {
      tiles.push({ a, b, id: `${a}-${b}` });
    }
  }
  return tiles;
}

function isDouble(t: Tile): boolean {
  return t.a === t.b;
}

function pipSum(hand: Tile[]): number {
  return hand.reduce((s, t) => s + t.a + t.b, 0);
}

function step(x: number, y: number, d: Dir): { x: number; y: number } {
  if (d === 'N') return { x, y: y - 1 };
  if (d === 'S') return { x, y: y + 1 };
  if (d === 'E') return { x: x + 1, y };
  return { x: x - 1, y };
}

export function rotationForEnd(dir: Dir, tile: Tile, attachValue: number): 0 | 90 | 180 | 270 {
  const attachIsA = tile.a === attachValue;
  if (dir === 'E') return attachIsA ? 0 : 180;
  if (dir === 'W') return attachIsA ? 180 : 0;
  if (dir === 'S') return attachIsA ? 90 : 270;
  return attachIsA ? 270 : 90;
}

/** The exact board transform used by the move and by the placement preview. */
export function placementForEnd(end: OpenEnd, tile: Tile): Pick<PlacedTile, 'x' | 'y' | 'rot'> {
  return {
    x: end.x,
    y: end.y,
    rot: rotationForEnd(end.dir, tile, end.value),
  };
}

function freeValue(tile: Tile, attachValue: number): number {
  return tile.a === attachValue ? tile.b : tile.a;
}

export function playableEndIndexes(G: DominoesState, tile: Tile): number[] {
  if (G.board.length === 0) return [-1];
  const vals = new Set([tile.a, tile.b]);
  return G.ends.map((e, i) => (vals.has(e.value) ? i : -1)).filter((i) => i >= 0);
}

export function canPlayAny(G: DominoesState, player: number): boolean {
  return G.hands[player].some((t) => playableEndIndexes(G, t).length > 0);
}

export function canDraw(G: DominoesState, player: number): boolean {
  return !canPlayAny(G, player) && G.boneyard.length > 0;
}

export function canPass(G: DominoesState, player: number): boolean {
  return !canPlayAny(G, player) && G.boneyard.length === 0;
}

export const Dominoes: Game<DominoesState> = {
  name: 'dominoes',
  setup: ({ ctx, random }) => {
    const n = ctx.numPlayers;
    const deck = random.Shuffle(allTiles());
    const handSize = n <= 2 ? 7 : 5;
    const hands: Tile[][] = [];
    for (let i = 0; i < n; i++) hands.push(deck.splice(0, handSize));
    return {
      hands,
      boneyard: deck,
      ends: [],
      board: [],
      spinnerId: null,
    };
  },
  turn: { minMoves: 1, maxMoves: 40 },
  moves: {
    playTile: ({ G, ctx, events }, handIndex: number, endIndex: number) => {
      const pid = Number(ctx.currentPlayer);
      const hand = G.hands[pid];
      const tile = hand[handIndex];
      if (!tile) return INVALID_MOVE;

      if (G.board.length === 0) {
        if (endIndex !== -1) return INVALID_MOVE;
        hand.splice(handIndex, 1);
        G.board.push({
          tile,
          x: 0,
          y: 0,
          rot: isDouble(tile) ? 90 : 0,
        });
        if (isDouble(tile)) {
          G.spinnerId = tile.id;
          G.ends = [
            { id: `${tile.id}-N`, value: tile.a, x: 0, y: -1, dir: 'N' },
            { id: `${tile.id}-E`, value: tile.a, x: 1, y: 0, dir: 'E' },
            { id: `${tile.id}-S`, value: tile.a, x: 0, y: 1, dir: 'S' },
            { id: `${tile.id}-W`, value: tile.a, x: -1, y: 0, dir: 'W' },
          ];
        } else {
          G.ends = [
            { id: `${tile.id}-W`, value: tile.a, x: -1, y: 0, dir: 'W' },
            { id: `${tile.id}-E`, value: tile.b, x: 1, y: 0, dir: 'E' },
          ];
        }
        events.endTurn();
        return;
      }

      const end = G.ends[endIndex];
      if (!end) return INVALID_MOVE;
      if (tile.a !== end.value && tile.b !== end.value) return INVALID_MOVE;

      hand.splice(handIndex, 1);
      const pos = { x: end.x, y: end.y };
      G.board.push({ tile, ...placementForEnd(end, tile) });
      G.ends.splice(endIndex, 1);
      const free = freeValue(tile, end.value);
      const becomeSpinner = isDouble(tile) && G.spinnerId === null;

      if (becomeSpinner) {
        G.spinnerId = tile.id;
        const cont = step(pos.x, pos.y, end.dir);
        G.ends.push({
          id: `${tile.id}-${end.dir}`,
          value: free,
          ...cont,
          dir: end.dir,
        });
        const perps: Dir[] = end.dir === 'E' || end.dir === 'W' ? ['N', 'S'] : ['E', 'W'];
        for (const d of perps) {
          const p = step(pos.x, pos.y, d);
          G.ends.push({ id: `${tile.id}-${d}`, value: free, ...p, dir: d });
        }
      } else {
        const cont = step(pos.x, pos.y, end.dir);
        G.ends.push({
          id: `${tile.id}-${end.dir}`,
          value: free,
          ...cont,
          dir: end.dir,
        });
      }
      events.endTurn();
    },
    drawTile: ({ G, ctx }) => {
      const pid = Number(ctx.currentPlayer);
      if (!canDraw(G, pid)) return INVALID_MOVE;
      G.hands[pid].push(G.boneyard.pop()!);
    },
    pass: ({ G, ctx, events }) => {
      const pid = Number(ctx.currentPlayer);
      if (!canPass(G, pid)) return INVALID_MOVE;
      events.endTurn();
    },
  },
  endIf: ({ G, ctx }) => {
    for (let i = 0; i < ctx.numPlayers; i++) {
      if (G.hands[i].length === 0) return { winner: String(i) };
    }
    const anyoneCan = G.boneyard.length > 0 || G.hands.some((_, i) => canPlayAny(G, i));
    if (!anyoneCan) {
      let best = 0;
      let bestScore = Infinity;
      for (let i = 0; i < ctx.numPlayers; i++) {
        const s = pipSum(G.hands[i]);
        if (s < bestScore) {
          bestScore = s;
          best = i;
        }
      }
      return { winner: String(best), blocked: true };
    }
  },
  ai: {
    enumerate: (G, ctx) => {
      const moves: { move: string; args: unknown[] }[] = [];
      const hand = G.hands[Number(ctx.currentPlayer)];
      hand.forEach((tile, hi) => {
        for (const ei of playableEndIndexes(G, tile)) {
          moves.push({ move: 'playTile', args: [hi, ei] });
        }
      });
      if (moves.length === 0 && G.boneyard.length > 0) {
        moves.push({ move: 'drawTile', args: [] });
      } else if (moves.length === 0) {
        moves.push({ move: 'pass', args: [] });
      }
      return moves;
    },
  },
};
