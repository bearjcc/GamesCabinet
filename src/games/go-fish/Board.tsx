import type { BoardProps } from 'boardgame.io/react';
import { MatchGameShell, Scoreboard } from '../../components/game-shell';
import { CardHand, StockPile } from '../../components/tabletop';
import { useMatchStatus } from '../../lib/useMatchStatus';
import { kenneyPlayingCardAsset } from '../shared/cards';
import { canAsk, canDraw, type GoFishState, opponentOf } from './game';

export function GoFishBoard({ G, ctx, moves, playerID, isActive }: BoardProps<GoFishState>) {
  const pid = playerID === null || playerID === undefined ? -1 : Number(playerID);
  const yourTurn = Boolean(isActive && !ctx.gameover);
  const hand = pid >= 0 ? G.hands[pid] : [];
  const opp = pid >= 0 ? opponentOf(pid) : -1;
  const oppHandCount = opp >= 0 ? G.hands[opp].length : 0;
  const mayDraw = yourTurn && pid >= 0 && canDraw(G, pid);

  let turnHint: string | undefined;
  if (yourTurn) {
    if (G.pendingFishRank != null) turnHint = 'go fish — draw from the stock';
    else if (hand.length === 0 && G.stock.length > 0) turnHint = 'draw a card';
    else turnHint = 'ask for a rank';
  }

  const { text: status, tone } = useMatchStatus(ctx, playerID, {
    isYourTurn: yourTurn,
    turnHint,
  });

  const onCardSelect = (index: number) => {
    if (!yourTurn || pid < 0 || G.pendingFishRank != null) return;
    const card = hand[index];
    if (!card || !canAsk(G, pid, card.rank)) return;
    moves.ask(card.rank);
  };

  return (
    <MatchGameShell
      gameTitle="Go Fish"
      ctx={ctx}
      status={{ text: status, tone }}
      stage={{ felt: 'green' }}
      railMeta={
        <Scoreboard
          model={{
            testId: 'go-fish-meta',
            rows: [
              { label: 'Books', value: pid >= 0 ? G.books[pid] : '-' },
              { label: 'Opp', value: pid >= 0 ? G.books[opponentOf(pid)] : '-' },
              { label: 'Stock', value: G.stock.length },
              ...(opp >= 0 ? [{ label: 'Opp hand', value: oppHandCount }] : []),
              ...(G.pendingFishRank != null
                ? [{ label: 'Fishing', value: G.pendingFishRank }]
                : []),
            ],
          }}
        />
      }
      rules={{
        testId: 'go-fish-meta-rules',
        body: (
          <>
            <p>Collect four-of-a-kind books by asking opponents for ranks you hold.</p>
            <p>
              When the stock runs out, the most books wins. Book counts above are sets completed.
            </p>
          </>
        ),
      }}
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
      tray={{ testId: 'go-fish-tray', title: 'Your hand' }}
      trayContent={
        <CardHand
          cards={hand}
          disabled={!yourTurn || G.pendingFishRank != null}
          isPlayable={(_, i) => {
            const card = hand[i];
            return Boolean(card && yourTurn && pid >= 0 && canAsk(G, pid, card.rank));
          }}
          onSelect={onCardSelect}
          assetFor={kenneyPlayingCardAsset}
          testIdPrefix="go-fish-hand"
        />
      }
    />
  );
}
