import type { BoardProps } from 'boardgame.io/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PlayTable } from '../../components/PlayTable';
import { StatusBar } from '../../components/StatusBar';
import { Token } from '../../components/tabletop';
import { controlA11y } from '../../lib/actions';
import type { StatusTone } from '../../lib/matchStatus';
import { playerSeatLabel } from '../../lib/playerLabel';
import { nInARowWinningCells } from '../shared/grid';
import { WinLine } from '../shared/WinLine';
import { columnDropState } from './actions';
import type { C4State } from './game';
import { COLS, ROWS } from './game';

const WIN_LENGTH = 4;

function c4SeatLabel(player: string, matchData: BoardProps<C4State>['matchData']): string {
  return playerSeatLabel(player, matchData, player === '0' ? 'Yellow' : 'Red');
}

function columnAtClientX(board: HTMLElement, clientX: number): number | null {
  const rect = board.getBoundingClientRect();
  const x = clientX - rect.left;
  if (x < 0 || x > rect.width) return null;
  const col = Math.floor((x / rect.width) * COLS);
  return col >= 0 && col < COLS ? col : null;
}

function findNewDisc(
  prev: readonly (string | null)[],
  next: readonly (string | null)[],
): number | null {
  for (let i = 0; i < next.length; i++) {
    if (next[i] && !prev[i]) return i;
  }
  return null;
}

function dropRowCount(cellIndex: number): number {
  const row = Math.floor(cellIndex / COLS);
  return row + 1;
}

function deriveC4Status(
  ctx: BoardProps<C4State>['ctx'],
  _playerID: string | null | undefined,
  matchData: BoardProps<C4State>['matchData'],
  yourTurn: boolean,
): { text: string; tone: StatusTone } {
  if (ctx.gameover) {
    const over = ctx.gameover as Record<string, unknown>;
    if ('draw' in over) return { text: 'Draw', tone: 'done' };
    const winner = typeof over.winner === 'string' ? over.winner : null;
    if (winner) {
      const label = c4SeatLabel(winner, matchData);
      return { text: `${label} wins`, tone: 'done' };
    }
    return { text: 'Game over', tone: 'done' };
  }

  const actor = c4SeatLabel(ctx.currentPlayer, matchData);
  if (yourTurn) return { text: `${actor}'s turn`, tone: 'you' };
  return { text: `${actor}'s turn`, tone: 'wait' };
}

export function ConnectFourBoard({ G, ctx, moves, playerID, matchData }: BoardProps<C4State>) {
  const boardRef = useRef<HTMLDivElement>(null);
  const gestureDroppedRef = useRef(false);
  const prevCellsRef = useRef<(string | null)[]>([...G.cells]);
  const [hoverCol, setHoverCol] = useState<number | null>(null);
  const [pointerTracking, setPointerTracking] = useState(false);
  const [droppingCell, setDroppingCell] = useState<number | null>(null);
  const [dropRows, setDropRows] = useState(1);

  const yourTurn = playerID !== null && ctx.currentPlayer === playerID && !ctx.gameover;
  const currentPlayer = ctx.currentPlayer;

  const { text: status, tone } = deriveC4Status(ctx, playerID, matchData, yourTurn);

  const winningCells =
    ctx.gameover && !('draw' in (ctx.gameover as Record<string, unknown>))
      ? nInARowWinningCells(G.cells, { rows: ROWS, cols: COLS, n: WIN_LENGTH })
      : null;

  useEffect(() => {
    const landed = findNewDisc(prevCellsRef.current, G.cells);
    if (landed !== null) {
      setDropRows(dropRowCount(landed));
      setDroppingCell(landed);
      const ms = 420;
      const t = window.setTimeout(() => setDroppingCell(null), ms);
      prevCellsRef.current = [...G.cells];
      return () => window.clearTimeout(t);
    }
    prevCellsRef.current = [...G.cells];
  }, [G.cells]);

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
          className="c4-rack"
          ref={boardRef}
          data-testid="c4-board"
          onPointerMove={(e) => {
            if (pointerTracking) updateHoverFromPointer(e.clientX);
          }}
          onPointerUp={handlePointerUp}
          onPointerLeave={() => {
            if (!pointerTracking) setHoverCol(null);
          }}
        >
          <div className="c4-grid" role="grid" aria-label="Connect Four board">
            {G.cells.map((cell, i) => (
              <div key={i} className="c4-slot" role="gridcell" aria-hidden>
                {cell !== null ? (
                  <div
                    className={`c4-disc c4-disc--p${cell}${droppingCell === i ? ' is-dropping' : ''}`}
                    style={
                      droppingCell === i
                        ? ({ '--c4-drop-rows': dropRows } as React.CSSProperties)
                        : undefined
                    }
                  >
                    <Token player={cell} variant="disc" size="md" />
                  </div>
                ) : null}
                <div className="c4-hole-mask" aria-hidden />
              </div>
            ))}
          </div>
          {winningCells ? (
            <WinLine
              cells={winningCells}
              cols={COLS}
              rows={ROWS}
              className="c4-win-line"
              testId="c4-win-line"
            />
          ) : null}
          {hoverCol !== null && yourTurn ? (
            <div
              className={`c4-held c4-held--p${currentPlayer}`}
              style={{ left: `${((hoverCol + 0.5) / COLS) * 100}%` }}
              aria-hidden
              data-testid={`c4-held-${hoverCol}`}
            >
              <Token player={currentPlayer} variant="disc" size="md" />
            </div>
          ) : null}
          <div className="c4-columns" aria-hidden>
            {Array.from({ length: COLS }, (_, col) => {
              const { enabled, disabledReason } = columnDropState(G.cells, col, yourTurn);
              const label = `Drop in column ${col + 1}`;
              const a11y = controlA11y({
                label,
                disabled: !enabled,
                disabledReason,
              });
              return (
                <button
                  key={col}
                  type="button"
                  className={`c4-col${enabled ? ' is-open' : ''}`}
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
                />
              );
            })}
          </div>
          <div className="c4-lip" aria-hidden />
        </div>
      }
    />
  );
}
