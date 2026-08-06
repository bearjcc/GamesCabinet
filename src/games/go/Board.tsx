import type { BoardProps } from 'boardgame.io/react';
import { PlayTable } from '../../components/PlayTable';
import { StatusBar } from '../../components/StatusBar';
import { deriveMatchStatus } from '../../lib/matchStatus';
import { type GoState, legalPlaces, SIZE } from './game';

export function GoBoard({ G, ctx, moves, playerID, isActive }: BoardProps<GoState>) {
  const yourTurn = Boolean(isActive && !ctx.gameover);
  const places = yourTurn ? legalPlaces(G, ctx.currentPlayer) : [];
  const placeSet = new Set(places);

  const black = G.cells.filter((c) => c === '0').length + G.captures[0];
  const white = G.cells.filter((c) => c === '1').length + G.captures[1];
  const { text: status, tone } = deriveMatchStatus(ctx, playerID, {
    isYourTurn: yourTurn,
    labels: {
      yourTurn: `Your turn (${black}-${white})`,
    },
  });

  return (
    <PlayTable
      info={<StatusBar text={status} tone={tone} />}
      board={
        <div className="go-board" role="grid" aria-label="Go board" data-testid="go-board">
          {G.cells.map((cell, i) => {
            const can = yourTurn && placeSet.has(i);
            const row = Math.floor(i / SIZE);
            const col = i % SIZE;
            const file = String.fromCharCode(97 + col);
            const rank = SIZE - row;
            return (
              <button
                key={i}
                type="button"
                className={`go-cell${can ? ' is-open' : ''}${cell ? ` p${cell}` : ''}`}
                disabled={!can}
                data-testid={`go-cell-${i}`}
                onClick={() => moves.place(i)}
                aria-label={
                  cell === null
                    ? can
                      ? `Place at ${file}${rank}`
                      : `Empty ${file}${rank}`
                    : `${cell === '0' ? 'Black' : 'White'} stone at ${file}${rank}`
                }
              >
                {cell !== null ? <span className="go-stone" aria-hidden /> : null}
              </button>
            );
          })}
        </div>
      }
      actions={
        <button
          type="button"
          className="btn"
          data-testid="go-pass"
          disabled={!yourTurn}
          onClick={() => moves.pass()}
        >
          Pass
        </button>
      }
    />
  );
}
