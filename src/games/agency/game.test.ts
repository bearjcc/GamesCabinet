import { Client } from 'boardgame.io/client';
import { describe, expect, it, vi } from 'vitest';
import { INVALID_MOVE } from '../invalidMove';
import {
  type AgencyState,
  applyBuildingPassives,
  assignPerson,
  buyCard,
  canAssignPerson,
  canBuyCard,
  canContribute,
  canPlayCard,
  checkGameEnd,
  contributeMission,
  endTurnCleanup,
  missionComplete,
  missionThreshold,
  playCard,
  resolveMissionIfReady,
} from './actions';
import { buildStartingDeck, ERA_TARGET_SOLO, EXPLORER_I, HAND_SIZE } from './cards';
import { Agency } from './game';

function shuffle<T>(arr: T[]): void {
  arr.reverse();
}

function baseState(overrides: Partial<AgencyState> = {}): AgencyState {
  const deck = buildStartingDeck();
  return {
    eraScore: 0,
    rivalScore: 0,
    funding: 0,
    innovation: 0,
    deck: deck.slice(HAND_SIZE),
    hand: deck.slice(0, HAND_SIZE),
    discard: [],
    playArea: [],
    market: ['funding-1', 'innovation-1', 'person-engineer', 'test-rocket'],
    marketDeck: [],
    marketDiscard: [],
    buildings: [
      { id: 'research-facility', assigned: [] },
      { id: 'administration-building', assigned: [] },
      { id: 'mission-control', assigned: [] },
    ],
    mission: { defId: EXPLORER_I.id, fundingPlaced: 0, innovationPlaced: 0 },
    turns: 0,
    ...overrides,
  };
}

type AgencyClient = ReturnType<typeof startClient>;

function startClient(state?: AgencyState) {
  const client = Client({
    game: state ? { ...Agency, setup: () => state } : Agency,
    numPlayers: 1,
  });
  client.start();
  return client;
}

function readG(client: AgencyClient): AgencyState {
  const state = client.getState();
  if (!state) throw new Error('missing state');
  return state.G;
}

