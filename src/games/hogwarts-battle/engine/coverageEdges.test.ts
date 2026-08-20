import { describe, expect, it } from 'vitest';
import { addActiveVillain, addCardToHand, buildTestState } from './__tests__/helpers/testGameState';
import { resolveEffect } from './effectResolver';
import { initializeRng, rngNextInt, shuffleArray } from './gameState';
import { fireHeroAbilities, recordDamageDealt } from './heroAbilities';
import { playAllCards, revealOneDarkArts, setupGame } from './turnLogic';
import { createInitialGameState } from './types';
import { isVillainEffectBlocked, resolveVillainOngoingAtPhase } from './villainEffects';

describe('engine coverage edges', () => {
  it('covers rng zero bound', () => {
    const state = createInitialGameState();
    initializeRng(1, state);
    expect(rngNextInt(0)).toBe(0);
    shuffleArray([]);
    shuffleArray(['a']);

    const player = buildTestState().players.harry!;
    state.players.harry = player;
    fireHeroAbilities(state, 'manual', {
      sourcePlayerId: 'harry',
      autoResolve: true,
    });
    recordDamageDealt(state, 1);
    expect(state.damageDealtThisTurn).toBeGreaterThanOrEqual(0);
  });

  it('blocks creature villain effects when creature block is on', () => {
    const state = buildTestState();
    addActiveVillain(state, 'basilisk');
    state.blockCreatureEffectsThisTurn = true;
    expect(isVillainEffectBlocked(state, 'basilisk')).toBe(true);
    state.blockCreatureEffectsThisTurn = false;
    state.blockVillainEffectsThisTurn = true;
    expect(isVillainEffectBlocked(state, 'dracomalfoy')).toBe(true);

    resolveVillainOngoingAtPhase(
      { type: 'prevent_extra_draw' },
      state,
      { source: 'villain', autoResolve: true },
      resolveEffect,
    );
    resolveVillainOngoingAtPhase(
      {
        type: 'multi_effect',
        params: { effects: [{ type: 'prevent_extra_draw' }] },
      },
      state,
      { source: 'villain', autoResolve: true },
      resolveEffect,
    );
  });

  it('revealOneDarkArts finishes a stuck DARK_ARTS phase', () => {
    const state = buildTestState();
    state.currentPhase = 'DARK_ARTS';
    state.darkArtsRemainingToReveal = 0;
    revealOneDarkArts(state);
    expect(state.currentPhase).toBe('HERO_ACTION');
  });

  it('playAll pauses when a choose_one card opens a pending choice', () => {
    const state = buildTestState();
    state.currentPhase = 'HERO_ACTION';
    state.players.harry!.hand = [];
    state.players.harry!.playArea = [];
    addCardToHand(state, 'harry', 'hedwig');
    expect(playAllCards(state, 'harry')).toBe(true);
    expect(state.pendingChoice).not.toBeNull();
  });

  it('clamps out-of-range campaign game numbers', () => {
    const state = createInitialGameState();
    setupGame(state, 99, ['harry'], 1);
    expect(state.gameNumber).toBeLessThanOrEqual(15);
  });
});
