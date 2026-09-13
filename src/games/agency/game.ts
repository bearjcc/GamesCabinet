import type { Game } from 'boardgame.io';
import { INVALID_MOVE } from '../invalidMove';
import {
  type AgencyState,
  applyFacilityPassives,
  assignPerson,
  buyCard,
  checkGameEnd,
  contributeMission,
  endTurnCleanup,
  placeFacility,
  playCard,
  starterFacilities,
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
      facilities: starterFacilities(),
      nextFacilityInstance: 0,
      mission: { defId: EXPLORER_I.id, fundingPlaced: 0, innovationPlaced: 0 },
      turns: 0,
    };
  },

  moves: {
    playCard: ({ G, random }, cardId: string) => {
      if (!playCard(G, cardId, (arr) => shuffleInPlace(arr, random))) return INVALID_MOVE;
    },
    placeFacility: ({ G }, cardId: string) => {
      if (!placeFacility(G, cardId)) return INVALID_MOVE;
    },
    assignPerson: ({ G }, cardId: string, facilityInstanceId: string) => {
      if (!assignPerson(G, cardId, facilityInstanceId)) return INVALID_MOVE;
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
      applyFacilityPassives(G);
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