describe('Agency actions', () => {
  it('plays funding card and gains token', () => {
    const G = baseState({ hand: ['funding-1'], funding: 0 });
    expect(playCard(G, 'funding-1', shuffle)).toBe(true);
    expect(G.funding).toBe(1);
    expect(G.hand).toEqual([]);
    expect(G.discard).toContain('funding-1');
  });

  it('assigns person to building and keeps them there', () => {
    const G = baseState({ hand: ['person-technician'] });
    expect(canAssignPerson(G, 'person-technician', 'research-facility')).toBe(true);
    expect(assignPerson(G, 'person-technician', 'research-facility')).toBe(true);
    expect(G.hand).toEqual([]);
    expect(G.buildings[0].assigned).toEqual(['person-technician']);
    expect(canAssignPerson(G, 'person-analyst', 'research-facility')).toBe(false);
  });

  it('mission control reduces mission threshold', () => {
    const G = baseState({
      buildings: [
        { id: 'research-facility', assigned: [] },
        { id: 'administration-building', assigned: [] },
        { id: 'mission-control', assigned: ['person-technician', 'person-analyst'] },
      ],
      mission: { defId: EXPLORER_I.id, fundingPlaced: 2, innovationPlaced: 1 },
    });
    const need = missionThreshold(G.mission, G.buildings);
    expect(need).toEqual({ funding: 2, innovation: 1 });
    expect(missionComplete(G)).toBe(true);
  });

  it('buys from market when affordable', () => {
    const G = baseState({ funding: 3 });
    expect(canBuyCard(G, 0)).toBe(true);
    expect(buyCard(G, 0, shuffle)).toBe(true);
    expect(G.funding).toBe(1);
    expect(G.discard).toContain('funding-1');
  });

  it('contributes tokens to mission', () => {
    const G = baseState({ funding: 2, innovation: 1 });
    expect(canContribute(G, 2, 1)).toBe(true);
    expect(contributeMission(G, 2, 1)).toBe(true);
    expect(G.mission.fundingPlaced).toBe(2);
    expect(G.funding).toBe(0);
  });

  it('rejects invalid play, assign, buy, and contribute', () => {
    const G = baseState({ hand: ['funding-1'], funding: 0 });
    expect(canPlayCard(G, 'missing')).toBe(false);
    expect(playCard(G, 'missing', shuffle)).toBe(false);
    expect(canAssignPerson(G, 'funding-1', 'research-facility')).toBe(false);
    expect(assignPerson(G, 'funding-1', 'research-facility')).toBe(false);
    expect(canBuyCard(G, 0)).toBe(false);
    expect(canContribute(G, 0, 0)).toBe(false);
    expect(contributeMission(G, 5, 0)).toBe(false);
  });

  it('plays person for one-shot resources and program with draw', () => {
    const G = baseState({
      hand: ['person-engineer', 'operations-team'],
      deck: ['funding-1'],
    });
    expect(playCard(G, 'person-engineer', shuffle)).toBe(true);
    expect(G.funding).toBe(1);
    expect(G.innovation).toBe(1);
    expect(playCard(G, 'operations-team', shuffle)).toBe(true);
    expect(G.hand).toContain('funding-1');
  });

  it('applies building passives and resolves mission on cleanup', () => {
    const G = baseState({
      buildings: [
        { id: 'research-facility', assigned: ['person-analyst'] },
        { id: 'administration-building', assigned: ['person-technician'] },
        { id: 'mission-control', assigned: [] },
      ],
      funding: 0,
      innovation: 0,
      mission: {
        defId: EXPLORER_I.id,
        fundingPlaced: EXPLORER_I.fundingRequired,
        innovationPlaced: EXPLORER_I.innovationRequired,
      },
      hand: ['funding-1'],
      deck: [],
      discard: [
        'funding-1',
        'innovation-1',
        'innovation-1',
        'funding-1',
        'funding-1',
        'innovation-1',
      ],
    });
    applyBuildingPassives(G);
    expect(G.innovation).toBe(1);
    expect(G.funding).toBe(1);
    expect(resolveMissionIfReady(G)).toBe(true);
    expect(G.eraScore).toBe(EXPLORER_I.eraReward);
    endTurnCleanup(G, shuffle);
    expect(G.rivalScore).toBe(1);
    expect(G.hand).toHaveLength(HAND_SIZE);
  });

  it('refills market from discard when deck empty', () => {
    const G = baseState({
      funding: 5,
      market: ['funding-1', '', '', ''],
      marketDeck: [],
      marketDiscard: ['innovation-1'],
    });
    expect(buyCard(G, 0, shuffle)).toBe(true);
    expect(G.market.some((id) => id === 'innovation-1')).toBe(true);
  });

  it('leaves empty market slot when no cards remain', () => {
    const G = baseState({
      funding: 5,
      market: ['funding-1', '', '', ''],
      marketDeck: [],
      marketDiscard: [],
    });
    expect(buyCard(G, 0, shuffle)).toBe(true);
    expect(G.market.filter(Boolean)).toHaveLength(0);
  });

  it('rejects full building slots', () => {
    const G = baseState({
      hand: ['person-analyst'],
      buildings: [
        {
          id: 'research-facility',
          assigned: ['person-technician', 'person-engineer'],
        },
        { id: 'administration-building', assigned: [] },
        { id: 'mission-control', assigned: [] },
      ],
    });
    expect(canAssignPerson(G, 'person-analyst', 'research-facility')).toBe(false);
  });

  it('checkGameEnd detects rival win', () => {
    const G = baseState({ rivalScore: ERA_TARGET_SOLO });
    expect(checkGameEnd(G)).toEqual({ winner: 'rival' });
  });

  it('resolveMissionIfReady returns false when mission incomplete', () => {
    const G = baseState();
    expect(resolveMissionIfReady(G)).toBe(false);
  });

  it('rejects negative contribution amounts', () => {
    const G = baseState({ funding: 2 });
    expect(canContribute(G, -1, 0)).toBe(false);
  });
});

