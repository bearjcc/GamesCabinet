import type { BoardProps } from 'boardgame.io/react';
import { PlayTable } from '../../components/PlayTable';
import { StatusBar } from '../../components/StatusBar';
import { controlA11y } from '../../lib/actions';
import type { StatusTone } from '../../lib/matchStatus';
import { playerSeatLabel } from '../../lib/playerLabel';
import { nInARowWinningCells } from '../shared/grid';
import { WinLine } from '../shared/WinLine';
import { squareMarkState } from './actions';
import type { TTTState } from './game';

const SIZE = 3;

function markName(player: string): string {
  return player === '0' ? 'X' : 'O';
}

function seatLabel(player: string, matchData: BoardProps<TTTState>['matchData']): string {
  return playerSeatLabel(player, matchData, markName(player));
}

function TttMark({ player }: { player: string }) {
  if (player === '0') {
    return (
      <svg className="ttt-mark ttt-mark--x" viewBox="0 0 1 1" aria-hidden role="presentation">
        <line x1="0.18" y1="0.18" x2="0.82" y2="0.82" />
        <line x1="0.82" y1="0.18" x2="0.18" y2="0.82" />
      </svg>
    );
  }
  return (
    <svg className="ttt-mark ttt-mark--o" viewBox="0 0 1 1" aria-hidden role="presentation">
      <circle cx="0.5" cy="0.5" r="0.34" fill="none" />
    </svg>
  );
}

function deriveTttStatus(
  ctx: BoardProps<TTTState>['ctx'],
  playerID: string | null | undefined,
  matchData: BoardProps<TTTState>['matchData'],
  yourTurn: boolean,
): { text: string; tone: StatusTone } {
  if (ctx.gameover) {
    const over = ctx.gameover as Record<string, unknown>;
    if ('draw' in over) return { text: 'Draw', tone: 'done' };
    const winner = typeof over.winner === 'string' ? over.winner : null;
    if (winner) {
      const label = seatLabel(winner, matchData);
      if (playerID != null && winner === playerID) {
        return { text: `${label} wins`, tone: 'done' };
      }
      return { text: `${label} wins`, tone: 'done' };
    }
    return { text: 'Game over', tone: 'done' };
  }

  const actor = seatLabel(ctx.currentPlayer, matchData);
  if (yourTurn) {
    return { text: `${actor}'s turn`, tone: 'you' };
  }
  return { text: `${actor}'s turn`, tone: 'wait' };
}

export function TicTacToeBoard({
  G,
  ctx,
  moves,
  playerID,
  isActive,
  matchData,
}: BoardProps<TTTState>) {
  const yourTurn = Boolean(isActive && !ctx.gameover);
  const { text: status, tone } = deriveTttStatus(ctx, playerID, matchData, yourTurn);
  const winningCells =
    ctx.gameover && !('draw' in (ctx.gameover as Record<string, unknown>))
      ? nInARowWinningCells(G.cells, { rows: SIZE, cols: SIZE, n: SIZE })
      : null;

  return (
    <PlayTable
      info={<StatusBar text={status} tone={tone} />}
      board={
        <div className="ttt-board-wrap" data-testid="ttt-board">
          <div className="ttt-lines" aria-hidden>
            <span className="ttt-line ttt-line--v ttt-line--v1" />
            <span className="ttt-line ttt-line--v ttt-line--v2" />
            <span className="ttt-line ttt-line--h ttt-line--h1" />
            <span className="ttt-line ttt-line--h ttt-line--h2" />
          </div>
          <div className="ttt-grid" role="grid" aria-label="Tic-tac-toe board">
            {G.cells.map((cell, i) => {
              const { enabled, disabledReason } = squareMarkState(cell, yourTurn);
              const mark = cell === null ? null : markName(cell);
              const a11y = controlA11y({
                label: cell === null ? `Empty square ${i + 1}` : `${mark} in square ${i + 1}`,
                disabled: !enabled,
                disabledReason,
              });
              return (
                <button
                  key={i}
                  type="button"
                  className={`ttt-cell${enabled ? ' is-open' : ''}`}
                  disabled={!enabled}
                  data-testid={`ttt-cell-${i}`}
                  data-mark={mark ?? undefined}
                  data-disabled-reason={a11y.title}
                  title={a11y.title}
                  onClick={() => moves.clickCell(i)}
                  aria-label={a11y.ariaLabel}
                >
                  {cell !== null ? <TttMark player={cell} /> : null}
                </button>
              );
            })}
          </div>
          {winningCells ? (
            <WinLine
              cells={winningCells}
              cols={SIZE}
              rows={SIZE}
              className="ttt-win-line"
              testId="ttt-win-line"
            />
          ) : null}
        </div>
      }
    />
  );
}
