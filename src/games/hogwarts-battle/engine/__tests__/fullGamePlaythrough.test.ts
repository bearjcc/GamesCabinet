/**
 * Full game playthrough tests for the Hogwarts Battle engine.
 *
 * Plays through every game (1-15) deterministically using fixed random seeds.
 * A simple bot exercises core game mechanics (play cards, buy market cards,
 * attack villains, use proficiency/charm when available, end turn) to verify
 * the entire game flow works end-to-end without errors or invalid state
 * transitions.
 *
 * Each game is run twice with the same seed to verify deterministic replay.
 *
 * @module fullGamePlaythrough
 */

import { describe, expect, it } from 'vitest';
import { useCharm as activateCharm, canUseCharm } from '../charms';
import { getCampaignGame, getCard } from '../dataManager';
import { getCardInstance } from '../gameState';
import {
  activateProficiency,
  attackVillainWithAmount,
  buyCard,
  completeDarkArtsPhase,
  endTurn,
  playAllCards,
  resolveChoice,
  setupGame,
  startTurn,
} from '../turnLogic';
import type { HogwartsGameState } from '../types';
import { createInitialGameState } from '../types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum player-turns before we declare an infinite-loop failure. */
const MAX_TURNS = 500;

/** Number of players for every test game. */
const NUM_PLAYERS = 2;

/** Heroes used for the test (present in all 15 games). */
const DEFAULT_HEROES = ['harry', 'ron'];

/** Base seed; each game n uses seed (SEED_BASE + n). */
const SEED_BASE = 42;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GameResult {
  gameNumber: number;
  gameName: string;
  won: boolean;
  turns: number;
  /** Non-empty when the game threw an unexpected error. */
  error?: string;
  /** Player-turn on which the error occurred. */
  turnFailed?: number;
}

interface GameSnapshot {
  isVictory: boolean;
  isGameOver: boolean;
  turnNumber: number;
  playerHealths: Record<string, number>;
  villainHps: number[];
  locationControl: number;
  locationMaxControl: number;
  marketDeckSize: number;
  villainDeckSize: number;
}

// ---------------------------------------------------------------------------
// Helper: create a fully initialised game state
// ---------------------------------------------------------------------------

/**
 * Creates a fully initialised game state for the given game number and seed.
 * Uses hero IDs directly as player IDs (bypassing boardgame.io remapping).
 */
function createGame(gameNumber: number, seed: number): HogwartsGameState {
  const state = createInitialGameState();
  const heroIds = DEFAULT_HEROES.slice(0, NUM_PLAYERS);
  setupGame(state, gameNumber, heroIds, seed);
  return state;
}

// ---------------------------------------------------------------------------
// Helper: snapshot for determinism comparison
// ---------------------------------------------------------------------------

function takeSnapshot(state: HogwartsGameState): GameSnapshot {
  const playerHealths: Record<string, number> = {};
  for (const [pid, player] of Object.entries(state.players)) {
    playerHealths[pid] = player.health;
  }
  return {
    isVictory: state.isVictory,
    isGameOver: state.isGameOver,
    turnNumber: state.turnNumber,
    playerHealths,
    villainHps: state.activeVillains.map((v) => v.currentHp),
    locationControl: state.currentLocation?.currentControl ?? -1,
    locationMaxControl: state.currentLocation?.maxControl ?? -1,
    marketDeckSize: state.market.deck.length,
    villainDeckSize: state.villainDeck.length,
  };
}

// ---------------------------------------------------------------------------
// Helper: state-integrity assertions
// ---------------------------------------------------------------------------

/**
 * Validates game state integrity after each turn.
 * Checks for NaN, negative values, and out-of-bounds counters.
 */
function validateStateIntegrity(state: HogwartsGameState, gameNumber: number, turn: number): void {
  const ctx = `Game ${gameNumber} turn ${turn}`;

  // --- Players ---
  for (const [pid, player] of Object.entries(state.players)) {
    expect(Number.isNaN(player.health), `${ctx}: ${pid} health is NaN`).toBe(false);
    expect(player.health, `${ctx}: ${pid} health < 0`).toBeGreaterThanOrEqual(0);
    expect(Number.isNaN(player.maxHealth), `${ctx}: ${pid} maxHealth is NaN`).toBe(false);
    expect(player.maxHealth, `${ctx}: ${pid} maxHealth <= 0`).toBeGreaterThan(0);
    expect(player.attackTokens, `${ctx}: ${pid} attackTokens < 0`).toBeGreaterThanOrEqual(0);
    expect(Number.isNaN(player.attackTokens), `${ctx}: ${pid} attackTokens NaN`).toBe(false);
    expect(player.moneyTokens, `${ctx}: ${pid} moneyTokens < 0`).toBeGreaterThanOrEqual(0);
    expect(Number.isNaN(player.moneyTokens), `${ctx}: ${pid} moneyTokens NaN`).toBe(false);
  }

  // --- Market ---
  const faceUpCount = state.market.availableCards.filter(Boolean).length;
  expect(faceUpCount, `${ctx}: market face-up > marketSpaces`).toBeLessThanOrEqual(
    state.marketSpaces,
  );

  // --- Villains ---
  for (let i = 0; i < state.activeVillains.length; i++) {
    const villain = state.activeVillains[i]!;
    if (villain.isActive) {
      expect(villain.currentHp, `${ctx}: villain[${i}] hp <= 0`).toBeGreaterThan(0);
      expect(Number.isNaN(villain.currentHp), `${ctx}: villain[${i}] hp NaN`).toBe(false);
      expect(villain.maxHp, `${ctx}: villain[${i}] maxHp <= 0`).toBeGreaterThan(0);
    }
  }

  // --- Location ---
  if (state.currentLocation) {
    const loc = state.currentLocation;
    expect(loc.currentControl, `${ctx}: loc control < 0`).toBeGreaterThanOrEqual(0);
    expect(loc.currentControl, `${ctx}: loc control > max`).toBeLessThanOrEqual(loc.maxControl);
    expect(Number.isNaN(loc.currentControl), `${ctx}: loc control NaN`).toBe(false);
  }
}

