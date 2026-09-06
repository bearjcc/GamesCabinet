import type { BoardProps } from 'boardgame.io/react';
import { useCallback, useRef, useState } from 'react';
import { PlayTable } from '../../components/PlayTable';
import { StatusBar } from '../../components/StatusBar';
import { Token } from '../../components/tabletop';
import { controlA11y } from '../../lib/actions';
import { deriveMatchStatus } from '../../lib/matchStatus';
import { columnDropState } from './actions';
import type { C4State } from './game';
import { COLS, ROWS } from './game';

function columnAtClientX(board: HTMLElement, clientX: number): number | null {
  const rect = board.getBoundingClientRect();
  const x = clientX - rect.left;
  if (x < 0 || x > rect.width) return null;
  const col = Math.floor((x / rect.width) * COLS);
  return col >= 0 && col < COLS ? col : null;
}

export function ConnectFourBoard({ G, ctx, moves, playerID }: BoardProps<C4State>) {
  const boardRef = useRef<HTMLDivElement>(null);
  const gestureDroppedRef = useRef(false);
  const [hoverCol, setHoverCol] = useState<number | null>(null);
  const [pointerTracking, setPointerTracking] = useState(false);

  const yourTurn = playerID !== null && ctx.currentPlayer === playerID && !ctx.gameover;
  const currentPlayer = playerID ?? ctx.currentPlayer;

  const { text: status, tone } = deriveMatchStatus(ctx, playerID, {
    isYourTurn: yourTurn,
    labels: { yourTurn: 'Your turn — tap a column' },
  });

  const updateHoverFromPointer = useCallback(
    (clientX: number) => {
      const board = boardRef.current;
      if (!board || !yourTurn) return;
      const col = columnAtClientX(board, clientX);
      if (col === null) {
        setHoverCol(null);
        return;
      }
      const { enabled } = columnDropState(G.cells, col, yourTurn);
      setHoverCol(enabled ? col : null);
    },
    [G.cells, yourTurn],
  );

  const dropInColumn = useCallback(
    (col: number) => {
      const { enabled } = columnDropState(G.cells, col, yourTurn);
      if (enabled) moves.drop(col);
    },
    [G.cells, moves, yourTurn],
  );

  const handlePointerDown = (e: React.PointerEvent, col: number) => {
    const { enabled } = columnDropState(G.cells, col, yourTurn);
    if (!enabled) return;
    boardRef.current?.setPointerCapture(e.pointerId);
    setPointerTracking(true);
    setHoverCol(col);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!pointerTracking) return;
    boardRef.current?.releasePointerCapture(e.pointerId);
    const board = boardRef.current;
    let dropCol = hoverCol;
    if (board) {
      const col = columnAtClientX(board, e.clientX);
      if (col !== null) {
        const { enabled } = columnDropState(G.cells, col, yourTurn);
        if (enabled) dropCol = col;
      }
    }
    if (dropCol !== null) dropInColumn(dropCol);
    gestureDroppedRef.current = true;
    setPointerTracking(false);
    setHoverCol(null);
  };

  const handleClick = (col: number) => {
    if (gestureDroppedRef.current) {
      gestureDroppedRef.current = false;
      return;
    }
    dropInColumn(col);
  };

  return (
    <PlayTable
      info={<StatusBar text={status} tone={tone} />}
      board={
        <div
          ref={boardRef}
          className="c4-board"
          role="grid"
          aria-label="Connect Four board"
          data-testid="c4-board"
          onPointerMove={(e) => {
            if (pointerTracking) updateHoverFromPointer(e.clientX);
          }}
          onPointerUp={handlePointerUp}
          onPointerLeave={() => {
            if (!pointerTracking) setHoverCol(null);
          }}
        >
          {Array.from({ length: COLS }, (_, col) => {
            const { enabled, disabledReason } = columnDropState(G.cells, col, yourTurn);
            const label = `Drop in column ${col + 1}`;
            const a11y = controlA11y({
              label,
              disabled: !enabled,
              disabledReason,
            });
            const showHeld = hoverCol === col && enabled;
            return (
              <button
                key={col}
                type="button"
                className={`c4-col${enabled ? ' is-open' : ''}${showHeld ? ' is-held' : ''}`}
                disabled={!enabled}
                data-testid={`c4-col-${col}`}
                data-disabled-reason={a11y.title}
                title={a11y.title}
                aria-label={a11y.ariaLabel}
                onPointerEnter={() => {
                  if (!pointerTracking && enabled) setHoverCol(col);
                }}
                onPointerLeave={() => {
                  if (!pointerTracking) setHoverCol(null);
                }}
                onPointerDown={(e) => handlePointerDown(e, col)}
                onClick={() => handleClick(col)}
              >
                {showHeld ? (
                  <span className="c4-held" aria-hidden data-testid={`c4-held-${col}`}>
                    <Token player={currentPlayer} variant="disc" size="md" />
                  </span>
                ) : null}
                {Array.from({ length: ROWS }, (_, row) => {
                  const cell = G.cells[row * COLS + col];
                  return (
                    <span
                      key={row}
                      className={`c4-cell${cell === null ? ' pe' : ''}`}
                      role="gridcell"
                      aria-hidden
                    >
                      {cell !== null ? <Token player={cell} variant="disc" size="md" /> : null}
                    </span>
                  );
                })}
              </button>
            );
          })}
        </div>
      }
    />
  );
}
