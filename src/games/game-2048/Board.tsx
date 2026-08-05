import type { BoardProps } from 'boardgame.io/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { LeaderboardPanel } from '../../components/LeaderboardPanel';
import { PlayTable } from '../../components/PlayTable';
import { ScoreSubmitter } from '../../components/ScoreSubmitter';
import { StatusBar } from '../../components/StatusBar';
import type { SubmitScoreInput } from '../../lib/scores';
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

  let status = `Score ${G.score}`;
  let tone: 'neutral' | 'you' | 'wait' | 'done' = 'you';
  if (ctx.gameover) {
    tone = 'done';
    const over = ctx.gameover as { score: number; won: boolean };
    status = over.won
      ? `Game over — you reached 2048. Score ${over.score}`
      : `Game over — score ${over.score}`;
  } else if (G.won) {
    status = `Score ${G.score} — 2048 reached`;
  } else {
    status = `Score ${G.score} — swipe or arrow keys`;
  }

  return (
    <>
      <ScoreSubmitter gameId="2048" pendingSubmit={pendingSubmit} />
      <PlayTable
        info={
          <>
            <StatusBar text={status} tone={tone} />
            <div className="lw-tabs">
              <button
                type="button"
                className={`btn${tab === 'play' ? ' is-active' : ''}`}
                data-testid="g2048-tab-play"
                onClick={() => setTab('play')}
              >
                Play
              </button>
              <button
                type="button"
                className={`btn${tab === 'scores' ? ' is-active' : ''}`}
                data-testid="g2048-tab-scores"
                onClick={() => setTab('scores')}
              >
                Scores
              </button>
            </div>
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
        pew={
          tab === 'play' ? (
            <div className="g2048-pad" role="group" aria-label="Swipe controls">
              {(['up', 'left', 'down', 'right'] as const).map((dir) => (
                <button
                  key={dir}
                  type="button"
                  className={`btn g2048-pad-${dir}`}
                  disabled={!playable}
                  data-testid={`g2048-${dir}`}
                  onClick={() => moves.swipe(dir)}
                >
                  {dir}
                </button>
              ))}
            </div>
          ) : null
        }
      />
    </>
  );
}