describe('Agency game', () => {
  it('setups with hand and market', () => {
    const client = startClient();
    const G = readG(client);
    expect(G.hand.length).toBe(HAND_SIZE);
    expect(G.market.length).toBe(4);
    expect(G.buildings).toHaveLength(3);
  });

  it('applies staffed building passives when a turn begins', () => {
    const client = startClient(
      baseState({
        buildings: [
          { id: 'research-facility', assigned: ['person-analyst'] },
          { id: 'administration-building', assigned: ['person-technician'] },
          { id: 'mission-control', assigned: [] },
        ],
        innovation: 0,
        funding: 0,
      }),
    );
    const G = readG(client);
    expect(G.innovation).toBe(1);
    expect(G.funding).toBe(1);
  });

  it('plays, buys, and contributes through client moves', () => {
    const client = startClient(
      baseState({
        hand: ['funding-1', 'innovation-1'],
        funding: 4,
        market: ['person-engineer', 'innovation-1', 'funding-1', 'test-rocket'],
      }),
    );
    client.moves.playCard('funding-1');
    client.moves.playCard('innovation-1');
    let G = readG(client);
    expect(G.funding).toBe(5);
    expect(G.innovation).toBe(1);
    client.moves.buyCard(1);
    client.moves.contribute(2, 1);
    G = readG(client);
    expect(G.mission.fundingPlaced).toBe(2);
    expect(G.mission.innovationPlaced).toBe(1);
  });

  it('assignPerson move via client', () => {
    const client = startClient(
      baseState({
        hand: ['person-technician'],
        deck: [],
      }),
    );
    client.moves.assignPerson('person-technician', 'administration-building');
    const G = readG(client);
    expect(G.buildings.find((b) => b.id === 'administration-building')?.assigned).toEqual([
      'person-technician',
    ]);
  });

  it('endTurn fires endGame for rival and player wins', () => {
    const random = { Shuffle: <T>(items: T[]) => [...items] };
    const ctx = { currentPlayer: '0' };
    const endTurn = Agency.moves!.endTurn as (...args: unknown[]) => unknown;

    const rivalG = baseState({
      rivalScore: ERA_TARGET_SOLO - 1,
      hand: [],
      deck: [],
      discard: ['funding-1', 'innovation-1', 'funding-1', 'innovation-1', 'funding-1'],
    });
    const rivalEvents = { endGame: vi.fn() };
    endTurn({ G: rivalG, random, ctx, events: rivalEvents });
    expect(rivalEvents.endGame).toHaveBeenCalledWith({
      winner: 'rival',
      eraScore: rivalG.eraScore,
    });

    const playerG = baseState({
      eraScore: ERA_TARGET_SOLO - 1,
      mission: {
        defId: EXPLORER_I.id,
        fundingPlaced: EXPLORER_I.fundingRequired,
        innovationPlaced: EXPLORER_I.innovationRequired,
      },
      hand: [],
      deck: [],
      discard: ['funding-1', 'innovation-1', 'funding-1', 'innovation-1', 'funding-1'],
    });
    const playerEvents = { endGame: vi.fn() };
    endTurn({ G: playerG, random, ctx, events: playerEvents });
    expect(playerEvents.endGame).toHaveBeenCalledWith({
      winner: 'player',
      eraScore: playerG.eraScore,
    });
  });

  it('move handlers reject illegal actions', () => {
    const G = baseState({ hand: ['funding-1'], funding: 0 });
    const random = { Shuffle: <T>(items: T[]) => [...items] };
    const ctx = { currentPlayer: '0' };
    const play = Agency.moves!.playCard as (...args: unknown[]) => unknown;
    const assign = Agency.moves!.assignPerson as (...args: unknown[]) => unknown;
    const buy = Agency.moves!.buyCard as (...args: unknown[]) => unknown;
    const contribute = Agency.moves!.contribute as (...args: unknown[]) => unknown;
    expect(play({ G, random, ctx }, 'missing')).toBe(INVALID_MOVE);
    expect(assign({ G, ctx }, 'funding-1', 'research-facility')).toBe(INVALID_MOVE);
    expect(buy({ G, random, ctx }, 0)).toBe(INVALID_MOVE);
    expect(contribute({ G, ctx }, 9, 9)).toBe(INVALID_MOVE);
  });

  it('ends game when rival track reaches target', () => {
    const client = startClient(
      baseState({
        rivalScore: ERA_TARGET_SOLO - 1,
        hand: [],
        deck: [],
      }),
    );
    client.moves.endTurn();
    expect(client.getState()?.ctx.gameover).toMatchObject({ winner: 'rival' });
  });

  it('ends game when era score reaches target', () => {
    const client = startClient(
      baseState({
        eraScore: ERA_TARGET_SOLO - 1,
        mission: {
          defId: EXPLORER_I.id,
          fundingPlaced: EXPLORER_I.fundingRequired,
          innovationPlaced: EXPLORER_I.innovationRequired,
        },
        hand: [],
        deck: [],
      }),
    );
    client.moves.endTurn();
    const state = client.getState();
    expect(state).not.toBeNull();
    expect(state?.ctx.gameover).toMatchObject({ winner: 'player' });
  });
});
