import type { BoardProps } from 'boardgame.io/react';
import { ActionSurface } from '../../components/ActionSurface';
import { PlayTable } from '../../components/PlayTable';
import { StatusBar } from '../../components/StatusBar';
import { Token } from '../../components/tabletop';
import { deriveMatchStatus } from '../../lib/matchStatus';
import { getConnectFourActions } from './actions';
import type { C4State } from './game';
import { COLS, ROWS } from './game';

export function ConnectFourBoard({ G, ctx, moves, playerID }: BoardProps<C4State>) {
  const yourTurn = playerID !== null && ctx.currentPlayer === playerID && !ctx.gameover;
  const { text: status, tone } = deriveMatchStatus(ctx, playerID, {
    isYourTurn: yourTurn,
    labels: { yourTurn: 'Your turn — tap a column' },
  });

  const pewActions = getConnectFourActions({ G, yourTurn });
  const surfaceActions = pewActions.map((action) => ({
    ...action,
    onAction: () => {
      const match = /^drop-(\d+)$/.exec(action.id);
      if (match) moves.drop(Number(match[1]));
    },
  }));

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
      actions={<ActionSurface label="Connect Four actions" actions={surfaceActions} />}
    />
  );
}
