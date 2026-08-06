import { MCTSBot } from 'boardgame.io/ai';
import type { GameMeta } from './games';

export type BotDifficulty = 'easy' | 'medium' | 'hard';

export type MctsPreset = {
  iterations: number;
  playoutDepth: number;
};

export const BOT_DIFFICULTIES: readonly BotDifficulty[] = ['easy', 'medium', 'hard'];

/** Handheld-era MCTS budgets. Medium matches the former PlayBot MediumBot. */
export const MCTS_PRESETS: Record<BotDifficulty, MctsPreset> = {
  easy: { iterations: 50, playoutDepth: 4 },
  medium: { iterations: 200, playoutDepth: 8 },
  hard: { iterations: 600, playoutDepth: 14 },
};

export function parseBotDifficulty(raw: string | null | undefined): BotDifficulty {
  if (raw === 'easy' || raw === 'medium' || raw === 'hard') return raw;
  return 'medium';
}

export function cycleBotDifficulty(current: BotDifficulty): BotDifficulty {
  const i = BOT_DIFFICULTIES.indexOf(current);
  return BOT_DIFFICULTIES[(i + 1) % BOT_DIFFICULTIES.length]!;
}

export function botDifficultyLabel(difficulty: BotDifficulty): string {
  return difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
}

/**
 * Bot-safe seat count for vs-bot matches.
 * Always 2 for now (human seat 0 + one MCTS bot on seat 1).
 * 3-4p bot parties (multiple AI seats) are deferred - do not silently launch 4p MCTS.
 */
export function botSeatCount(
  _meta: Pick<GameMeta, 'hasBot' | 'minPlayers' | 'maxPlayers'>,
): number {
  return 2;
}

export function createMctsBotClass(difficulty: BotDifficulty) {
  const preset = MCTS_PRESETS[difficulty];
  return class extends MCTSBot {
    constructor(opts: ConstructorParameters<typeof MCTSBot>[0]) {
      super({
        ...opts,
        iterations: preset.iterations,
        playoutDepth: preset.playoutDepth,
      });
    }
  };
}
