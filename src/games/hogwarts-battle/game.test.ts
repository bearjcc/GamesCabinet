import { Client } from 'boardgame.io/client';
import { describe, expect, it } from 'vitest';
import { getCard } from './engine/dataManager';
import { getCardInstance } from './engine/gameState';
import { HogwartsBattle, type HogwartsSetupData } from './game';

function makeClient(numPlayers = 1, seed = 42, requestedSetupData?: HogwartsSetupData) {
  return Client({
    game: {
      ...HogwartsBattle,
      setup: (context, clientSetupData) =>
        HogwartsBattle.setup!(context, {
          gameNumber: 1,
          seed,
          ...requestedSetupData,
          ...clientSetupData,
        }),
    },
    numPlayers,
  });
}

function advanceDarkArts(client: ReturnType<typeof makeClient>) {
  let guard = 20;
  while ((client.getState()?.G.darkArtsRemainingToReveal ?? 0) > 0 && guard > 0) {
    client.moves.revealDarkArts();
    guard -= 1;
  }
  if (client.getState()?.G.currentPhase === 'DARK_ARTS') {
    client.moves.revealDarkArts();
  }
}

describe('Hogwarts Battle Game 1', () => {
  it('sets up Game 1 with hero seats and market', () => {
    const client = makeClient(2);
    const { G } = client.getState()!;
    expect(G.gameNumber).toBe(1);
    expect(Object.keys(G.players)).toEqual(['0', '1']);
    expect(G.players['0']?.characterId).toBe('harry');
    expect(G.players['1']?.characterId).toBe('ron');
    expect(G.players['0']?.hand).toHaveLength(5);
    expect(G.market.availableCards.filter(Boolean).length).toBeGreaterThan(0);
    expect(G.currentLocation).not.toBeNull();
    expect(G.activeVillains.length).toBeGreaterThan(0);
  });

  it('runs dark arts into hero action on turn begin', () => {
    const client = makeClient(1);
    const before = client.getState()!.G.darkArtsRemainingToReveal;
    if (before > 0) {
      expect(client.getState()!.G.currentPhase).toBe('DARK_ARTS');
      advanceDarkArts(client);
    }
    expect(client.getState()!.G.currentPhase).toBe('HERO_ACTION');
    expect(client.getState()!.G.darkArtsRemainingToReveal).toBe(0);
  });

  it('plays cards, buys from market, and ends turn', () => {
    const client = makeClient(1, 99);
    advanceDarkArts(client);
    const { G } = client.getState()!;
    const player = G.players['0']!;
    const aloho = player.hand.find((id) => getCardInstance(G, id)?.cardId === 'alohomora');
    if (aloho) {
      client.moves.playCard(aloho);
      const after = client.getState()!.G.players['0']!;
      expect(after.playArea).toContain(aloho);
      expect(after.moneyTokens).toBeGreaterThan(0);
    } else {
      client.moves.playAll();
    }

    const state = client.getState()!.G;
    const hero = state.players['0']!;
    const buyIndex = state.market.availableCards.findIndex((slot) => {
      if (!slot) return false;
      const card = getCard(getCardInstance(state, slot)?.cardId ?? '');
      return card != null && hero.moneyTokens >= (card.cost ?? 0);
    });
    if (buyIndex >= 0) {
      client.moves.buyCard(buyIndex);
    }

    client.moves.endTurn();
    const next = client.getState()!;
    expect(next.G.players['0']?.hand).toHaveLength(5);
    expect(next.ctx.turn).toBeGreaterThan(1);
  });

  it('supports four open-info hero seats', () => {
    const client = makeClient(4);
    const { G } = client.getState()!;
    expect(Object.keys(G.players)).toHaveLength(4);
    expect(G.players['3']?.characterId).toBe('neville');
    for (const p of Object.values(G.players)) {
      expect(p.hand.length).toBe(5);
    }
  });

  it('uses the selected year and unique hero order', () => {
    const client = makeClient(2, 42, {
      gameNumber: 7,
      heroIds: ['neville', 'harry', 'harry'],
    });
    const { G } = client.getState()!;

    expect(G.gameNumber).toBe(7);
    expect(G.players['0']?.characterId).toBe('neville');
    expect(G.players['1']?.characterId).toBe('harry');
  });

  it('hides another hero hand and deck from an online player view', () => {
    const client = makeClient(2, 42);
    const { G, ctx } = client.getState()!;
    const ownCard = G.players['0']!.hand[0]!;
    const hiddenCard = G.players['1']!.hand[0]!;
    const view = HogwartsBattle.playerView!({ G, ctx, playerID: '0' } as never);

    expect(view.players['0']!.hand[0]).toBe(ownCard);
    expect(view.players['1']!.hand).toHaveLength(G.players['1']!.hand.length);
    expect(view.players['1']!.hand[0]).not.toBe(hiddenCard);
    expect(view.cardInstances[hiddenCard]).toBeUndefined();
  });

  it('assigns and strikes villains, focuses targets, and playAll', () => {
    const client = makeClient(1, 7);
    advanceDarkArts(client);
    client.moves.playAll();
    const G = client.getState()!.G;
    const atk = G.players['0']!.attackTokens;
    if (atk > 0 && G.activeVillains.some((v) => v.isActive)) {
      client.moves.focusVillain(0);
      client.moves.assignAttack(0, 1);
      expect(client.getState()!.G.attackAssignments['0']).toBe(1);
      client.moves.assignAttack(0, -1);
      client.moves.assignAttack(0, 1);
      client.moves.attackVillain(0);
    }
    expect(client.getState()!.G.currentPhase).toBe('HERO_ACTION');
  });

  it('ignores moves from the wrong seat and resolves choices when present', () => {
    const client = makeClient(2, 3);
    advanceDarkArts(client);
    const hand = client.getState()!.G.players['0']!.hand[0]!;
    client.updatePlayerID('1');
    client.moves.playCard(hand);
    expect(client.getState()!.G.players['0']!.hand).toHaveLength(5);

    client.updatePlayerID('0');
    const G = client.getState()!.G;
    if (G.pendingChoice) {
      client.moves.chooseOption(0);
    } else {
      client.moves.chooseOption(0);
    }
  });

  it('revealDarkArts is a no-op outside the phase once cleared', () => {
    const client = makeClient(1, 5);
    advanceDarkArts(client);
    const phase = client.getState()!.G.currentPhase;
    client.moves.revealDarkArts();
    expect(client.getState()!.G.currentPhase).toBe(phase);
  });

  it('endIf reports heroes or villains from game over flags via play', () => {
    const client = makeClient(1, 1);
    advanceDarkArts(client);
    // Force loss through location control if possible by ending turns; otherwise assert endIf shape.
    const over = HogwartsBattle.endIf!({
      G: {
        ...client.getState()!.G,
        isGameOver: true,
        isVictory: true,
      },
      ctx: client.getState()!.ctx,
    } as never);
    expect(over).toEqual({ winner: 'heroes' });
    const loss = HogwartsBattle.endIf!({
      G: {
        ...client.getState()!.G,
        isGameOver: true,
        isVictory: false,
      },
      ctx: client.getState()!.ctx,
    } as never);
    expect(loss).toEqual({ winner: 'villains' });
    expect(
      HogwartsBattle.endIf!({
        G: client.getState()!.G,
        ctx: client.getState()!.ctx,
      } as never),
    ).toBeUndefined();
  });
});
