import type { BoardProps } from 'boardgame.io/react';
import { useEffect } from 'react';
import { MatchScoreboard } from '../../components/MatchScoreboard';
import { PlayTable } from '../../components/PlayTable';
import { StatusBar } from '../../components/StatusBar';
import { CardBack, CardFace } from '../../components/tabletop/CardFace';
import { deriveMatchStatus } from '../../lib/matchStatus';
import { type Card, kenneyPlayingCardAsset, makeCard, type Rank } from '../shared/cards';
import { GRID, type MemoryCard, type MemoryState, PAIR_COUNT } from './game';

const PAIR_RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8'];

export function pairFace(pairId: number): Card {
  const rank = PAIR_RANKS[pairId] ?? 'A';
  return makeCard(pairId < PAIR_COUNT / 2 ? 'hearts' : 'spades', rank);
}

const PRELOAD_ASSETS = Array.from({ length: PAIR_COUNT }, (_, pairId) =>
  kenneyPlayingCardAsset(pairFace(pairId)),
);

type MemoryCellProps = {
  index: number;
  card: MemoryCard;
  can: boolean;
  onFlip: () => void;
};

function MemoryCell({ index, card, can, onFlip }: MemoryCellProps) {
  const face = pairFace(card.pairId);
  const assetSrc = kenneyPlayingCardAsset(face);

  return (
    <button
      type="button"
      className={`memory-cell${can ? ' is-open' : ''}${card.faceUp ? ' is-up' : ''}`}
      disabled={!can}
      data-testid={`memory-cell-${index}`}
      aria-label={card.faceUp ? `Matched ${face.rank}` : `Face-down card ${index + 1}`}
      onClick={can ? onFlip : undefined}
    >
      <div className="memory-card">
        <div className="memory-card__inner">
          <div className="memory-card__back">
            <CardBack label={`Face-down card ${index + 1}`} />
          </div>
          <div className="memory-card__face">
            <CardFace card={face} assetSrc={assetSrc} />
          </div>
        </div>
      </div>
    </button>
  );
}

export function MemoryBoard({ G, ctx, moves, playerID, isActive }: BoardProps<MemoryState>) {
  const solo = ctx.numPlayers === 1;
  const yourTurn = Boolean(isActive && !ctx.gameover);

  useEffect(() => {
    for (const src of PRELOAD_ASSETS) {
      const img = new Image();
      img.src = src;
    }
  }, []);

  const { text: status, tone } = deriveMatchStatus(ctx, playerID, {
    isYourTurn: yourTurn,
    labels: {
      yourTurn: solo ? 'Flip a card' : 'Your turn — flip a card',
    },
  });

  const scores = solo
    ? [{ label: 'Pairs', value: G.scores[0] }]
    : [
        { label: 'P1', value: G.scores[0] },
        { label: 'P2', value: G.scores[1] },
      ];

  return (
    <PlayTable
      info={
        <>
          <StatusBar text={status} tone={tone} />
          <MatchScoreboard scores={scores} testId="memory-scores" />
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
    />
  );
}
