import { Client } from 'boardgame.io/client';
import { Local } from 'boardgame.io/multiplayer';
import { afterEach, describe, expect, it } from 'vitest';
import { TicTacToe, type TTTState } from '../games/tic-tac-toe/game';
import {
  BOT_DIFFICULTIES,
  botDifficultyLabel,
  botSeatCount,
  createMctsBotClass,
  cycleBotDifficulty,
  MCTS_PRESETS,
  parseBotDifficulty,
} from './bots';
import { getGameMeta } from './games';

describe('MCTS_PRESETS', () => {
  it('keeps medium at the current PlayBot baseline', () => {
    expect(MCTS_PRESETS.medium).toEqual({ iterations: 200, playoutDepth: 8 });
  });

  it('makes easy weaker and hard stronger than medium', () => {
    const { easy, medium, hard } = MCTS_PRESETS;
    expect(easy.iterations).toBeLessThan(medium.iterations);
    expect(easy.playoutDepth).toBeLessThanOrEqual(medium.playoutDepth);
    expect(hard.iterations).toBeGreaterThan(medium.iterations);
    expect(hard.playoutDepth).toBeGreaterThanOrEqual(medium.playoutDepth);
  });

  it('stays in handheld-era bounds (not RL-scale search)', () => {
    for (const level of BOT_DIFFICULTIES) {
      const p = MCTS_PRESETS[level];
      expect(p.iterations).toBeGreaterThan(0);
      expect(p.iterations).toBeLessThanOrEqual(1000);
      expect(p.playoutDepth).toBeGreaterThan(0);
      expect(p.playoutDepth).toBeLessThanOrEqual(24);
    }
  });
});

describe('parseBotDifficulty', () => {
  it('accepts easy, medium, and hard', () => {
    expect(parseBotDifficulty('easy')).toBe('easy');
    expect(parseBotDifficulty('medium')).toBe('medium');
    expect(parseBotDifficulty('hard')).toBe('hard');
  });

  it('defaults unknown or missing values to medium', () => {
    expect(parseBotDifficulty(null)).toBe('medium');
    expect(parseBotDifficulty(undefined)).toBe('medium');
    expect(parseBotDifficulty('')).toBe('medium');
    expect(parseBotDifficulty('MEDIUM')).toBe('medium');
    expect(parseBotDifficulty('nightmare')).toBe('medium');
  });
});

describe('cycleBotDifficulty', () => {
  it('cycles easy -> medium -> hard -> easy', () => {
    expect(cycleBotDifficulty('easy')).toBe('medium');
    expect(cycleBotDifficulty('medium')).toBe('hard');
    expect(cycleBotDifficulty('hard')).toBe('easy');
  });
});

describe('botDifficultyLabel', () => {
  it('capitalises the level for Mum-simple UI', () => {
    expect(botDifficultyLabel('easy')).toBe('Easy');
    expect(botDifficultyLabel('medium')).toBe('Medium');
    expect(botDifficultyLabel('hard')).toBe('Hard');
  });
});

describe('botSeatCount', () => {
  it('returns 2 for current hasBot games (vs one MCTS seat)', () => {
    for (const id of ['dominoes', 'crazy-eights', 'yatzy', 'tic-tac-toe'] as const) {
      const meta = getGameMeta(id)!;
      expect(meta.hasBot).toBe(true);
      expect(botSeatCount(meta)).toBe(2);
    }
  });
});

describe('createMctsBotClass', () => {
  const clients: Array<ReturnType<typeof Client>> = [];

  afterEach(() => {
    for (const c of clients) c.stop();
    clients.length = 0;
  });

  it('constructs an MCTS bot seat for each difficulty preset', async () => {
    async function waitForBotMove(client: ReturnType<typeof Client>) {
      for (let i = 0; i < 50; i++) {
        const cells = (client.getState()?.G as TTTState | undefined)?.cells;
        if (cells?.includes('1')) return;
        await new Promise((r) => setTimeout(r, 50));
      }
      throw new Error('bot did not move');
    }

    for (const difficulty of BOT_DIFFICULTIES) {
      const Bot = createMctsBotClass(difficulty);
      const client = Client({
        game: TicTacToe,
        numPlayers: 2,
        playerID: '0',
        matchID: `bots-${difficulty}`,
        multiplayer: Local({ bots: { '1': Bot } }),
      });
      clients.push(client);
      client.start();
      await new Promise((r) => setTimeout(r, 20));
      client.moves.clickCell(0);
      const afterHuman = client.getState()?.G as TTTState;
      expect(afterHuman.cells[0]).toBe('0');
      await waitForBotMove(client);
    }
  });
});
