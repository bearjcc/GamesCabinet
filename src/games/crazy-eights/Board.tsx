import type { BoardProps } from 'boardgame.io/react';
import { useMemo, useState } from 'react';
import { ActionSurface } from '../../components/ActionSurface';
import { PlayTable } from '../../components/PlayTable';
import { StatusBar } from '../../components/StatusBar';
import { CardHand, DiscardPile, StockPile, SuitPicker } from '../../components/tabletop';
import type { Suit } from '../shared/cards';
import { canPlayMatching, topOf } from '../shared/cards';
import { canDrawCard, getCrazyEightsActions } from './actions';
import { crazyEightsAssetResolver, isWildEightId } from './assets';
import { type CrazyEightsState, matchContext, WILD_RANK } from './game';

const resolveAsset = crazyEightsAssetResolver();

const SUIT_LABEL: Record<Suit, string> = {
  clubs: 'Clubs',
  diamonds: 'Diamonds',
  hearts: 'Hearts',
  spades: 'Spades',
};

export function CrazyEightsBoard({ G, ctx, moves, playerID }: BoardProps<CrazyEightsState>) {
  const [selected, setSelected] = useState<number | null>(null);
  const [pickingSuit, setPickingSuit] = useState(false);

  const pid = playerID === null || playerID === undefined ? -1 : Number(playerID);
  const yourTurn = playerID !== null && ctx.currentPlayer === playerID && !ctx.gameover;
  const hand = pid >= 0 ? G.hands[pid] : [];
  const top = topOf(G.discard);
  const match = matchContext(G);
  const canDraw = yourTurn && pid >= 0 && canDrawCard(G, pid);

  const playableIndexes = useMemo(() => {
    if (!yourTurn || !match) return new Set<number>();
    const set = new Set<number>();
    hand.forEach((card, i) => {
      if (canPlayMatching(card, match, { wildRanks: [WILD_RANK] })) set.add(i);
    });
    return set;
  }, [hand, match, yourTurn]);

  const pewActions = getCrazyEightsActions({ G, yourTurn });
  const surfaceActions = pewActions.map((action) => ({
    ...action,
    onAction: () => {
      if (action.id === 'pass') moves.pass();
    },
  }));

  let status = 'Waiting…';
  let tone: 'neutral' | 'you' | 'wait' | 'done' = 'wait';
  if (ctx.gameover) {
    tone = 'done';
    status = ctx.gameover.winner === playerID ? 'You win' : 'Opponent wins';
  } else if (yourTurn) {
    tone = 'you';
    if (pickingSuit) status = 'Choose a suit for your eight';
    else if (selected != null) status = 'Play the selected card, or pick another';
    else if (G.drewThisTurn) status = 'Play a card or pass';
    else status = 'Your turn — play or draw';
  } else {
    status = `Player ${Number(ctx.currentPlayer) + 1}'s turn`;
  }

  function tryPlay(index: number) {
    if (!yourTurn) return;
    const card = hand[index];
    if (!card || !match) return;
    if (!canPlayMatching(card, match, { wildRanks: [WILD_RANK] })) {
      setSelected(index);
      return;
    }
    if (card.rank === WILD_RANK) {
      setSelected(index);
      setPickingSuit(true);
      return;
    }
    moves.playCard(index);
    setSelected(null);
    setPickingSuit(false);
  }

  function confirmSuit(suit: Suit) {
    if (selected == null) return;
    moves.playCard(selected, suit);
    setSelected(null);
    setPickingSuit(false);
  }

  return (
    <PlayTable
      info={
        <>
          <StatusBar text={status} tone={tone} />
          <div className="play-table__meta" data-testid="ce-meta">
            <span>Stock: {G.stock.length}</span>
            {G.hands.map((h, i) =>
              i === pid ? null : (
                <span key={i}>
                  P{i + 1}: {h.length}
                </span>
              ),
            )}
          </div>
        </>
      }
      board={
        <div className="ce-table" data-testid="ce-board">
          <StockPile
            count={G.stock.length}
            onDraw={yourTurn ? () => moves.drawCard() : undefined}
            disabled={!canDraw}
            testId="ce-stock"
          />
          <DiscardPile
            top={top}
            assetSrc={top ? resolveAsset(top) : null}
            wild={top ? isWildEightId(top.id) : false}
            suitLabel={SUIT_LABEL[G.currentSuit]}
            testId="ce-discard"
          />
          {pickingSuit ? (
            <SuitPicker
              testIdPrefix="ce-suit"
              onPick={confirmSuit}
              onCancel={() => {
                setPickingSuit(false);
                setSelected(null);
              }}
            />
          ) : null}
        </div>
      }
      pew={
        <CardHand
          cards={hand}
          selectedIndex={selected}
          disabled={!yourTurn}
          isPlayable={(_, i) => playableIndexes.has(i)}
          isWild={(card) => isWildEightId(card.id)}
          assetFor={resolveAsset}
          onSelect={tryPlay}
          testIdPrefix="ce-hand"
        />
      }
      actions={<ActionSurface label="Crazy Eights actions" actions={surfaceActions} />}
    />
  );
}
