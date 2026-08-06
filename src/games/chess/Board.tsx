import type { BoardProps } from 'boardgame.io/react';
import { useEffect, useRef, useState } from 'react';
import { ActionSurface } from '../../components/ActionSurface';
import { Lift, Snap } from '../../components/cinematic';
import { PlayTable } from '../../components/PlayTable';
import { StatusBar } from '../../components/StatusBar';
import { primitiveProfile } from '../../lib/cinematic';
import { deriveMatchStatus } from '../../lib/matchStatus';
import { readEffectiveMotion } from '../../lib/motion';
import { getChessActions } from './actions';
import type { ChessState, Piece, PieceType } from './game';
import { legalMoves, rc } from './game';

const PIECE_SRC: Record<PieceType, string> = {
  K: '/assets/kenney/board-game-icons/Vector/Icons/chess_king.svg',
  Q: '/assets/kenney/board-game-icons/Vector/Icons/chess_queen.svg',
  R: '/assets/kenney/board-game-icons/Vector/Icons/chess_rook.svg',
  B: '/assets/kenney/board-game-icons/Vector/Icons/chess_bishop.svg',
  N: '/assets/kenney/board-game-icons/Vector/Icons/chess_knight.svg',
  P: '/assets/kenney/board-game-icons/Vector/Icons/chess_pawn.svg',
};

const PIECE_NAME: Record<PieceType, string> = {
  K: 'king',
  Q: 'queen',
  R: 'rook',
  B: 'bishop',
  N: 'knight',
  P: 'pawn',
};

function squareCoord(row: number, col: number): string {
  return `${String.fromCharCode(97 + col)}${8 - row}`;
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
    const colour = piece.player === '0' ? 'white' : 'black';
    parts.push(`${colour} ${PIECE_NAME[piece.type]}`);
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

type PieceChromeProps = {
  piece: Piece;
  liftPulse: number;
  liftActive: boolean;
  snapPulse: number;
  snapActive: boolean;
};

/** Client-only Lift/Snap pulse; remounts so motion never gates G or taps. */
function PieceChrome({ piece, liftPulse, liftActive, snapPulse, snapActive }: PieceChromeProps) {
  const inner = (
    <img
      className={`chess-piece p${piece.player}`}
      src={PIECE_SRC[piece.type]}
      alt=""
      draggable={false}
    />
  );
  if (snapActive) {
    return (
      <Snap key={snapPulse} active={snapActive} className="chess-piece__cinematic">
        {inner}
      </Snap>
    );
  }
  if (liftActive) {
    return (
      <Lift key={liftPulse} active={liftActive} className="chess-piece__cinematic">
        {inner}
      </Lift>
    );
  }
  return inner;
}

export function ChessBoard({ G, ctx, moves, playerID }: BoardProps<ChessState>) {
  const [selected, setSelected] = useState<number | null>(null);
  /** Client-only selection / landing pulses; remount wrappers so motion never gates G. */
  const [selectPulse, setSelectPulse] = useState(0);
  const [selectActive, setSelectActive] = useState(false);
  const [landPulse, setLandPulse] = useState(0);
  const [landActive, setLandActive] = useState(false);
  const [landIndex, setLandIndex] = useState<number | null>(null);
  const prevSelectedRef = useRef(selected);
  const prevBoardRef = useRef(cloneBoard(G.board));

  const yourTurn = playerID !== null && ctx.currentPlayer === playerID && !ctx.gameover;
  const player = playerID ?? ctx.currentPlayer;
  const legal = yourTurn ? legalMoves(G, ctx.currentPlayer) : [];
  const targets =
    selected === null ? [] : legal.filter((m) => m.from === selected).map((m) => m.to);
  const selectable = new Set(legal.map((m) => m.from));

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

  const { text: status, tone } = deriveMatchStatus(ctx, playerID, {
    isYourTurn: yourTurn,
    labels: {
      yourTurn: selected === null ? 'Your turn - tap a piece' : 'Tap a square to move',
    },
  });

  const pewActions = getChessActions({ G, player, yourTurn, selected });
  const surfaceActions = pewActions.map((action) => ({
    ...action,
    onAction: () => {
      const match = /^move-to-(\d+)$/.exec(action.id);
      if (!match || selected === null) return;
      moves.move(selected, Number(match[1]));
      setSelected(null);
    },
  }));

  return (
    <PlayTable
      info={<StatusBar text={status} tone={tone} />}
      board={
        <div className="chess-board" role="grid" aria-label="Chess board" data-testid="chess-board">
          {Array.from({ length: 64 }, (_, i) => {
            const { row, col } = rc(i);
            const light = (row + col) % 2 === 0;
            const piece = G.board[i];
            const isTarget = targets.includes(i);
            const isSel = selected === i;
            const isLanding = landIndex === i;
            return (
              <button
                key={i}
                type="button"
                data-testid={`chess-cell-${i}`}
                aria-label={squareAriaLabel(row, col, piece, isSel, isTarget)}
                className={[
                  'chess-sq',
                  light ? 'light' : 'dark',
                  isSel ? 'selected' : '',
                  isTarget ? 'target' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                disabled={
                  !yourTurn || (!!piece && !selectable.has(i) && !isTarget) || (!piece && !isTarget)
                }
                onClick={() => {
                  if (isTarget && selected !== null) {
                    moves.move(selected, i);
                    setSelected(null);
                    return;
                  }
                  if (piece && selectable.has(i)) setSelected(i);
                }}
              >
                {piece ? (
                  <PieceChrome
                    piece={piece}
                    liftPulse={selectPulse}
                    liftActive={isSel && selectActive}
                    snapPulse={landPulse}
                    snapActive={isLanding && landActive}
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      }
      actions={<ActionSurface label="Chess actions" actions={surfaceActions} />}
    />
  );
}
