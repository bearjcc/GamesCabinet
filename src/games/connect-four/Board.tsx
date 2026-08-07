import type { BoardProps } from 'boardgame.io/react';
import { ActionSurface } from '../../components/ActionSurface';
import { PlayTable } from '../../components/PlayTable';
import { StatusBar } from '../../components/StatusBar';
import { Token } from '../../components/tabletop';
import { controlA11y } from '../../lib/actions';
import { deriveMatchStatus } from '../../lib/matchStatus';
import { columnDropState, getConnectFourActions } from './actions';
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
                onClick={() => moves.drop(col)}
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
