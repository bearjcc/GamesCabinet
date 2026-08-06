import type { BoardProps } from 'boardgame.io/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActionSurface } from '../../components/ActionSurface';
import { AnimatedCounter } from '../../components/cinematic';
import { LeaderboardPanel } from '../../components/LeaderboardPanel';
import { PlayTable } from '../../components/PlayTable';
import { ScoreSubmitter } from '../../components/ScoreSubmitter';
import { SoloPlayTabs } from '../../components/SoloPlayTabs';
import { StatusBar } from '../../components/StatusBar';
import type { StatusTone } from '../../lib/matchStatus';
import type { SubmitScoreInput } from '../../lib/scores';
import { get2048Actions } from './actions';
import type { Game2048State, SwipeDir } from './game';

const DIRS: Record<string, SwipeDir> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
};

export function Game2048Board({ G, ctx, moves, isActive }: BoardProps<Game2048State>) {
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const playable = Boolean(isActive && !ctx.gameover);
  const [tab, setTab] = useState<'play' | 'scores'>('play');
  const showPlayChrome = tab === 'play';

  const pendingSubmit = useMemo((): SubmitScoreInput | null => {
    if (!ctx.gameover) return null;
    const over = ctx.gameover as { score: number; won: boolean };
    return { score: over.score, meta: { won: over.won } };
  }, [ctx.gameover]);

  useEffect(() => {
    if (!playable) return;
    const onKey = (e: KeyboardEvent) => {
      const dir = DIRS[e.key];
      if (!dir) return;
      e.preventDefault();
      moves.swipe(dir);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [moves, playable]);

  // Solo score chrome - not the multiplayer turn/win shape of deriveMatchStatus.
  const scoreValue = ctx.gameover ? (ctx.gameover as { score: number }).score : G.score;
  let status = 'Swipe or arrow keys';
  let tone: StatusTone = 'you';
  if (ctx.gameover) {
    tone = 'done';
    const over = ctx.gameover as { score: number; won: boolean };
    status = over.won ? 'Game over - you reached 2048' : 'Game over';
  } else if (G.won) {
    status = '2048 reached - keep going';
  }

  const pewActions = get2048Actions({ G, playable, gameover: ctx.gameover });
  const surfaceActions = pewActions.map((action) => ({
    ...action,
    onAction: () => {
      if (action.id === 'undo') {
        moves.undo();
        return;
      }
      const match = /^swipe-(up|down|left|right)$/.exec(action.id);
      if (match) moves.swipe(match[1] as SwipeDir);
    },
  }));

  return (
    <>
      <ScoreSubmitter gameId="2048" pendingSubmit={pendingSubmit} />
      <PlayTable
        info={
          <>
            <div className="g2048-scoreline" data-testid="g2048-score">
              <span className="g2048-score-label">Score</span>
              <AnimatedCounter value={scoreValue} className="g2048-score-value" />
            </div>
            <StatusBar text={status} tone={tone} />
            <SoloPlayTabs value={tab} onChange={setTab} testIdPrefix="g2048" />
          </>
        }
        board={
          tab === 'scores' ? (
            <LeaderboardPanel gameId="2048" testIdPrefix="g2048" />
          ) : (
            <div
              className="g2048-board"
              role="grid"
              aria-label="2048 board"
              data-testid="g2048-board"
              onTouchStart={(e) => {
                const t = e.changedTouches[0];
                touchStart.current = { x: t.clientX, y: t.clientY };
              }}
              onTouchEnd={(e) => {
                if (!playable || !touchStart.current) return;
                const t = e.changedTouches[0];
                const dx = t.clientX - touchStart.current.x;
                const dy = t.clientY - touchStart.current.y;
                touchStart.current = null;
                if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
                const dir: SwipeDir =
                  Math.abs(dx) > Math.abs(dy)
                    ? dx > 0
                      ? 'right'
                      : 'left'
                    : dy > 0
                      ? 'down'
                      : 'up';
                moves.swipe(dir);
              }}
            >
              {G.cells.map((cell, i) => (
                <div
                  key={i}
                  className={`g2048-cell${cell ? ` v${Math.min(cell, 2048)}` : ''}`}
                  role="gridcell"
                  aria-label={cell ? String(cell) : 'empty'}
                >
                  {cell ?? ''}
                </div>
              ))}
            </div>
          )
        }
        actions={
          showPlayChrome ? <ActionSurface label="2048 actions" actions={surfaceActions} /> : null
        }
      />
    </>
  );
}
