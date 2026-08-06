export type StatusTone = 'neutral' | 'you' | 'wait' | 'done';

export type MatchStatus = {
  text: string;
  tone: StatusTone;
};

export type MatchStatusLabels = {
  waiting: string;
  yourTurn: string;
  theirTurn: string;
  youWin: string;
  opponentWins: string;
  draw: string;
};

export type MatchStatusCtx = {
  currentPlayer: string;
  gameover?: unknown;
};

export type DeriveMatchStatusOptions = {
  /** Custom copy for the common match-status cases. */
  labels?: Partial<MatchStatusLabels>;
  /**
   * Override seat-vs-currentPlayer turn detection (e.g. boardgame.io `isActive`,
   * or UI that still treats the seat as active while selecting a piece).
   */
  isYourTurn?: boolean;
  /** Lobby / seat-fill gate before play starts. */
  waiting?: boolean;
};

const DEFAULT_LABELS: MatchStatusLabels = {
  waiting: 'Waiting…',
  yourTurn: 'Your turn',
  theirTurn: 'Their turn',
  youWin: 'You win',
  opponentWins: 'Opponent wins',
  draw: 'Draw',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Pure status line for the common turn / endgame cases across cabinet boards. */
export function deriveMatchStatus(
  ctx: MatchStatusCtx,
  playerID: string | null | undefined,
  options?: DeriveMatchStatusOptions,
): MatchStatus {
  const labels = { ...DEFAULT_LABELS, ...options?.labels };

  if (ctx.gameover) {
    const over = isRecord(ctx.gameover) ? ctx.gameover : {};
    if ('draw' in over) {
      return { text: labels.draw, tone: 'done' };
    }
    const winner = typeof over.winner === 'string' ? over.winner : undefined;
    if (playerID != null && winner === playerID) {
      return { text: labels.youWin, tone: 'done' };
    }
    return { text: labels.opponentWins, tone: 'done' };
  }

  if (options?.waiting) {
    return { text: labels.waiting, tone: 'wait' };
  }

  const yourTurn = options?.isYourTurn ?? (playerID != null && playerID === ctx.currentPlayer);

  if (yourTurn) {
    return { text: labels.yourTurn, tone: 'you' };
  }

  return { text: labels.theirTurn, tone: 'wait' };
}
