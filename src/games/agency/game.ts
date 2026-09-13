import type { Game } from 'boardgame.io';
import { INVALID_MOVE } from '../invalidMove';
import {
  type AgencyState,
  applyBuildingPassives,
  assignPerson,
  buyCard,
  checkGameEnd,
  contributeMission,
  emptyBuildings,
  endTurnCleanup,
  playCard,
} from './actions';
import { buildMarketDeck, buildStartingDeck, EXPLORER_I, HAND_SIZE } from './cards';

const MARKET_SIZE = 4;

function shuffleInPlace<T>(arr: T[], random: { Shuffle: (items: T[]) => T[] }): void {
  const shuffled = random.Shuffle([...arr]);
  arr.length = 0;
  arr.push(...shuffled);
}

export const Agency: Game<AgencyState> = {
  name: 'agency',
  minPlayers: 1,
  maxPlayers: 1,

  setup: ({ random }) => {
    const deck = buildStartingDeck();
    shuffleInPlace(deck, random);
    const hand = deck.splice(0, HAND_SIZE);

    const marketDeck = buildMarketDeck();
    shuffleInPlace(marketDeck, random);
    const market = marketDeck.splice(0, MARKET_SIZE);

    return {
      eraScore: 0,
      rivalScore: 0,
      funding: 0,
      innovation: 0,
      deck,
      hand,
      discard: [],
      playArea: [],
      market,
      marketDeck,
      marketDiscard: [],
      buildings: emptyBuildings(),
      mission: { defId: EXPLORER_I.id, fundingPlaced: 0, innovationPlaced: 0 },
      turns: 0,
    };
  },

  moves: {
    playCard: ({ G, random }, cardId: string) => {
      if (!playCard(G, cardId, (arr) => shuffleInPlace(arr, random))) return INVALID_MOVE;
    },
    assignPerson: ({ G }, cardId: string, buildingId: string) => {
      if (!assignPerson(G, cardId, buildingId as AgencyState['buildings'][0]['id'])) {
        return INVALID_MOVE;
      }
    },
    buyCard: ({ G, random }, marketIndex: number) => {
      if (!buyCard(G, marketIndex, (arr) => shuffleInPlace(arr, random))) return INVALID_MOVE;
    },
    contribute: ({ G }, funding: number, innovation: number) => {
      if (!contributeMission(G, funding, innovation)) return INVALID_MOVE;
    },
    endTurn: ({ G, random, events }) => {
      endTurnCleanup(G, (arr) => shuffleInPlace(arr, random));
      const outcome = checkGameEnd(G);
      if (outcome?.winner === 'player') {
        events.endGame?.({ winner: 'player', eraScore: G.eraScore });
      } else if (outcome?.winner === 'rival') {
        events.endGame?.({ winner: 'rival', eraScore: G.eraScore });
      }
    },
  },

  turn: {
    onBegin: ({ G }) => {
      applyBuildingPassives(G);
    },
  },

  endIf: ({ G }) => {
    const outcome = checkGameEnd(G);
    if (outcome?.winner === 'player') {
      return { winner: 'player', eraScore: G.eraScore };
    }
    if (outcome?.winner === 'rival') {
      return { winner: 'rival', eraScore: G.eraScore };
    }
    return undefined;
  },
};
