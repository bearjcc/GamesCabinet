import { describe, expect, it } from 'vitest';
import { createCardInstance, initializeRng } from './engine/gameState';
import { setupGame } from './engine/turnLogic';
import { createInitialGameState } from './engine/types';
import {
  canAssignAttack,
  canBuyAtIndex,
  canEndTurn,
  canHeroAct,
  canPlayCard,
  canUseHorcruxReward,
  canUseProficiency,
  cardTitle,
  heroDisplayName,
  pendingChoicePlayerId,
  turnHeadline,
  unassignedAttack,
} from './gameSelectors';

function game1State(seed = 11) {
  const state = createInitialGameState();
  setupGame(state, 1, ['harry'], seed);
  const remapped = { '0': { ...state.players.harry!, characterId: 'harry' } };
  state.players = remapped;
  state.turnOrder = ['0'];
  state.currentPlayerId = '0';
  state.currentPhase = 'HERO_ACTION';
  initializeRng(seed, state);
  return state;
}

describe('hogwarts gameSelectors', () => {
  it('names heroes and cards', () => {
    const G = game1State();
    expect(heroDisplayName('harry')).toContain('Harry');
    const handId = G.players['0']!.hand[0]!;
    expect(cardTitle(G, handId).length).toBeGreaterThan(0);
    expect(cardTitle(G, 'missing')).toBe('missing');
  });

  it('gates hero actions by phase and ownership', () => {
    const G = game1State();
    expect(canHeroAct(G, '0').allowed).toBe(true);
    expect(canHeroAct(G, '1').allowed).toBe(false);
    G.currentPhase = 'DARK_ARTS';
    expect(canHeroAct(G, '0').reason).toMatch(/Hero action/i);
    G.currentPhase = 'HERO_ACTION';
    G.isGameOver = true;
    expect(canHeroAct(G, '0').allowed).toBe(false);
  });

  it('validates play, buy, attack assign, and end turn', () => {
    const G = game1State();
    const handId = G.players['0']!.hand[0]!;
    expect(canPlayCard(G, '0', handId).allowed).toBe(true);
    expect(canPlayCard(G, '0', 'nope').allowed).toBe(false);
    expect(canEndTurn(G, '0').allowed).toBe(true);

    G.players['0']!.moneyTokens = 10;
    const buyable = G.market.availableCards.findIndex(Boolean);
    expect(canBuyAtIndex(G, '0', buyable).allowed).toBe(true);
    G.players['0']!.moneyTokens = 0;
    expect(canBuyAtIndex(G, '0', buyable).allowed).toBe(false);
    expect(canBuyAtIndex(G, '0', 99).allowed).toBe(false);

    G.players['0']!.attackTokens = 2;
    expect(unassignedAttack(G, '0')).toBe(2);
    expect(canAssignAttack(G, '0', 1).allowed).toBe(true);
    G.attackAssignments['0'] = 2;
    expect(unassignedAttack(G, '0')).toBe(0);
    expect(canAssignAttack(G, '0', 1).allowed).toBe(false);
  });

  it('builds turn headlines for phases and outcomes', () => {
    const G = game1State();
    expect(turnHeadline(G, '0', true)).toMatch(/Hero action/i);
    expect(turnHeadline(G, '0', false)).toMatch(/Waiting/i);
    G.currentPhase = 'DARK_ARTS';
    expect(turnHeadline(G, '0', true)).toMatch(/Dark Arts/i);
    G.pendingChoice = {
      choiceId: 'x',
      options: [{ label: 'A', effect: { type: 'gain_attack', params: { amount: 1 } } }],
      context: { autoResolve: false },
    };
    G.currentPhase = 'HERO_ACTION';
    expect(turnHeadline(G, '0', true)).toMatch(/Choice/i);
    G.pendingChoice = null;
    G.isGameOver = true;
    G.isVictory = true;
    expect(turnHeadline(G, '0', true)).toMatch(/Victory/i);
    G.isVictory = false;
    expect(turnHeadline(G, '0', true)).toMatch(/Defeat/i);
    G.isGameOver = false;
    G.currentPhase = 'VILLAIN_PHASE';
    expect(turnHeadline(G, '0', true)).toMatch(/Villains/i);
  });

  it('creates card instances for selector edge paths', () => {
    const G = game1State();
    const inst = createCardInstance(G, 'alohomora');
    G.market.availableCards[0] = inst.instanceId;
    G.players['0']!.moneyTokens = 99;
    expect(canBuyAtIndex(G, '0', 0).allowed).toBe(true);
  });

  it('identifies the chooser and gates campaign actions safely', () => {
    const G = game1State();
    expect(canUseProficiency(G, '0').allowed).toBe(false);
    expect(canUseHorcruxReward(G, '0', 'locket').allowed).toBe(false);

    G.pendingChoice = {
      choiceId: 'choice_1',
      options: [{ label: 'A', effect: { type: 'none' } }],
      context: { sourcePlayerId: '0' },
    };
    expect(pendingChoicePlayerId(G)).toBe('0');
    G.pendingChoice.context.sourcePlayerId = undefined;
    expect(pendingChoicePlayerId(G)).toBe('0');
    G.pendingChoice = null;
    expect(pendingChoicePlayerId(G)).toBeNull();
  });
});
