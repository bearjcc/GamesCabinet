import { Client } from 'boardgame.io/client';
import { describe, expect, it } from 'vitest';
import {
  Mancala,
  type MancalaState,
  oppositePit,
  ownPits,
  ownStore,
  P0_STORE,
  P1_STORE,
  PIT_COUNT,
} from './game';

function startClient(setup?: () => MancalaState) {
  const client = Client({
    game: setup ? { ...Mancala, setup } : Mancala,
  });
  client.start();
  return client;
}

function emptyBoard(): number[] {
  return Array(PIT_COUNT).fill(0);
}

describe('Mancala indexing', () => {
  it('maps stores and opposite pits', () => {
    expect(ownStore('0')).toBe(P0_STORE);
    expect(ownStore('1')).toBe(P1_STORE);
    expect(ownPits('0')).toEqual([0, 1, 2, 3, 4, 5]);
    expect(ownPits('1')).toEqual([7, 8, 9, 10, 11, 12]);
    expect(oppositePit(0)).toBe(12);
    expect(oppositePit(5)).toBe(7);
    expect(oppositePit(7)).toBe(5);
  });
});

describe('Mancala', () => {
  it('starts with 4 stones in each pit and empty stores', () => {
    const client = startClient();
    const G = client.getState()?.G as MancalaState;
    expect(G.pits).toHaveLength(14);
    expect(G.pits.slice(0, 6).every((n) => n === 4)).toBe(true);
    expect(G.pits.slice(7, 13).every((n) => n === 4)).toBe(true);
    expect(G.pits[P0_STORE]).toBe(0);
    expect(G.pits[P1_STORE]).toBe(0);
  });

  it('sows counter-clockwise and skips the opponent store', () => {
    const client = startClient();
    // P0 sows pit 5 (4 stones): lands 6,7,8,9 -- includes own store, skips nothing yet
    client.moves.sow(5);
    const G = client.getState()?.G as MancalaState;
    expect(G.pits[5]).toBe(0);
    expect(G.pits[P0_STORE]).toBe(1);
    expect(G.pits[7]).toBe(5);
    expect(G.pits[8]).toBe(5);
    expect(G.pits[9]).toBe(5);
  });

  it('skips opponent store when sowing past it', () => {
    const pits = emptyBoard();
    pits[4] = 10;
    // Avoid a capture on the final pit so we only assert skip behaviour.
    pits[1] = 1;
    // sow pit 4 with 10: 5,6,7,8,9,10,11,12, then skip 13, then 0,1
    const client = startClient(() => ({ pits: [...pits] }));
    client.moves.sow(4);
    const G = client.getState()?.G as MancalaState;
    expect(G.pits[4]).toBe(0);
    expect(G.pits[P0_STORE]).toBe(1);
    expect(G.pits[P1_STORE]).toBe(0); // skipped
    expect(G.pits[0]).toBe(1);
    expect(G.pits[1]).toBe(2);
    expect(G.pits[12]).toBe(1);
  });

  it('grants an extra turn when the last stone lands in own store', () => {
    const client = startClient();
    // pit 2 has 4 stones -> lands on 3,4,5,6 (own store) => extra turn
    client.moves.sow(2);
    expect(client.getState()?.ctx.currentPlayer).toBe('0');
    expect(client.getState()?.G.pits[P0_STORE]).toBe(1);
  });

  it('ends the turn when the last stone does not land in own store', () => {
    const client = startClient();
    client.moves.sow(0);
    expect(client.getState()?.ctx.currentPlayer).toBe('1');
  });

  it('captures from an empty own pit into the opposite pit', () => {
    const pits = emptyBoard();
    // pit 2 has 1, pit 3 empty, opposite 9 has 3; spare stones so the match continues
    pits[2] = 1;
    pits[5] = 1;
    pits[9] = 3;
    pits[11] = 1;
    const client = startClient(() => ({ pits: [...pits] }));
    client.moves.sow(2);
    const G = client.getState()?.G as MancalaState;
    // last stone landed in empty pit 3; capture 1 + 3 from pit 9 into store
    expect(G.pits[3]).toBe(0);
    expect(G.pits[9]).toBe(0);
    expect(G.pits[P0_STORE]).toBe(4);
    expect(client.getState()?.ctx.currentPlayer).toBe('1');
  });

  it('does not capture when the opposite pit is empty', () => {
    const pits = emptyBoard();
    pits[2] = 1;
    pits[11] = 1;
    const client = startClient(() => ({ pits: [...pits] }));
    client.moves.sow(2);
    const G = client.getState()?.G as MancalaState;
    expect(G.pits[3]).toBe(1);
    expect(G.pits[P0_STORE]).toBe(0);
  });

  it('rejects sowing an empty pit', () => {
    const pits = emptyBoard();
    pits[1] = 4;
    const client = startClient(() => ({ pits: [...pits] }));
    const before = structuredClone(client.getState()?.G) as MancalaState;
    client.moves.sow(0);
    expect(client.getState()?.G).toEqual(before);
    expect(client.getState()?.ctx.currentPlayer).toBe('0');
  });

  it('rejects sowing an opponent pit or a store', () => {
    const client = startClient();
    const before = structuredClone(client.getState()?.G) as MancalaState;
    client.moves.sow(7);
    client.moves.sow(P0_STORE);
    expect(client.getState()?.G).toEqual(before);
  });

  it('sweeps remaining pits and ends when one side is empty', () => {
    const pits = emptyBoard();
    pits[5] = 1; // P0 last move empties their side
    pits[7] = 2;
    pits[8] = 3;
    pits[P0_STORE] = 10;
    pits[P1_STORE] = 5;
    const client = startClient(() => ({ pits: [...pits] }));
    client.moves.sow(5);
    const state = client.getState();
    const G = state?.G as MancalaState;
    // P0 sowed 5 into store (extra would apply but side empty ends game)
    // After sow: pit 5 empty, store 11; P0 pits all empty -> sweep P1's 2+3 into P1 store
    expect(G.pits.slice(0, 6).every((n) => n === 0)).toBe(true);
    expect(G.pits.slice(7, 13).every((n) => n === 0)).toBe(true);
    expect(G.pits[P0_STORE]).toBe(11);
    expect(G.pits[P1_STORE]).toBe(10); // 5 + 2 + 3
    expect(state?.ctx.gameover).toEqual({ winner: '0' });
  });

  it('ends in a draw when stores are equal after sweep', () => {
    const pits = emptyBoard();
    pits[5] = 1;
    pits[7] = 1;
    pits[P0_STORE] = 10;
    pits[P1_STORE] = 10;
    // after sow: P0 store 11; sweep 1 into P1 -> 11; equal? 11 vs 11 draw
    const client = startClient(() => ({ pits: [...pits] }));
    client.moves.sow(5);
    expect(client.getState()?.ctx.gameover).toEqual({ draw: true });
  });

  it('enumerates non-empty own pits for AI', () => {
    const pits = emptyBoard();
    pits[1] = 2;
    pits[4] = 1;
    pits[7] = 3;
    const moves = (
      Mancala.ai!.enumerate as (
        G: MancalaState,
        ctx: { currentPlayer: string },
      ) => {
        move: string;
        args: number[];
      }[]
    )({ pits }, { currentPlayer: '0' });
    expect(moves).toEqual([
      { move: 'sow', args: [1] },
      { move: 'sow', args: [4] },
    ]);
  });

  it('lets player 1 sow and skip player 0 store', () => {
    const pits = emptyBoard();
    pits[0] = 1;
    pits[1] = 1; // P0 sow must not capture pit 11
    pits[3] = 1;
    pits[7] = 1; // P1 sow must not capture on final pit
    pits[11] = 9;
    const client = startClient(() => ({ pits: [...pits] }));
    client.moves.sow(0);
    expect(client.getState()?.ctx.currentPlayer).toBe('1');
    client.moves.sow(11);
    const G = client.getState()?.G as MancalaState;
    expect(G.pits[P1_STORE]).toBe(1);
    expect(G.pits[P0_STORE]).toBe(0); // skipped
    expect(G.pits[7]).toBe(2);
  });

  it('ends with player 1 winning after a sweep', () => {
    const pits = emptyBoard();
    pits[0] = 1;
    pits[12] = 1;
    pits[1] = 2;
    pits[P0_STORE] = 5;
    pits[P1_STORE] = 20;
    const client = startClient(() => ({ pits: [...pits] }));
    client.moves.sow(0);
    expect(client.getState()?.ctx.currentPlayer).toBe('1');
    client.moves.sow(12);
    const G = client.getState()?.G as MancalaState;
    expect(G.pits[P1_STORE]).toBe(21);
    expect(G.pits[P0_STORE]).toBe(8);
    expect(client.getState()?.ctx.gameover).toEqual({ winner: '1' });
  });
});