// ---------------------------------------------------------------------------
// Helper: resolve pending choices
// ---------------------------------------------------------------------------

/**
 * Resolves any pending choices by picking the first option (index 0).
 * Includes a safety counter to prevent infinite loops from malformed choices.
 * If resolution fails, the pending choice is force-cleared.
 */
function resolvePendingChoices(state: HogwartsGameState): void {
  let safety = 0;
  while (state.pendingChoice && safety < 100) {
    const resolved = resolveChoice(state, 0);
    if (!resolved) {
      // Force-clear to avoid infinite loop on unresolvable choices.
      state.pendingChoice = null;
      break;
    }
    safety += 1;
  }
}

// ---------------------------------------------------------------------------
// Helper: buy cheapest affordable cards
// ---------------------------------------------------------------------------

/**
 * Iteratively buys the cheapest affordable market card until no further
 * purchases are possible. Uses base card cost for selection; the engine's
 * `buyCard` applies any proficiency discounts internally.
 */
function buyCheapestCards(state: HogwartsGameState, playerId: string): void {
  const player = state.players[playerId];
  if (!player) return;

  let buySafety = 0;
  while (buySafety < 20) {
    let cheapestIndex = -1;
    let cheapestCost = Infinity;

    for (let i = 0; i < state.market.availableCards.length; i++) {
      const instanceId = state.market.availableCards[i];
      if (!instanceId) continue;
      const ci = getCardInstance(state, instanceId);
      if (!ci) continue;
      const card = getCard(ci.cardId);
      if (!card) continue;
      if (card.cost <= player.moneyTokens && card.cost < cheapestCost) {
        cheapestCost = card.cost;
        cheapestIndex = i;
      }
    }

    if (cheapestIndex < 0) break; // No affordable cards left

    const bought = buyCard(state, playerId, cheapestIndex);
    if (!bought) break; // Buy failed (effective cost too high or other issue)

    buySafety += 1;
  }
}

// ---------------------------------------------------------------------------
// Helper: attack first active villain
// ---------------------------------------------------------------------------

/**
 * Attacks the first active villain with all available attack tokens.
 */
