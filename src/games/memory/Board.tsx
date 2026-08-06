import type { BoardProps } from 'boardgame.io/react';
import { ActionSurface } from '../../components/ActionSurface';
import { PlayTable } from '../../components/PlayTable';
import { StatusBar } from '../../components/StatusBar';
import { CardBack, CardFace } from '../../components/tabletop/CardFace';
import { deriveMatchStatus } from '../../lib/matchStatus';
import { type Card, kenneyPlayingCardAsset, makeCard, type Rank } from '../shared/cards';
import { getMemoryActions } from './actions';
import { GRID, type MemoryState, PAIR_COUNT } from './game';

const PAIR_RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8'];

export function pairFace(pairId: number): Card {
  const rank = PAIR_RANKS[pairId] ?? 'A';
  return makeCard(pairId < PAIR_COUNT / 2 ? 'hearts' : 'spades', rank);
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
            const face = pairFace(card.pairId);
            return (
              <div
                key={i}
                className={`memory-cell${can ? ' is-open' : ''}${card.faceUp ? ' is-up' : ''}`}
                role="gridcell"
                data-testid={`memory-cell-${i}`}
              >
                {card.faceUp ? (
                  <CardFace card={face} assetSrc={kenneyPlayingCardAsset(face)} />
                ) : (
                  <CardBack
                    onClick={can ? () => moves.flip(i) : undefined}
                    disabled={!can}
                    label={`Face-down card ${i + 1}`}
                  />
                )}
              </div>
            );
          })}
        </div>
      }
      actions={<ActionSurface label="Memory actions" actions={surfaceActions} />}
    />
  );
}
