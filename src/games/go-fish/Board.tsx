import type { BoardProps } from 'boardgame.io/react';
import { ActionSurface } from '../../components/ActionSurface';
import { PlayTable } from '../../components/PlayTable';
import { StatusBar } from '../../components/StatusBar';
import { CardHand, StockPile } from '../../components/tabletop';
import { deriveMatchStatus } from '../../lib/matchStatus';
import { kenneyPlayingCardAsset, type Rank } from '../shared/cards';
import { getGoFishActions } from './actions';
import { canDraw, type GoFishState, opponentOf } from './game';

export function GoFishBoard({ G, ctx, moves, playerID, isActive }: BoardProps<GoFishState>) {
  const pid = playerID === null || playerID === undefined ? -1 : Number(playerID);
  const yourTurn = Boolean(isActive && !ctx.gameover);
  const hand = pid >= 0 ? G.hands[pid] : [];
  const opp = pid >= 0 ? opponentOf(pid) : -1;
  const oppHandCount = opp >= 0 ? G.hands[opp].length : 0;
  const mayDraw = yourTurn && pid >= 0 && canDraw(G, pid);

  let yourTurnLabel = 'Your turn - ask for a rank';
  if (G.pendingFishRank != null) yourTurnLabel = 'Go fish - draw from the stock';
  else if (hand.length === 0 && G.stock.length > 0) yourTurnLabel = 'Your turn - draw a card';

  const { text: status, tone } = deriveMatchStatus(ctx, playerID, {
    isYourTurn: yourTurn,
    labels: { yourTurn: yourTurnLabel },
  });

  const pewActions = getGoFishActions({ G, player: pid, yourTurn });
  const surfaceActions = pewActions.map((action) => ({
    ...action,
    onAction: () => {
      if (action.id === 'draw') {
        moves.draw();
        return;
      }
      if (action.id.startsWith('ask-')) {
        const rank = action.id.slice('ask-'.length) as Rank;
        moves.ask(rank);
      }
    },
  }));

  const booksLine =
    pid >= 0
      ? `Books ${G.books[pid]} - Opp ${G.books[opponentOf(pid)]}`
      : `Books P1 ${G.books[0]} - P2 ${G.books[1]}`;

  return (
    <PlayTable
      info={
        <>
          <StatusBar text={status} tone={tone} />
          <div className="play-table__meta" data-testid="go-fish-meta">
            <span>{booksLine}</span>
            <span>Stock: {G.stock.length}</span>
            {opp >= 0 ? <span>Opp hand: {oppHandCount}</span> : null}
            {G.pendingFishRank != null ? <span>Fishing: {G.pendingFishRank}</span> : null}
          </div>
        </>
      }
      board={
        <div className="go-fish-table" data-testid="go-fish-board">
          <StockPile
            count={G.stock.length}
            onDraw={yourTurn ? () => moves.draw() : undefined}
            disabled={!mayDraw}
            testId="go-fish-stock"
          />
          <div className="go-fish-books" data-testid="go-fish-books">
            <p>
              Your books: <strong>{pid >= 0 ? G.books[pid] : '-'}</strong>
            </p>
            <p>
              Opponent books: <strong>{pid >= 0 ? G.books[opponentOf(pid)] : '-'}</strong>
            </p>
          </div>
        </div>
      }
      pew={
        <CardHand
          cards={hand}
          disabled
          assetFor={kenneyPlayingCardAsset}
          testIdPrefix="go-fish-hand"
        />
      }
      actions={<ActionSurface label="Go Fish actions" actions={surfaceActions} />}
    />
  );
}
