import type { BoardProps } from 'boardgame.io/react';
import { useEffect, useRef, useState } from 'react';
import { ActionSurface } from '../../components/ActionSurface';
import { Flip } from '../../components/cinematic';
import { PlayTable } from '../../components/PlayTable';
import { StatusBar } from '../../components/StatusBar';
import { CardBack, CardFace } from '../../components/tabletop/CardFace';
import { primitiveProfile } from '../../lib/cinematic';
import { deriveMatchStatus } from '../../lib/matchStatus';
import { readEffectiveMotion } from '../../lib/motion';
import { type Card, kenneyPlayingCardAsset, makeCard, type Rank } from '../shared/cards';
import { getMemoryActions } from './actions';
import { GRID, type MemoryCard, type MemoryState, PAIR_COUNT } from './game';

const PAIR_RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8'];

export function pairFace(pairId: number): Card {
  const rank = PAIR_RANKS[pairId] ?? 'A';
  return makeCard(pairId < PAIR_COUNT / 2 ? 'hearts' : 'spades', rank);
}

type MemoryCellProps = {
  index: number;
  card: MemoryCard;
  can: boolean;
  onFlip: () => void;
};

/** Client-only Flip pulse; remounts so motion never gates G or taps. */
function MemoryCell({ index, card, can, onFlip }: MemoryCellProps) {
  const [flipPulse, setFlipPulse] = useState(0);
  const [flipActive, setFlipActive] = useState(false);
  const prevFaceUpRef = useRef(card.faceUp);

  useEffect(() => {
    if (card.faceUp === prevFaceUpRef.current) return;
    prevFaceUpRef.current = card.faceUp;
    setFlipPulse((n) => n + 1);
  }, [card.faceUp]);

  useEffect(() => {
    if (flipPulse === 0) return;
    setFlipActive(true);
    const ms = primitiveProfile('flip', readEffectiveMotion()).durationMs;
    const t = window.setTimeout(() => setFlipActive(false), ms);
    return () => window.clearTimeout(t);
  }, [flipPulse]);

  const face = pairFace(card.pairId);

  return (
    <div
      className={`memory-cell${can ? ' is-open' : ''}${card.faceUp ? ' is-up' : ''}`}
      role="gridcell"
      data-testid={`memory-cell-${index}`}
    >
      <Flip key={flipPulse} active={flipActive} className="memory-cell__cinematic">
        {card.faceUp ? (
          <CardFace card={face} assetSrc={kenneyPlayingCardAsset(face)} />
        ) : (
          <CardBack
            onClick={can ? onFlip : undefined}
            disabled={!can}
            label={`Face-down card ${index + 1}`}
          />
        )}
      </Flip>
    </div>
  );
}

export function MemoryBoard({ G, ctx, moves, playerID, isActive }: BoardProps<MemoryState>) {
  const yourTurn = Boolean(isActive && !ctx.gameover);
  const { text: status, tone } = deriveMatchStatus(ctx, playerID, {
    isYourTurn: yourTurn,
    labels: { yourTurn: 'Your turn - flip a card' },
  });
  const scoreLine = `P1 ${G.scores[0]} - P2 ${G.scores[1]}`;

  const pewActions = getMemoryActions({ G, yourTurn });
  const surfaceActions = pewActions.map((action) => ({
    ...action,
    onAction: () => {
      const match = /^flip-(\d+)$/.exec(action.id);
      if (match) moves.flip(Number(match[1]));
    },
  }));

  return (
    <PlayTable
      info={
        <>
          <StatusBar text={status} tone={tone} />
          <div className="memory-scores">{scoreLine}</div>
        </>
      }
      board={
        <div
          className="memory-board"
          role="grid"
          aria-label="Memory board"
          data-testid="memory-board"
          style={{ gridTemplateColumns: `repeat(${GRID}, minmax(0, 1fr))` }}
        >
          {G.cards.map((card, i) => {
            const can = yourTurn && !card.faceUp;
            return (
              <MemoryCell key={i} index={i} card={card} can={can} onFlip={() => moves.flip(i)} />
            );
          })}
        </div>
      }
      actions={<ActionSurface label="Memory actions" actions={surfaceActions} />}
    />
  );
}
