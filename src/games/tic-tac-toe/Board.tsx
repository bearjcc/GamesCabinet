import type { BoardProps } from 'boardgame.io/react';
import { ActionSurface } from '../../components/ActionSurface';
import { PlayTable } from '../../components/PlayTable';
import { StatusBar } from '../../components/StatusBar';
import { deriveMatchStatus } from '../../lib/matchStatus';
import { getTicTacToeActions } from './actions';
import type { TTTState } from './game';

const marks = ['X', 'O'] as const;

export function TicTacToeBoard({ G, ctx, moves, playerID, isActive }: BoardProps<TTTState>) {
  const yourTurn = Boolean(isActive && !ctx.gameover);
  const { text: status, tone } = deriveMatchStatus(ctx, playerID, {
    isYourTurn: yourTurn,
    labels: { yourTurn: 'Your turn — tap a square' },
  });

  const pewActions = getTicTacToeActions({ G, yourTurn });
  const surfaceActions = pewActions.map((action) => ({
    ...action,
    onAction: () => {
      const match = /^click-cell-(\d+)$/.exec(action.id);
      if (match) moves.clickCell(Number(match[1]));
    },
  }));

  return (
    <PlayTable
      info={<StatusBar text={status} tone={tone} />}
      board={
        <div
          className="ttt-grid"
          role="grid"
          aria-label="Tic-tac-toe board"
          data-testid="ttt-board"
        >
          {G.cells.map((cell, i) => {
            const can = yourTurn && cell === null;
            return (
              <button
                key={i}
                type="button"
                className={`ttt-cell${can ? ' is-open' : ''}`}
                disabled={!can}
                data-testid={`ttt-cell-${i}`}
                onClick={() => moves.clickCell(i)}
                aria-label={
                  cell === null
                    ? `Empty square ${i + 1}`
                    : `${marks[Number(cell)]} in square ${i + 1}`
                }
              >
                {cell === null ? '' : marks[Number(cell)]}
              </button>
            );
          })}
        </div>
      }
      actions={<ActionSurface label="Tic-tac-toe actions" actions={surfaceActions} />}
    />
  );
}
