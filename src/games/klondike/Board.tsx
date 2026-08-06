import type { BoardProps } from 'boardgame.io/react';
import { useMemo, useState } from 'react';
import { LeaderboardPanel } from '../../components/LeaderboardPanel';
import { PlayTable } from '../../components/PlayTable';
import { ScoreSubmitter } from '../../components/ScoreSubmitter';
import { SoloPlayTabs } from '../../components/SoloPlayTabs';
import { StatusBar } from '../../components/StatusBar';
import { CardBack, CardFace } from '../../components/tabletop/CardFace';
import { StockPile } from '../../components/tabletop/CardPile';
import type { SubmitScoreInput } from '../../lib/scores';
import { kenneyPlayingCardAsset } from '../shared/cards';
import type { KlondikeState, TableCard } from './game';

type Selection =
  | null
  | { source: 'waste' }
  | { source: 'tableau'; col: number; startIndex: number; count: number };

function topCard(pile: readonly TableCard[]): TableCard | undefined {
  return pile[pile.length - 1];
}

export function KlondikeBoard({ G, ctx, moves, isActive }: BoardProps<KlondikeState>) {
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

  const onStock = () => {
    if (!playable) return;
    clear();
    moves.draw();
  };

  const onWaste = () => {
    if (!playable) return;
    const top = topCard(G.waste);
    if (!top) return;
    if (selection?.source === 'waste') {
      clear();
      return;
    }
    setSelection({ source: 'waste' });
  };

  const onFoundation = (_index: number) => {
    if (!playable || !selection) return;
    if (selection.source === 'waste') {
      moves.wasteToFoundation();
      clear();
      return;
    }
    if (selection.source === 'tableau' && selection.count === 1) {
      moves.tableauToFoundation(selection.col);
      clear();
    }
  };

  const onTableauCard = (col: number, index: number) => {
    if (!playable) return;
    const card = G.tableau[col][index];
    if (!card?.faceUp) return;

    if (
      selection?.source === 'tableau' &&
      selection.col === col &&
      selection.startIndex === index
    ) {
      clear();
      return;
    }

    if (selection?.source === 'waste') {
      moves.wasteToTableau(col);
      clear();
      return;
    }

    if (selection?.source === 'tableau' && selection.col !== col) {
      moves.tableauToTableau(selection.col, col, selection.count);
      clear();
      return;
    }

    const count = G.tableau[col].length - index;
    setSelection({ source: 'tableau', col, startIndex: index, count });
  };

  const onTableauEmpty = (col: number) => {
    if (!playable || !selection) return;
    if (selection.source === 'waste') {
      moves.wasteToTableau(col);
      clear();
      return;
    }
    if (selection.source === 'tableau' && selection.col !== col) {
      moves.tableauToTableau(selection.col, col, selection.count);
      clear();
    }
  };

  const wasteSelected = selection?.source === 'waste';
  const wasteTop = topCard(G.waste);

  return (
    <>
      <ScoreSubmitter gameId="klondike" pendingSubmit={pendingSubmit} />
      <PlayTable
        info={
          <>
            <StatusBar text={status} tone={tone} />
            <SoloPlayTabs value={tab} onChange={setTab} testIdPrefix="klondike" />
          </>
        }
        board={
          tab === 'scores' ? (
            <LeaderboardPanel gameId="klondike" testIdPrefix="klondike" />
          ) : (
            <div className="klondike-board" data-testid="klondike-board">
              <div className="klondike-top">
                <StockPile
                  count={G.stock.length}
                  onDraw={playable ? onStock : undefined}
                  disabled={!playable || (G.stock.length === 0 && G.waste.length === 0)}
                  testId="klondike-stock"
                />
                <div className="klondike-waste" data-testid="klondike-waste">
                  {wasteTop ? (
                    <CardFace
                      card={wasteTop}
                      assetSrc={kenneyPlayingCardAsset(wasteTop)}
                      selected={wasteSelected}
                      playable={playable}
                      onSelect={playable ? onWaste : undefined}
                      testId="klondike-waste-top"
                    />
                  ) : (
                    <div className="tt-card tt-card--empty" data-testid="klondike-waste-empty">
                      Waste
                    </div>
                  )}
                </div>
                <div className="klondike-foundations" data-testid="klondike-foundations">
                  {G.foundations.map((pile, i) => {
                    const top = topCard(pile);
                    return (
                      <button
                        key={i}
                        type="button"
                        className="klondike-foundation"
                        data-testid={`klondike-foundation-${i}`}
                        disabled={!playable || !selection}
                        onClick={() => onFoundation(i)}
                        aria-label={`Foundation ${i + 1}${top ? `, ${top.rank} of ${top.suit}` : ', empty'}`}
                      >
                        {top ? (
                          <CardFace
                            card={top}
                            assetSrc={kenneyPlayingCardAsset(top)}
                            testId={`klondike-foundation-${i}-top`}
                          />
                        ) : (
                          <div
                            className="tt-card tt-card--empty"
                            data-testid={`klondike-foundation-${i}-empty`}
                          >
                            A
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="klondike-tableau" data-testid="klondike-tableau">
                {G.tableau.map((column, col) => (
                  <div
                    key={col}
                    className="klondike-column"
                    data-testid={`klondike-tableau-${col}`}
                  >
                    {column.length === 0 ? (
                      <button
                        type="button"
                        className="tt-card tt-card--empty klondike-column__empty"
                        data-testid={`klondike-tableau-${col}-empty`}
                        disabled={!playable || !selection}
                        onClick={() => onTableauEmpty(col)}
                        aria-label={`Empty tableau column ${col + 1}`}
                      >
                        K
                      </button>
                    ) : (
                      column.map((card, index) => {
                        const selected =
                          selection?.source === 'tableau' &&
                          selection.col === col &&
                          index >= selection.startIndex;
                        if (!card.faceUp) {
                          return (
                            <div
                              key={card.id}
                              className="klondike-slot"
                              style={{ top: `${index * 1.35}rem` }}
                            >
                              <CardBack
                                testId={`klondike-tableau-${col}-card-${index}`}
                                label="Face-down card"
                              />
                            </div>
                          );
                        }
                        return (
                          <div
                            key={card.id}
                            className="klondike-slot"
                            style={{ top: `${index * 1.35}rem` }}
                          >
                            <CardFace
                              card={card}
                              assetSrc={kenneyPlayingCardAsset(card)}
                              selected={selected}
                              playable={playable}
                              onSelect={playable ? () => onTableauCard(col, index) : undefined}
                              testId={`klondike-tableau-${col}-card-${index}`}
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
      />
    </>
  );
}
