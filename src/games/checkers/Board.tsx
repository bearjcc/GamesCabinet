import type { BoardProps } from 'boardgame.io/react';
import { useState } from 'react';
import { PlayTable } from '../../components/PlayTable';
import { StatusBar } from '../../components/StatusBar';
import type { CheckersState, Piece } from './game';
import { legalMoves, rc } from './game';

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
    const colour = piece.player === '0' ? 'red' : 'black';
    parts.push(piece.king ? `${colour} king` : `${colour} piece`);
  } else {
    parts.push('empty');
  }
  if (isSelected) parts.push('selected');
  if (isTarget) parts.push('move target');
  return parts.join(', ');
}

export function CheckersBoard({ G, ctx, moves, playerID }: BoardProps<CheckersState>) {
  const [selected, setSelected] = useState<number | null>(null);
  const yourTurn = playerID !== null && ctx.currentPlayer === playerID && !ctx.gameover;
  const legal = yourTurn ? legalMoves(G, ctx.currentPlayer) : [];
  const targets =
    selected === null ? [] : legal.filter((m) => m.from === selected).map((m) => m.to);
  const selectable = new Set(legal.map((m) => m.from));

  let status = 'Waiting…';
  let tone: 'neutral' | 'you' | 'wait' | 'done' = 'wait';
  if (ctx.gameover) {
    tone = 'done';
    status = ctx.gameover.winner === playerID ? 'You win' : 'Opponent wins';
  } else if (yourTurn) {
    tone = 'you';
    status = selected === null ? 'Your turn — tap a piece' : 'Tap a square to move';
  } else {
    status = 'Their turn';
  }

  return (
    <PlayTable
      info={<StatusBar text={status} tone={tone} />}
      board={
        <div
          className="checkers-board"
          role="grid"
          aria-label="Checkers board"
          data-testid="checkers-board"
        >
          {Array.from({ length: 64 }, (_, i) => {
            const { row, col } = rc(i);
            const dark = (row + col) % 2 === 1;
            const piece = G.board[i];
            const isTarget = targets.includes(i);
            const isSel = selected === i;
            return (
              <button
                key={i}
                type="button"
                aria-label={squareAriaLabel(row, col, piece, isSel, isTarget)}
                className={[
                  'ck-sq',
                  dark ? 'dark' : 'light',
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
                    moves.movePiece(selected, i);
                    setSelected(null);
                    return;
                  }
                  if (piece && selectable.has(i)) setSelected(i);
                }}
              >
                {piece ? (
                  <span className={`ck-piece p${piece.player}${piece.king ? ' king' : ''}`} />
                ) : null}
              </button>
            );
          })}
        </div>
      }
    />
  );
}
