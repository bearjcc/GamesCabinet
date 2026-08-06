import type { BoardProps } from 'boardgame.io/react';
import { PlayTable } from '../../components/PlayTable';
import { StatusBar } from '../../components/StatusBar';
import { deriveMatchStatus } from '../../lib/matchStatus';
import type { C4State } from './game';
import { COLS, ROWS } from './game';

export function ConnectFourBoard({ G, ctx, moves, playerID }: BoardProps<C4State>) {
  const yourTurn = playerID !== null && ctx.currentPlayer === playerID && !ctx.gameover;
  const { text: status, tone } = deriveMatchStatus(ctx, playerID, {
    isYourTurn: yourTurn,
    labels: { yourTurn: 'Your turn — tap a column' },
  });

  return (
    <PlayTable
      info={<StatusBar text={status} tone={tone} />}
      board={
        <div
          className="c4-board"
          role="grid"
          aria-label="Connect Four board"
          data-testid="c4-board"
        >
          {Array.from({ length: COLS }, (_, col) => {
            const canDrop =
              yourTurn &&
              Array.from({ length: ROWS }).some((_, r) => G.cells[r * COLS + col] === null);
            return (
              <button
                key={col}
                type="button"
                className={`c4-col${canDrop ? ' is-open' : ''}`}
                disabled={!canDrop}
                data-testid={`c4-col-${col}`}
                onClick={() => moves.drop(col)}
                aria-label={`Drop in column ${col + 1}`}
              >
                {Array.from({ length: ROWS }, (_, row) => {
                  const cell = G.cells[row * COLS + col];
                  return (
                    <span
                      key={row}
                      className={`c4-cell p${cell ?? 'e'}`}
                      role="gridcell"
                      aria-hidden
                    />
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
