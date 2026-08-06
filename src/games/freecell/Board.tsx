import type { BoardProps } from 'boardgame.io/react';
import { useMemo, useState } from 'react';
import { ActionSurface } from '../../components/ActionSurface';
import { LeaderboardPanel } from '../../components/LeaderboardPanel';
import { PlayTable } from '../../components/PlayTable';
import { ScoreSubmitter } from '../../components/ScoreSubmitter';
import { SoloPlayTabs } from '../../components/SoloPlayTabs';
import { StatusBar } from '../../components/StatusBar';
import { CardFace } from '../../components/tabletop/CardFace';
import type { SubmitScoreInput } from '../../lib/scores';
import { type Card, kenneyPlayingCardAsset } from '../shared/cards';
import { type FreeCellSelection, getFreeCellActions } from './actions';
import type { FreeCellState } from './game';

type Selection = FreeCellSelection | null;

function topCard(pile: readonly Card[]): Card | undefined {
  return pile[pile.length - 1];
}

export function FreeCellBoard({ G, ctx, moves, isActive }: BoardProps<FreeCellState>) {
  const playable = Boolean(isActive && !ctx.gameover);
  const [selection, setSelection] = useState<Selection>(null);
  const [tab, setTab] = useState<'play' | 'scores'>('play');

  const pendingSubmit = useMemo((): SubmitScoreInput | null => {
    if (!ctx.gameover) return null;
    const over = ctx.gameover as { won: boolean; score: number };
    return { score: over.score, meta: { won: over.won } };
  }, [ctx.gameover]);

  const over = ctx.gameover as { won?: boolean; score?: number } | undefined;
  let status = 'Select a card, then a destination';
  let tone: 'neutral' | 'you' | 'wait' | 'done' = 'you';
  if (over?.won) {
    status = 'You win';
    tone = 'done';
  } else if (!playable) {
    tone = 'wait';
  }

  const clear = () => setSelection(null);

  const pewActions = getFreeCellActions({ G, playable, selection });
  const surfaceActions = pewActions.map((action) => ({
    ...action,
    onAction: () => {
      if (action.id === 'clear') {
        clear();
        return;
      }
      if (!selection) return;
      if (action.id === 'to-foundation') {
        if (selection.source === 'cascade' && selection.count === 1) {
          moves.cascadeToFoundation(selection.col);
          clear();
          return;
        }
        if (selection.source === 'freecell') {
          moves.freecellToFoundation(selection.index);
          clear();
        }
        return;
      }
      const freecellMatch = /^to-freecell-(\d+)$/.exec(action.id);
      if (freecellMatch && selection.source === 'cascade' && selection.count === 1) {
        moves.cascadeToFreecell(selection.col, Number(freecellMatch[1]));
        clear();
      }
    },
  }));

  const onFreecell = (index: number) => {
    if (!playable) return;
    const parked = G.freecells[index];

    if (selection?.source === 'freecell' && selection.index === index) {
      clear();
      return;
    }

    if (selection?.source === 'cascade' && selection.count === 1) {
      moves.cascadeToFreecell(selection.col, index);
      clear();
      return;
    }

    if (!parked) return;
    setSelection({ source: 'freecell', index });
  };

  const onFoundation = (_index: number) => {
    if (!playable || !selection) return;
    if (selection.source === 'cascade' && selection.count === 1) {
      moves.cascadeToFoundation(selection.col);
      clear();
      return;
    }
    if (selection.source === 'freecell') {
      moves.freecellToFoundation(selection.index);
      clear();
    }
  };

  const onCascadeCard = (col: number, index: number) => {
    if (!playable) return;

    if (
      selection?.source === 'cascade' &&
      selection.col === col &&
      selection.startIndex === index
    ) {
      clear();
      return;
    }

    if (selection?.source === 'freecell') {
      moves.freecellToCascade(selection.index, col);
      clear();
      return;
    }

    if (selection?.source === 'cascade' && selection.col !== col) {
      moves.cascadeToCascade(selection.col, col, selection.count);
      clear();
      return;
    }

    const count = G.cascades[col].length - index;
    setSelection({ source: 'cascade', col, startIndex: index, count });
  };

  const onCascadeEmpty = (col: number) => {
    if (!playable || !selection) return;
    if (selection.source === 'freecell') {
      moves.freecellToCascade(selection.index, col);
      clear();
      return;
    }
    if (selection.source === 'cascade' && selection.col !== col) {
      moves.cascadeToCascade(selection.col, col, selection.count);
      clear();
    }
  };

  return (
    <>
      <ScoreSubmitter gameId="freecell" pendingSubmit={pendingSubmit} />
      <PlayTable
        info={
          <>
            <StatusBar text={status} tone={tone} />
            <SoloPlayTabs value={tab} onChange={setTab} testIdPrefix="freecell" />
          </>
        }
        board={
          tab === 'scores' ? (
            <LeaderboardPanel gameId="freecell" testIdPrefix="freecell" />
          ) : (
            <div className="freecell-board" data-testid="freecell-board">
              <div className="freecell-top">
                <div className="freecell-freecells" data-testid="freecell-freecells">
                  {G.freecells.map((card, i) => (
                    <button
                      key={i}
                      type="button"
                      className="freecell-slot"
                      data-testid={`freecell-freecell-${i}`}
                      disabled={!playable}
                      onClick={() => onFreecell(i)}
                      aria-label={`Freecell ${i + 1}${card ? `, ${card.rank} of ${card.suit}` : ', empty'}`}
                    >
                      {card ? (
                        <CardFace
                          card={card}
                          assetSrc={kenneyPlayingCardAsset(card)}
                          selected={selection?.source === 'freecell' && selection.index === i}
                          playable={playable}
                          testId={`freecell-freecell-${i}-card`}
                        />
                      ) : (
                        <div
                          className="tt-card tt-card--empty"
                          data-testid={`freecell-freecell-${i}-empty`}
                        >
                          Free
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                <div className="freecell-foundations" data-testid="freecell-foundations">
                  {G.foundations.map((pile, i) => {
                    const top = topCard(pile);
                    return (
                      <button
                        key={i}
                        type="button"
                        className="freecell-foundation"
                        data-testid={`freecell-foundation-${i}`}
                        disabled={!playable || !selection}
                        onClick={() => onFoundation(i)}
                        aria-label={`Foundation ${i + 1}${top ? `, ${top.rank} of ${top.suit}` : ', empty'}`}
                      >
                        {top ? (
                          <CardFace
                            card={top}
                            assetSrc={kenneyPlayingCardAsset(top)}
                            testId={`freecell-foundation-${i}-top`}
                          />
                        ) : (
                          <div
                            className="tt-card tt-card--empty"
                            data-testid={`freecell-foundation-${i}-empty`}
                          >
                            A
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="freecell-cascades" data-testid="freecell-cascades">
                {G.cascades.map((column, col) => (
                  <div
                    key={col}
                    className="freecell-column"
                    data-testid={`freecell-cascade-${col}`}
                  >
                    {column.length === 0 ? (
                      <button
                        type="button"
                        className="tt-card tt-card--empty freecell-column__empty"
                        data-testid={`freecell-cascade-${col}-empty`}
                        disabled={!playable || !selection}
                        onClick={() => onCascadeEmpty(col)}
                        aria-label={`Empty cascade ${col + 1}`}
                      >
                        Any
                      </button>
                    ) : (
                      column.map((card, index) => {
                        const selected =
                          selection?.source === 'cascade' &&
                          selection.col === col &&
                          index >= selection.startIndex;
                        return (
                          <div
                            key={card.id}
                            className="freecell-slot-card"
                            style={{ top: `${index * 1.35}rem` }}
                          >
                            <CardFace
                              card={card}
                              assetSrc={kenneyPlayingCardAsset(card)}
                              selected={selected}
                              playable={playable}
                              onSelect={playable ? () => onCascadeCard(col, index) : undefined}
                              testId={`freecell-cascade-${col}-card-${index}`}
                            />
                          </div>
                        );
                      })
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        }
        actions={
          tab === 'play' ? (
            <ActionSurface label="FreeCell actions" actions={surfaceActions} />
          ) : null
        }
      />
    </>
  );
}
