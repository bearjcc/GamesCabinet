import type { Game } from 'boardgame.io';
import { activateHorcruxReward } from './engine/horcruxes';
import {
  activateProficiency,
  attackVillainWithAmount,
  buyCard,
  cycleMarket,
  playAllCards,
  playCard,
  resolveChoice,
  revealOneDarkArts,
  endTurn as runCleanup,
  setupGame,
  startTurn,
} from './engine/turnLogic';
import { createInitialGameState, type HogwartsGameState } from './engine/types';
import { type HogwartsSetupData, selectHogwartsHeroIds } from './setup';

export type { HogwartsSetupData } from './setup';

export const HogwartsBattle: Game<HogwartsGameState> = {
  name: 'hogwarts-battle',
  minPlayers: 1,
  maxPlayers: 4,

  setup: ({ ctx }, setupData?: HogwartsSetupData) => {
    const state = createInitialGameState();
    const gameNumber = setupData?.gameNumber ?? 1;
    const numPlayers = ctx.numPlayers;
    const heroIds = selectHogwartsHeroIds(setupData?.heroIds, numPlayers);
    const playerKeys = Array.from({ length: numPlayers }, (_, i) => String(i));

    setupGame(state, gameNumber, heroIds, setupData?.seed);

    const remapped: HogwartsGameState['players'] = {};
    for (let i = 0; i < playerKeys.length; i += 1) {
      const key = playerKeys[i]!;
      const heroId = heroIds[i]!;
      const src = state.players[heroId];
      if (src) {
        remapped[key] = { ...src, characterId: heroId };
      }
    }
    state.players = remapped;
    state.turnOrder = playerKeys;
    state.currentPlayerId = '0';

    return state;
  },

  playerView: ({ G, playerID }) => {
    if (playerID == null) return G;

    const cardInstances = { ...G.cardInstances };
    const players = Object.fromEntries(
      Object.entries(G.players).map(([id, player]) => {
        if (id === playerID) return [id, player];

        for (const instanceId of [...player.hand, ...player.deck]) {
          delete cardInstances[instanceId];
        }

        return [
          id,
          {
            ...player,
            hand: player.hand.map((_, index) => `hidden-${id}-hand-${index}`),
            deck: player.deck.map((_, index) => `hidden-${id}-deck-${index}`),
          },
        ];
      }),
    );

    return { ...G, players, cardInstances };
  },

  moves: {
    playCard: ({ G, playerID, events }, cardInstanceId: string) => {
      if (G.currentPlayerId !== playerID) return;
      playCard(G, playerID, cardInstanceId);
      if (G.pendingChoice) events.setActivePlayers?.({ all: 'hero_action' });
    },
    buyCard: ({ G, playerID }, marketIndex: number) => {
      if (G.currentPlayerId !== playerID) return;
      buyCard(G, playerID, marketIndex);
    },
    attackVillain: ({ G, playerID }, villainIndex: number, amount?: number) => {
      if (G.currentPlayerId !== playerID) return;
      const assigned = G.attackAssignments[String(villainIndex)] ?? 0;
      const dmg = amount ?? assigned;
      if (dmg > 0) {
        attackVillainWithAmount(G, playerID, villainIndex, dmg);
        G.attackAssignments[String(villainIndex)] = 0;
      }
    },
    assignAttack: ({ G, playerID }, villainIndex: number, delta: number) => {
      if (G.currentPlayerId !== playerID) return;
      const key = String(villainIndex);
      const player = G.players[playerID];
      const pool = player?.attackTokens ?? 0;
      const totalAssigned = Object.values(G.attackAssignments).reduce((a, b) => a + b, 0);
      const unassigned = pool - totalAssigned;
      const current = G.attackAssignments[key] ?? 0;
      if (delta > 0 && unassigned <= 0) return;
      G.attackAssignments[key] = Math.max(0, current + delta);
      G.focusedVillainIndex = villainIndex;
    },
    focusVillain: ({ G, playerID }, villainIndex: number) => {
      if (G.currentPlayerId !== playerID) return;
      G.focusedVillainIndex = villainIndex;
    },
    endTurn: ({ G, playerID, events }) => {
      if (G.currentPlayerId !== playerID) return;
      if (G.currentPhase !== 'HERO_ACTION') return;
      runCleanup(G);
      if (!G.isGameOver) events.endTurn?.();
    },
    chooseOption: ({ G, playerID, events }, optionIndex: number) => {
      const owner = G.pendingChoice?.context.sourcePlayerId ?? G.currentPlayerId;
      if (owner !== playerID) return;
      if (resolveChoice(G, optionIndex, playerID) && !G.pendingChoice) {
        events.setActivePlayers?.({ currentPlayer: 'hero_action' });
      }
    },
    playAll: ({ G, playerID, events }) => {
      if (G.currentPlayerId !== playerID) return;
      playAllCards(G, playerID);
      if (G.pendingChoice) events.setActivePlayers?.({ all: 'hero_action' });
    },
    cycleMarket: ({ G, playerID }) => {
      if (G.currentPlayerId !== playerID) return;
      cycleMarket(G, playerID);
    },
    useProficiency: ({ G, playerID }) => {
      if (G.currentPlayerId !== playerID) return;
      activateProficiency(G, playerID);
    },
    useHorcruxReward: ({ G, playerID }, horcruxId: string) => {
      if (G.currentPlayerId !== playerID) return;
      activateHorcruxReward(G, playerID, horcruxId);
    },
    revealDarkArts: ({ G, playerID }) => {
      if (G.currentPlayerId !== playerID) return;
      if (G.currentPhase !== 'DARK_ARTS' && G.darkArtsRemainingToReveal <= 0) return;
      revealOneDarkArts(G);
    },
  },

  turn: {
    order: {
      first: () => 0,
      next: ({ ctx }) => (ctx.playOrderPos + 1) % ctx.numPlayers,
    },
    onBegin: ({ G, ctx }) => {
      G.currentPlayerId = ctx.currentPlayer;
      startTurn(G);
    },
  },

  endIf: ({ G }) => {
    if (G.isGameOver) {
      return { winner: G.isVictory ? 'heroes' : 'villains' };
    }
    return undefined;
  },
};
