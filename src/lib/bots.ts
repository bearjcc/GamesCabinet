import type { Game, State } from 'boardgame.io';
import { MCTSBot } from 'boardgame.io/ai';

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

export type BotMove = {
  type: string;
  args?: unknown[];
};

export async function chooseBotMove(
  game: Game,
  state: State,
  playerID: string,
  difficulty: BotDifficulty = 'medium',
): Promise<BotMove | null> {
  const enumerate = game.ai?.enumerate;
  if (!enumerate || state.ctx.gameover) return null;
  const Bot = createMctsBotClass(difficulty);
  const bot = new Bot({ enumerate, game });
  const result = await bot.play(state, playerID);
  const payload = result.action.payload;
  return { type: payload.type, args: payload.args };
}
