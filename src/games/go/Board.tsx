import type { BoardProps } from 'boardgame.io/react';
import { ActionSurface } from '../../components/ActionSurface';
import { MatchGameShell } from '../../components/game-shell';
import { Token } from '../../components/tabletop';
import { boardFirstChromeActions } from '../../lib/actions';
import { useMatchStatus } from '../../lib/useMatchStatus';
import { getGoActions } from './actions';
import { type GoState, legalPlaces, SIZE } from './game';

export function GoBoard({ G, ctx, moves, playerID, isActive }: BoardProps<GoState>) {
  const yourTurn = Boolean(isActive && !ctx.gameover);
  const player = playerID ?? ctx.currentPlayer;
  const places = yourTurn ? legalPlaces(G, ctx.currentPlayer) : [];
  const placeSet = new Set(places);

  const black = G.cells.filter((c) => c === '0').length + G.captures[0];
  const white = G.cells.filter((c) => c === '1').length + G.captures[1];
  const { text: status, tone } = useMatchStatus(ctx, playerID, {
    isYourTurn: yourTurn,
    nameForPlayer: (id) => (id === '0' ? 'Black' : 'White'),
    turnHint: yourTurn ? `captures ${black}–${white}` : undefined,
  });

  const chromeActions = boardFirstChromeActions(getGoActions({ G, player, yourTurn })).map(
    (action) => ({
      ...action,
      onAction: () => {
        if (action.id === 'pass') moves.pass();
      },
    }),
  );

  const actionTray =
    chromeActions.length > 0 ? <ActionSurface label="Go actions" actions={chromeActions} /> : null;

  return (
    <MatchGameShell
      gameTitle="Go"
      ctx={ctx}
      status={{ text: status, tone }}
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
                {cell !== null ? <Token player={cell} variant="disc" size="md" /> : null}
              </button>
            );
          })}
        </div>
      }
      tray={actionTray ? { testId: 'go-tray' } : null}
      trayContent={actionTray}
    />
  );
}
