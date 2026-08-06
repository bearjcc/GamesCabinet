import type { BoardProps } from 'boardgame.io/react';
import { useEffect } from 'react';
import { ActionSurface } from '../../components/ActionSurface';
import { PlayTable } from '../../components/PlayTable';
import { StatusBar } from '../../components/StatusBar';
import { Token } from '../../components/tabletop';
import { deriveMatchStatus } from '../../lib/matchStatus';
import { getReversiActions } from './actions';
import type { ReversiState } from './game';
import { legalPlaces, SIZE } from './game';

export function ReversiBoard({ G, ctx, moves, playerID, isActive }: BoardProps<ReversiState>) {
  const yourTurn = Boolean(isActive && !ctx.gameover);
  const player = playerID ?? ctx.currentPlayer;
  const places = yourTurn ? legalPlaces(G, ctx.currentPlayer) : [];
  const placeSet = new Set(places);

  useEffect(() => {
    if (!yourTurn || ctx.gameover) return;
    if (places.length === 0) moves.pass();
  }, [yourTurn, ctx.gameover, places.length, moves]);

  const dark = G.cells.filter((c) => c === '0').length;
  const light = G.cells.filter((c) => c === '1').length;
  const { text: status, tone } = deriveMatchStatus(ctx, playerID, {
    isYourTurn: yourTurn,
    labels: {
      yourTurn:
        places.length === 0 ? 'No moves - passing' : `Your turn - place a disc (${dark}-${light})`,
    },
  });

  const pewActions = getReversiActions({ G, player, yourTurn });
  const surfaceActions = pewActions.map((action) => ({
    ...action,
    onAction: () => {
      if (action.id === 'pass') {
        moves.pass();
        return;
      }
      const match = /^place-(\d+)$/.exec(action.id);
      if (match) moves.place(Number(match[1]));
    },
  }));

  return (
    <PlayTable
      info={<StatusBar text={status} tone={tone} />}
      board={
        <div
          className="reversi-board"
          role="grid"
          aria-label="Reversi board"
          data-testid="reversi-board"
        >
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
                className={`reversi-cell${can ? ' is-open' : ''}`}
                disabled={!can}
                data-testid={`reversi-cell-${i}`}
                onClick={() => moves.place(i)}
                aria-label={
                  cell === null
                    ? can
                      ? `Place at ${file}${rank}`
                      : `Empty ${file}${rank}`
                    : `${cell === '0' ? 'Dark' : 'Light'} disc at ${file}${rank}`
                }
              >
                {cell !== null ? <Token player={cell} variant="disc" size="md" /> : null}
              </button>
            );
          })}
        </div>
      }
      actions={<ActionSurface label="Reversi actions" actions={surfaceActions} />}
    />
  );
}