function attackFirstVillain(state: HogwartsGameState, playerId: string): void {
  const player = state.players[playerId];
  if (!player || player.attackTokens <= 0) return;

  for (let i = 0; i < state.activeVillains.length; i++) {
    const villain = state.activeVillains[i]!;
    if (villain.isActive) {
      attackVillainWithAmount(state, playerId, i, player.attackTokens);
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Bot: run a single hero-action turn
// ---------------------------------------------------------------------------

/**
 * Executes a simple bot turn for the given player:
 *  1. Resolve any pending choices from dark arts / villain phase.
 *  2. Play all cards (auto + decision cards via playAllCards).
 *  3. Use proficiency if available (Game 6+).
 *  4. Use charm if available (Game 12+).
 *  5. Buy cheapest affordable market cards.
 *  6. Attack the first active villain.
 *  7. End turn.
 *
 * Each step checks for game-over and phase correctness before proceeding.
 */
function runBotTurn(state: HogwartsGameState, playerId: string): void {
  // 1. Resolve pending choices from dark arts / villain phase
  resolvePendingChoices(state);
  if (state.isGameOver || state.currentPhase !== 'HERO_ACTION') return;

  // 2. Play all cards
  playAllCards(state, playerId);
  resolvePendingChoices(state);
  if (state.isGameOver || state.currentPhase !== 'HERO_ACTION') return;

  // 3. Use proficiency if available (Game 6+)
  activateProficiency(state, playerId);
  resolvePendingChoices(state);
  if (state.isGameOver || state.currentPhase !== 'HERO_ACTION') return;

  // 4. Use charm if available (Game 12+)
  if (canUseCharm(state, playerId)) {
    activateCharm(state, playerId);
    resolvePendingChoices(state);
  }
  if (state.isGameOver || state.currentPhase !== 'HERO_ACTION') return;

  // 5. Buy cheapest affordable market cards
  buyCheapestCards(state, playerId);
  if (state.isGameOver || state.currentPhase !== 'HERO_ACTION') return;

  // 6. Attack first active villain
  attackFirstVillain(state, playerId);
  resolvePendingChoices(state);
  if (state.isGameOver || state.currentPhase !== 'HERO_ACTION') return;

  // 7. End turn
  endTurn(state);
}

// ---------------------------------------------------------------------------
// Full game runner
// ---------------------------------------------------------------------------

/**
 * Runs a full game from setup to completion (or error).
 *
 * @returns The final game state and a result summary.
 */
function runFullGame(
  gameNumber: number,
  seed: number,
): { state: HogwartsGameState; result: GameResult } {
  const campaign = getCampaignGame(gameNumber);
  const gameName = campaign?.name ?? `Game ${gameNumber}`;

  // --- Setup phase (separate try-catch so we can report setup failures) ---
  let state: HogwartsGameState;
  try {
    state = createGame(gameNumber, seed);
  } catch (err) {
    state = createInitialGameState();
    return {
      state,
      result: {
        gameNumber,
        gameName,
        won: false,
        turns: 0,
        error: `Setup failed: ${err instanceof Error ? err.message : String(err)}`,
        turnFailed: 0,
      },
    };
  }

  const turnOrder = [...state.turnOrder];
  let turnCount = 0;

  try {
    // --- Main game loop ---
    while (!state.isGameOver && turnCount < MAX_TURNS) {
      for (const playerId of turnOrder) {
        if (state.isGameOver) break;

        // Advance to this player's turn
        state.currentPlayerId = playerId;
        startTurn(state);
        completeDarkArtsPhase(state);

        // Dark arts / villain phase may have created pending choices
        resolvePendingChoices(state);
        if (state.isGameOver) break;

        // Run the bot's hero-action phase
        runBotTurn(state, playerId);
        turnCount += 1;
        if (state.isGameOver) break;

        // Validate state integrity after every player turn
        validateStateIntegrity(state, gameNumber, turnCount);
      }
    }

    return {
      state,
      result: {
        gameNumber,
        gameName,
        won: state.isVictory,
        turns: turnCount,
      },
    };
  } catch (err) {
    return {
      state,
      result: {
        gameNumber,
        gameName,
        won: false,
        turns: turnCount,
        error: err instanceof Error ? err.message : String(err),
        turnFailed: turnCount,
      },
    };
  }
}

// ===========================================================================
// Test Suite
// ===========================================================================

describe('Full Game Playthrough', () => {
  /** Accumulates results across all 15 games for the summary test. */
  const results: GameResult[] = [];

  // -----------------------------------------------------------------------
  // Per-game tests (1-15)
  // -----------------------------------------------------------------------
  for (let gameNum = 1; gameNum <= 15; gameNum++) {
    describe(`Game ${gameNum}`, () => {
      it('should complete without errors', () => {
        const seed = SEED_BASE + gameNum;
        const { state, result } = runFullGame(gameNum, seed);
        results.push(result);

        // Report crash details
        if (result.error) {
          expect.fail(
            `Game ${gameNum} (${result.gameName}) crashed on turn ${result.turnFailed}: ${result.error}`,
          );
        }

        // Game must reach a terminal state
        expect(state.isGameOver).toBe(true);

        // Must not hit the turn limit (indicates infinite loop or stall)
        expect(result.turns).toBeLessThanOrEqual(MAX_TURNS);

        // Must have completed at least one turn
        expect(result.turns).toBeGreaterThan(0);
      }, 30_000); // 30-second timeout per game

      it('should be deterministic with the same seed', () => {
        const seed = SEED_BASE + gameNum;

        const run1 = runFullGame(gameNum, seed);
        const run2 = runFullGame(gameNum, seed);

        const snap1 = takeSnapshot(run1.state);
        const snap2 = takeSnapshot(run2.state);

        expect(snap2).toEqual(snap1);
      }, 30_000);
    });
  }

  // -----------------------------------------------------------------------
  // Summary test
  // -----------------------------------------------------------------------
  describe('All Games Summary', () => {
    it('should have played all 15 games', () => {
      expect(results.length).toBe(15);

      const crashed = results.filter((r) => r.error);
      if (crashed.length > 0) {
        console.error(
          'Crashed games:\n',
          crashed.map((r) => `  Game ${r.gameNumber} (${r.gameName}): ${r.error}`).join('\n'),
        );
      }
      expect(crashed).toHaveLength(0);

      // Log results for visibility
      for (const r of results) {
        console.log(
          `Game ${r.gameNumber} (${r.gameName}): ${r.won ? 'WON' : 'LOST'} in ${r.turns} turns`,
        );
      }
    });
  });
});
