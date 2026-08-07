import type { BoardProps } from 'boardgame.io/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActionSurface } from '../../components/ActionSurface';
import { Deal, Flip } from '../../components/cinematic';
import { PlayTable } from '../../components/PlayTable';
import { StatusBar } from '../../components/StatusBar';
import { CardHand, DiscardPile, StockPile, SuitPicker } from '../../components/tabletop';
import { primitiveProfile } from '../../lib/cinematic';
import { deriveMatchStatus } from '../../lib/matchStatus';
import { readEffectiveMotion } from '../../lib/motion';
import type { Suit } from '../shared/cards';
import { canPlayMatching, topOf } from '../shared/cards';
import { getCrazyEightsActions } from './actions';
import { crazyEightsAssetResolver, isWildEightId } from './assets';
import { type CrazyEightsState, canDraw, matchContext, WILD_RANK } from './game';

const resolveAsset = crazyEightsAssetResolver();

const SUIT_LABEL: Record<Suit, string> = {
  clubs: 'Clubs',
  diamonds: 'Diamonds',
  hearts: 'Hearts',
  spades: 'Spades',
};

function handLengths(hands: readonly (readonly unknown[])[]): number[] {
  return hands.map((h) => h.length);
}

function anyHandGrew(prev: readonly number[], next: readonly number[]): boolean {
  return next.some((len, i) => len > (prev[i] ?? 0));
}

export function CrazyEightsBoard({ G, ctx, moves, playerID }: BoardProps<CrazyEightsState>) {
  const [selected, setSelected] = useState<number | null>(null);
  const [pickingSuit, setPickingSuit] = useState(false);
  /** Client-only deal/flip pulses; remount wrappers so motion never gates G. */
  const [dealPulse, setDealPulse] = useState(0);
  const [flipPulse, setFlipPulse] = useState(0);
  const [dealActive, setDealActive] = useState(false);
  const [flipActive, setFlipActive] = useState(false);
  const prevHandLensRef = useRef(handLengths(G.hands));
  const prevDiscardTopIdRef = useRef(topOf(G.discard)?.id);
  const prevStockLenRef = useRef(G.stock.length);

  const pid = playerID === null || playerID === undefined ? -1 : Number(playerID);
  const yourTurn = playerID !== null && ctx.currentPlayer === playerID && !ctx.gameover;
  const hand = pid >= 0 ? G.hands[pid] : [];
  const top = topOf(G.discard);
  const match = matchContext(G);
  const mayDraw = yourTurn && pid >= 0 && canDraw(G, pid);

  useEffect(() => {
    const nextLens = handLengths(G.hands);
    const nextTopId = topOf(G.discard)?.id;
    const drew =
      anyHandGrew(prevHandLensRef.current, nextLens) || G.stock.length < prevStockLenRef.current;
    const played = nextTopId !== undefined && nextTopId !== prevDiscardTopIdRef.current;

    if (drew) setDealPulse((n) => n + 1);
    if (played) setFlipPulse((n) => n + 1);

    prevHandLensRef.current = nextLens;
    prevDiscardTopIdRef.current = nextTopId;
    prevStockLenRef.current = G.stock.length;
  }, [G.stock.length, G.discard, G.hands]);

  // Settle end poses back to rest (primitives animate to a held transform).
  useEffect(() => {
    if (dealPulse === 0) return;
    setDealActive(true);
    const ms = primitiveProfile('deal', readEffectiveMotion()).durationMs;
    const t = window.setTimeout(() => setDealActive(false), ms);
    return () => window.clearTimeout(t);
  }, [dealPulse]);

  useEffect(() => {
    if (flipPulse === 0) return;
    setFlipActive(true);
    const ms = primitiveProfile('flip', readEffectiveMotion()).durationMs;
    const t = window.setTimeout(() => setFlipActive(false), ms);
    return () => window.clearTimeout(t);
  }, [flipPulse]);

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

  const { text: baseStatus, tone } = deriveMatchStatus(ctx, playerID, {
    isYourTurn: yourTurn,
    labels: {
      theirTurn: `Player ${Number(ctx.currentPlayer) + 1}'s turn`,
    },
  });
  let status = baseStatus;
  if (yourTurn && !ctx.gameover) {
    if (pickingSuit) status = 'Choose a suit for your eight';
    else if (selected != null) status = 'Play the selected card, or pick another';
    else if (G.drewThisTurn) status = 'Play a card or pass';
    else status = 'Your turn — play or draw';
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
          <Deal key={dealPulse} active={dealActive} className="ce-stock__cinematic">
            <StockPile
              count={G.stock.length}
              onDraw={yourTurn ? () => moves.drawCard() : undefined}
              disabled={!mayDraw}
              testId="ce-stock"
            />
          </Deal>
          <Flip key={flipPulse} active={flipActive} className="ce-discard__cinematic">
            <DiscardPile
              top={top}
              assetSrc={top ? resolveAsset(top) : null}
              wild={top ? isWildEightId(top.id) : false}
              suitLabel={SUIT_LABEL[G.currentSuit]}
              testId="ce-discard"
            />
          </Flip>
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
