import type { BoardProps } from 'boardgame.io/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActionSurface } from '../../components/ActionSurface';
import { AnimatedCounter } from '../../components/cinematic';
import { SoloLeaderboardShell } from '../../components/SoloLeaderboardShell';
import { StatusBar } from '../../components/StatusBar';
import type { StatusTone } from '../../lib/matchStatus';
import type { SubmitScoreInput } from '../../lib/scores';
import { getSoloBestScore, updateSoloBestScore } from '../../lib/storage';
import { get2048Actions } from './actions';
import type { Game2048State, SwipeDir } from './game';

const KEY_DIRS: Record<string, SwipeDir> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  W: 'up',
  s: 'down',
  S: 'down',
  a: 'left',
  A: 'left',
  d: 'right',
  D: 'right',
};

function tileClass(value: number | null, popped: boolean): string {
  if (!value) return 'g2048-cell';
  const classes = [`g2048-cell`, `v${value}`];
  if (popped) classes.push('is-new');
  return classes.join(' ');
}

export function Game2048Board({ G, ctx, moves, isActive, reset }: BoardProps<Game2048State>) {
  const playAreaRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const prevCells = useRef(G.cells);
  const [popped, setPopped] = useState<Set<number>>(() => new Set());
  const [bestScore, setBestScore] = useState(() => getSoloBestScore('2048'));
  const [tab, setTab] = useState<'play' | 'scores'>('play');

  const playable = Boolean(isActive && !ctx.gameover && !G.winPaused);
  const scoreValue = ctx.gameover ? (ctx.gameover as { score: number }).score : G.score;

  useEffect(() => {
    const next = new Set<number>();
    for (let i = 0; i < G.cells.length; i++) {
      if (G.cells[i] !== prevCells.current[i] && G.cells[i] !== null) {
        next.add(i);
      }
    }
    prevCells.current = G.cells;
    if (next.size === 0) return;
    setPopped(next);
    const timer = window.setTimeout(() => setPopped(new Set()), 180);
    return () => window.clearTimeout(timer);
  }, [G.cells]);

  useEffect(() => {
    const current = ctx.gameover ? (ctx.gameover as { score: number }).score : G.score;
    setBestScore(updateSoloBestScore('2048', current));
  }, [G.score, ctx.gameover]);

  const pendingSubmit = useMemo((): SubmitScoreInput | null => {
    if (!ctx.gameover) return null;
    const over = ctx.gameover as { score: number; won: boolean };
    return { score: over.score, meta: { won: over.won } };
  }, [ctx.gameover]);

  useEffect(() => {
    if (!playable) return;
    const onKey = (e: KeyboardEvent) => {
      const dir = KEY_DIRS[e.key];
      if (!dir) return;
      e.preventDefault();
      moves.swipe(dir);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [moves, playable]);

  useEffect(() => {
    const node = playAreaRef.current;
    if (!node || !playable) return;

    const onTouchStart = (e: TouchEvent) => {
      const t = e.changedTouches[0];
      touchStart.current = { x: t.clientX, y: t.clientY };
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!touchStart.current) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStart.current.x;
      const dy = t.clientY - touchStart.current.y;
      touchStart.current = null;
      if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
      const dir: SwipeDir =
        Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
      moves.swipe(dir);
    };

    node.addEventListener('touchstart', onTouchStart, { passive: true });
    node.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      node.removeEventListener('touchstart', onTouchStart);
      node.removeEventListener('touchend', onTouchEnd);
    };
  }, [moves, playable]);

  let status = 'Swipe, arrow keys, or WASD';
  let tone: StatusTone = 'you';
  if (ctx.gameover) {
    tone = 'done';
    const over = ctx.gameover as { score: number; won: boolean };
    status = over.won ? 'Game over - you reached 2048' : 'Game over';
  } else if (G.winPaused) {
    tone = 'you';
    status = 'You made 2048!';
  } else if (G.won) {
    status = 'Keep going for a higher score';
  }

  const pewActions = get2048Actions({ G, playable, gameover: ctx.gameover });
  const surfaceActions = pewActions.map((action) => ({
    ...action,
    onAction: () => {
      if (action.id === 'undo') {
        moves.undo();
        return;
      }
      if (action.id === 'keep-going') {
        moves.keepGoing();
        return;
      }
      if (action.id === 'new-game' || action.id === 'try-again') {
        reset();
        return;
      }
    },
  }));

  return (
    <SoloLeaderboardShell
      gameId="2048"
      pendingSubmit={pendingSubmit}
      tab={tab}
      onTabChange={setTab}
      testIdPrefix="g2048"
      info={
        <>
          <div className="g2048-scores" data-testid="g2048-score">
            <div className="g2048-scoreline">
              <span className="g2048-score-label">Score</span>
              <AnimatedCounter value={scoreValue} className="g2048-score-value" />
            </div>
            <div className="g2048-scoreline">
              <span className="g2048-score-label">Best</span>
              <span className="g2048-score-value" data-testid="g2048-best">
                {bestScore}
              </span>
            </div>
          </div>
          <StatusBar text={status} tone={tone} />
        </>
      }
      board={
        <div ref={playAreaRef} className="g2048-play-area" data-testid="g2048-play-area">
          <div
            className="g2048-board"
            role="grid"
            aria-label="2048 board"
            data-testid="g2048-board"
          >
            {G.cells.map((cell, i) => (
              <div
                key={i}
                className={tileClass(cell, popped.has(i))}
                role="gridcell"
                aria-label={cell ? String(cell) : 'empty'}
              >
                {cell ?? ''}
              </div>
            ))}
          </div>
          {G.winPaused && !ctx.gameover ? (
            <div className="g2048-win-overlay" data-testid="g2048-win-overlay">
              <p className="g2048-win-title">You made 2048!</p>
            </div>
          ) : null}
        </div>
      }
      actions={<ActionSurface label="2048 actions" actions={surfaceActions} />}
    />
  );
}
