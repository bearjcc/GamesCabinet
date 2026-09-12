import type { BoardProps } from 'boardgame.io/react';
import { useMemo } from 'react';
import { PlayTable } from '../../components/PlayTable';
import { StatusBar } from '../../components/StatusBar';
import { controlA11y } from '../../lib/actions';
import { useMatchStatus } from '../../lib/useMatchStatus';
import { nInARowWinningIndices } from '../shared/grid';
import { squareMarkState } from './actions';
import type { TTTState } from './game';

const marks = ['X', 'O'] as const;
const SIZE = 3;

export function TicTacToeBoard({ G, ctx, moves, playerID, isActive }: BoardProps<TTTState>) {
  const yourTurn = Boolean(isActive && !ctx.gameover);
  const { text: status, tone } = useMatchStatus(ctx, playerID, {
    isYourTurn: yourTurn,
    labels: { yourTurn: 'Your turn — tap a square' },
  });
  const winningCells = useMemo(() => {
    if (!ctx.gameover) return null;
    const over = ctx.gameover as { draw?: boolean };
    if (over.draw) return null;
    return nInARowWinningIndices(G.cells, { rows: SIZE, cols: SIZE, n: SIZE });
  }, [ctx.gameover, G.cells]);

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
            const { enabled, disabledReason } = squareMarkState(cell, yourTurn);
            const a11y = controlA11y({
              label:
                cell === null
                  ? `Empty square ${i + 1}`
                  : `${marks[Number(cell)]} in square ${i + 1}`,
              disabled: !enabled,
              disabledReason,
            });
            return (
              <button
                key={i}
                type="button"
                className={`ttt-cell${enabled ? ' is-open' : ''}${winningCells?.includes(i) ? ' is-winning' : ''}`}
                disabled={!enabled}
                data-testid={`ttt-cell-${i}`}
                data-disabled-reason={a11y.title}
                title={a11y.title}
                onClick={() => moves.clickCell(i)}
                aria-label={a11y.ariaLabel}
              >
                {cell === null ? '' : marks[Number(cell)]}
              </button>
            );
          })}
        </div>
      }
    />
  );
}
