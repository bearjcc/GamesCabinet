import type { BoardProps } from 'boardgame.io/react';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Lift, Snap } from '../../components/cinematic';
import { PlayTable } from '../../components/PlayTable';
import { StatusBar } from '../../components/StatusBar';
import { Token } from '../../components/tabletop';
import { primitiveProfile } from '../../lib/cinematic';
import type { StatusTone } from '../../lib/matchStatus';
import { readEffectiveMotion } from '../../lib/motion';
import { playerSeatLabel } from '../../lib/playerLabel';
import { KENNEY_CROWN } from '../shared/tokens';
import type { CheckersState, Piece } from './game';
import { legalMoves, rc } from './game';

function squareCoord(row: number, col: number): string {
  return `${String.fromCharCode(97 + col)}${8 - row}`;
}

function checkersSeatLabel(
  player: string,
  matchData: BoardProps<CheckersState>['matchData'],
): string {
  return playerSeatLabel(player, matchData, player === '0' ? 'Red' : 'Black');
}

function squareAriaLabel(
  row: number,
  col: number,
  piece: Piece | null,
  isSelected: boolean,
  isTarget: boolean,
): string {
  const parts = [squareCoord(row, col)];
  if (piece) {
    const colour = piece.player === '0' ? 'red' : 'black';
    parts.push(piece.king ? `${colour} king` : `${colour} piece`);
  } else {
    parts.push('empty');
  }
  if (isSelected) parts.push('selected');
  if (isTarget) parts.push('move target');
  return parts.join(', ');
}

function cloneBoard(board: readonly (Piece | null)[]): (Piece | null)[] {
  return board.map((p) => (p ? { ...p } : null));
}

/** First square that gained a piece (move landing). */
function findLandingIndex(
  prev: readonly (Piece | null)[],
  next: readonly (Piece | null)[],
): number | null {
  for (let i = 0; i < next.length; i++) {
    if (next[i] && !prev[i]) return i;
  }
  return null;
}

function deriveCheckersStatus(
  ctx: BoardProps<CheckersState>['ctx'],
  _playerID: string | null | undefined,
  matchData: BoardProps<CheckersState>['matchData'],
  yourTurn: boolean,
  selected: number | null,
): { text: string; tone: StatusTone } {
  if (ctx.gameover) {
    const over = ctx.gameover as Record<string, unknown>;
    const winner = typeof over.winner === 'string' ? over.winner : null;
    if (winner) {
      const label = checkersSeatLabel(winner, matchData);
      return { text: `${label} wins`, tone: 'done' };
    }
    return { text: 'Game over', tone: 'done' };
  }

  const actor = checkersSeatLabel(ctx.currentPlayer, matchData);
  if (yourTurn) {
    if (selected === null) return { text: `${actor}'s turn`, tone: 'you' };
    return { text: `${actor} — choose a square`, tone: 'you' };
  }
  return { text: `${actor}'s turn`, tone: 'wait' };
}

type PieceChromeProps = {
  piece: Piece;
  liftPulse: number;
  liftActive: boolean;
  snapPulse: number;
  snapActive: boolean;
  hidden?: boolean;
};

/** Client-only Lift/Snap pulse; remounts so motion never gates G or taps. */
function PieceChrome({
  piece,
  liftPulse,
  liftActive,
  snapPulse,
  snapActive,
  hidden = false,
}: PieceChromeProps) {
  const inner = (
    <Token
      player={piece.player}
      variant="disc"
      size="md"
      badgeSrc={piece.king ? KENNEY_CROWN : null}
    />
  );
  const wrap = (node: ReactNode) => (
    <span className={`ck-piece${hidden ? ' is-dragging' : ''}`}>{node}</span>
  );
  if (snapActive) {
    return wrap(
      <Snap key={snapPulse} active={snapActive} className="ck-piece__cinematic">
        {inner}
      </Snap>,
    );
  }
  if (liftActive) {
    return wrap(
      <Lift key={liftPulse} active={liftActive} className="ck-piece__cinematic">
        {inner}
      </Lift>,
    );
  }
  return wrap(inner);
}

type DragState = {
  from: number;
  x: number;
  y: number;
};

