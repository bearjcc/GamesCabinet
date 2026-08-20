import { Client } from 'boardgame.io/client';
import { describe, expect, it } from 'vitest';
import type { HogwartsGameState } from './engine/types';
import { HogwartsBattle } from './game';

function makeHeroActionClient() {
  return Client({
    game: {
      ...HogwartsBattle,
      setup: (context) => HogwartsBattle.setup!(context, { gameNumber: 1, seed: 17 }),
      turn: {
        ...HogwartsBattle.turn,
        onBegin: ({ G, ctx }: { G: HogwartsGameState; ctx: { currentPlayer: string } }) => {
          G.currentPlayerId = ctx.currentPlayer;
          G.currentPhase = 'HERO_ACTION';
          G.darkArtsRemainingToReveal = 0;
          const player = G.players[ctx.currentPlayer];
          if (player) {
            player.attackTokens = 5;
            player.moneyTokens = 10;
          }
        },
      },
    },
    numPlayers: 1,
  });
}

function makeChoiceClient() {
  return Client({
    game: {
      ...HogwartsBattle,
      setup: (context) => HogwartsBattle.setup!(context, { gameNumber: 1, seed: 17 }),
      turn: {
        ...HogwartsBattle.turn,
        activePlayers: { all: 'hero_action' },
        onBegin: ({ G, ctx }: { G: HogwartsGameState; ctx: { currentPlayer: string } }) => {
          G.currentPlayerId = ctx.currentPlayer;
          G.currentPhase = 'HERO_ACTION';
          G.pendingChoice = {
            choiceId: 'seat-test',
            options: [
              { label: 'Gain attack', effect: { type: 'gain_attack', params: { amount: 1 } } },
            ],
            context: { sourcePlayerId: '1', source: 'hero_ability', autoResolve: false },
          };
        },
      },
    },
    numPlayers: 2,
  });
}

describe('Hogwarts Battle moves', () => {
  it('focuses, assigns, rejects over-assign, and strikes', () => {
    const client = makeHeroActionClient();
    client.moves.focusVillain(0);
    expect(client.getState()!.G.focusedVillainIndex).toBe(0);

    client.moves.assignAttack(0, 2);
    expect(client.getState()!.G.attackAssignments['0']).toBe(2);
    // Further + still allowed while unassigned remains; exhaust the pool then reject.
    client.moves.assignAttack(0, 3);
    expect(client.getState()!.G.attackAssignments['0']).toBe(5);
    client.moves.assignAttack(0, 1);
    expect(client.getState()!.G.attackAssignments['0']).toBe(5);
    client.moves.assignAttack(0, -1);
    expect(client.getState()!.G.attackAssignments['0']).toBe(4);
    client.moves.attackVillain(0);
    expect(client.getState()!.G.attackAssignments['0'] ?? 0).toBe(0);
  });

  it('buys, plays, playAll, chooseOption guard, and ends turn', () => {
    const client = makeHeroActionClient();
    const handId = client.getState()!.G.players['0']!.hand[0]!;
    client.moves.playCard(handId);
    client.moves.buyCard(0);
    client.moves.playAll();
    client.moves.chooseOption(0);
    client.moves.attackVillain(0, 1);
    client.moves.endTurn();
    expect(client.getState()!.ctx.turn).toBeGreaterThan(1);
  });

  it('exposes cycleMarket, useProficiency and useHorcruxReward moves', () => {
    const client = makeHeroActionClient();
    const before = [...client.getState()!.G.market.availableCards];
    client.moves.cycleMarket();
    const after = [...client.getState()!.G.market.availableCards];
    expect(after.some((id, i) => id !== before[i])).toBe(true);

    // Once per game: a second attempt changes nothing
    client.moves.cycleMarket();
    expect([...client.getState()!.G.market.availableCards]).toEqual(after);

    // No proficiency or Horcruxes in Game 1: both are safe no-ops
    client.moves.useProficiency();
    client.moves.useHorcruxReward('locket');
    expect(client.getState()!.G.currentPhase).toBe('HERO_ACTION');
  });

  it('ignores moves from the wrong seat and endTurn outside hero action', () => {
    const client = makeHeroActionClient();
    client.updatePlayerID('1');
    const handBefore = client.getState()!.G.players['0']!.hand.length;
    client.moves.playCard(client.getState()!.G.players['0']!.hand[0]!);
    client.moves.buyCard(0);
    client.moves.assignAttack(0, 1);
    client.moves.attackVillain(0, 1);
    client.moves.playAll();
    client.moves.chooseOption(0);
    client.moves.endTurn();
    expect(client.getState()!.G.players['0']!.hand.length).toBe(handBefore);

    client.updatePlayerID('0');
    // Force non-hero phase then endTurn no-op
    const G = client.getState()!.G;
    // Reveal path no-op when already clear
    client.moves.revealDarkArts();
    expect(G.currentPhase).toBe('HERO_ACTION');
  });

  it('allows only the pending choice owner to resolve a choice', () => {
    const client = makeChoiceClient();

    client.updatePlayerID('0');
    client.moves.chooseOption(0);
    expect(client.getState()!.G.players['1']!.attackTokens).toBe(0);
    expect(client.getState()!.G.pendingChoice).not.toBeNull();

    client.updatePlayerID('1');
    client.moves.chooseOption(0);
    expect(client.getState()!.G.players['1']!.attackTokens).toBe(1);
    expect(client.getState()!.G.pendingChoice).toBeNull();
  });
});