export function CheckersBoard({ G, ctx, moves, playerID, matchData }: BoardProps<CheckersState>) {
  const boardRef = useRef<HTMLDivElement>(null);
  const draggedRef = useRef(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  /** Client-only selection / landing pulses; remount wrappers so motion never gates G. */
  const [selectPulse, setSelectPulse] = useState(0);
  const [selectActive, setSelectActive] = useState(false);
  const [landPulse, setLandPulse] = useState(0);
  const [landActive, setLandActive] = useState(false);
  const [landIndex, setLandIndex] = useState<number | null>(null);
  const prevSelectedRef = useRef(selected);
  const prevBoardRef = useRef(cloneBoard(G.board));

  const yourTurn = playerID !== null && ctx.currentPlayer === playerID && !ctx.gameover;
  const legal = yourTurn ? legalMoves(G, ctx.currentPlayer) : [];
  const targets =
    selected === null ? [] : legal.filter((m) => m.from === selected).map((m) => m.to);
  const selectable = new Set(legal.map((m) => m.from));
  const dragTargets =
    drag === null ? [] : legal.filter((m) => m.from === drag.from).map((m) => m.to);

  useEffect(() => {
    if (selected !== null && selected !== prevSelectedRef.current) {
      setSelectPulse((n) => n + 1);
    }
    prevSelectedRef.current = selected;
  }, [selected]);

  useEffect(() => {
    if (selectPulse === 0) return;
    setSelectActive(true);
    const ms = primitiveProfile('lift', readEffectiveMotion()).durationMs;
    const t = window.setTimeout(() => setSelectActive(false), ms);
    return () => window.clearTimeout(t);
  }, [selectPulse]);

  useEffect(() => {
    const landed = findLandingIndex(prevBoardRef.current, G.board);
    if (landed !== null) {
      setLandIndex(landed);
      setLandPulse((n) => n + 1);
    }
    prevBoardRef.current = cloneBoard(G.board);
  }, [G.board]);

  useEffect(() => {
    if (landPulse === 0) return;
    setLandActive(true);
    const ms = primitiveProfile('snap', readEffectiveMotion()).durationMs;
    const t = window.setTimeout(() => setLandActive(false), ms);
    return () => window.clearTimeout(t);
  }, [landPulse]);

  const { text: status, tone } = deriveCheckersStatus(ctx, playerID, matchData, yourTurn, selected);

  const tryMove = (from: number, to: number) => {
    const ok = legal.some((m) => m.from === from && m.to === to);
    if (!ok) return false;
    moves.movePiece(from, to);
    setSelected(null);
    return true;
  };

  const handleSquareClick = (index: number, piece: Piece | null, isTarget: boolean) => {
    if (draggedRef.current) {
      draggedRef.current = false;
      return;
    }
    if (!yourTurn || drag) return;
    if (isTarget && selected !== null) {
      tryMove(selected, index);
      return;
    }
    if (piece && selectable.has(index)) {
      setSelected(selected === index ? null : index);
      return;
    }
    setSelected(null);
  };

  const startDrag = (from: number, e: React.PointerEvent) => {
    if (!yourTurn || !selectable.has(from)) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setSelected(from);
    setDrag({ from, x: e.clientX, y: e.clientY });
    draggedRef.current = false;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY } : null));
  };

  const finishDrag = (e: React.PointerEvent) => {
    if (!drag) return;
    const board = boardRef.current;
    if (board?.hasPointerCapture(e.pointerId)) {
      board.releasePointerCapture(e.pointerId);
    }
    const hit = document.elementFromPoint(e.clientX, e.clientY);
    const sq = hit?.closest('[data-square-index]') as HTMLElement | null;
    if (sq) {
      const to = Number(sq.dataset.squareIndex);
      if (dragTargets.includes(to)) {
        tryMove(drag.from, to);
        draggedRef.current = true;
      }
    }
    setDrag(null);
  };

  const dragPiece = drag ? G.board[drag.from] : null;
  const litTargets = drag ? dragTargets : targets;

  return (
    <PlayTable
      info={<StatusBar text={status} tone={tone} />}
      board={
        <div className="checkers-stage">
          <div
            ref={boardRef}
            className="checkers-board"
            role="grid"
            aria-label="Checkers board"
            data-testid="checkers-board"
            onPointerMove={handlePointerMove}
            onPointerUp={finishDrag}
            onPointerCancel={finishDrag}
          >
            {Array.from({ length: 64 }, (_, i) => {
              const { row, col } = rc(i);
              const dark = (row + col) % 2 === 1;
              const piece = G.board[i];
              const isTarget = litTargets.includes(i);
              const isSel = selected === i;
              const isLanding = landIndex === i;
              const hidePiece = drag?.from === i;
              return (
                <button
                  key={i}
                  type="button"
                  data-square-index={i}
                  aria-label={squareAriaLabel(row, col, piece, isSel, isTarget)}
                  className={[
                    'ck-sq',
                    dark ? 'dark' : 'light',
                    isSel ? 'selected' : '',
                    isTarget ? 'target' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  disabled={!yourTurn}
                  onPointerDown={(e) => {
                    if (piece && selectable.has(i)) startDrag(i, e);
                  }}
                  onClick={() => handleSquareClick(i, piece, isTarget)}
                >
                  {piece ? (
                    <PieceChrome
                      piece={piece}
                      liftPulse={selectPulse}
                      liftActive={isSel && selectActive}
                      snapPulse={landPulse}
                      snapActive={isLanding && landActive}
                      hidden={hidePiece}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
          {drag && dragPiece ? (
            <div
              className="ck-drag-ghost"
              style={{ left: drag.x, top: drag.y }}
              aria-hidden
              data-testid="checkers-drag-ghost"
            >
              <Token
                player={dragPiece.player}
                variant="disc"
                size="md"
                badgeSrc={dragPiece.king ? KENNEY_CROWN : null}
              />
            </div>
          ) : null}
        </div>
      }
    />
  );
}
