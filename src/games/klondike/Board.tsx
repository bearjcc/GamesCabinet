import type { BoardProps } from 'boardgame.io/react';
import { type PointerEvent as ReactPointerEvent, useEffect, useMemo, useState } from 'react';
import { SoloLeaderboardShell } from '../../components/SoloLeaderboardShell';
import { StatusBar } from '../../components/StatusBar';
import { CardBack, CardFace } from '../../components/tabletop/CardFace';
import { StockPile } from '../../components/tabletop/CardPile';
import { SolitaireDragGhost } from '../../components/tabletop/SolitaireDragGhost';
import type { SubmitScoreInput } from '../../lib/scores';
import { kenneyPlayingCardAsset } from '../shared/cards';
import { findSolDropTarget } from '../shared/solitaire/drag';
import { preloadKenneyPlayingCards } from '../shared/solitaire/kenneyPreload';
import { findFoundationIndex, isLegalRun, type KlondikeState, type TableCard } from './game';

const DRAG_THRESHOLD_PX = 4;

type KlondikeDragSource =
  | { source: 'waste' }
  | { source: 'tableau'; col: number; startIndex: number; count: number };

type DragState = {
  source: KlondikeDragSource;
  cards: TableCard[];
  assetSrcs: string[];
  x: number;
  y: number;
  ghostWidthRem: number;
};

function topCard(pile: readonly TableCard[]): TableCard | undefined {
  return pile[pile.length - 1];
}

function cardWidthRemFromElement(el: HTMLElement | null): number {
  if (!el) return 4.5;
  const rect = el.getBoundingClientRect();
  const fs = Number.parseFloat(getComputedStyle(document.documentElement).fontSize || '16');
  return rect.width / fs || 4.5;
}

export function KlondikeBoard({ G, ctx, moves, isActive }: BoardProps<KlondikeState>) {
  const playable = Boolean(isActive && !ctx.gameover);
  const [tab, setTab] = useState<'play' | 'scores'>('play');
  const [drag, setDrag] = useState<DragState | null>(null);
  useEffect(() => {
    preloadKenneyPlayingCards();
  }, []);

  const pendingSubmit = useMemo((): SubmitScoreInput | null => {
    if (!ctx.gameover) return null;
    const over = ctx.gameover as { won: boolean; score: number };
    return { score: over.score, meta: { won: over.won } };
  }, [ctx.gameover]);

  const over = ctx.gameover as { won?: boolean; score?: number } | undefined;
  let status = 'Drag cards. Double-click to send home.';
  let tone: 'neutral' | 'you' | 'wait' | 'done' = 'you';
  if (over?.won) {
    status = 'You win';
    tone = 'done';
  } else if (!playable) {
    tone = 'wait';
  } else if (drag) {
    status = 'Drop on a foundation or tableau column';
  }

  const onStock = () => {
    if (!playable) return;
    moves.draw();
  };

  const executeDrop = (source: KlondikeDragSource, target: string) => {
    const [kind, indexStr] = target.split(':');
    const col = Number(indexStr);
    if (!Number.isInteger(col)) return;

    if (source.source === 'waste') {
      if (kind === 'foundation') moves.wasteToFoundation();
      else if (kind === 'tableau') moves.wasteToTableau(col);
      return;
    }

    if (source.source === 'tableau') {
      if (kind === 'foundation' && source.count === 1) moves.tableauToFoundation(source.col);
      else if (kind === 'tableau') moves.tableauToTableau(source.col, col, source.count);
    }
  };

  const startDrag = (
    source: KlondikeDragSource,
    cards: TableCard[],
    assetSrcs: string[],
    widthEl: HTMLElement | null,
    e: ReactPointerEvent,
  ) => {
    if (!playable || e.button !== 0) return;
    e.preventDefault();
    const originX = e.clientX;
    const originY = e.clientY;
    const ghostWidthRem = cardWidthRemFromElement(widthEl);
    let active = false;

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - originX;
      const dy = ev.clientY - originY;
      if (!active && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
      active = true;
      setDrag({ source, cards, assetSrcs, x: ev.clientX, y: ev.clientY, ghostWidthRem });
    };

    const onUp = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (active) {
        const target = findSolDropTarget(ev.clientX, ev.clientY);
        if (target) executeDrop(source, target);
      }
      setDrag(null);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const onWastePointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const top = topCard(G.waste);
    if (!top) return;
    const el = e.currentTarget;
    startDrag({ source: 'waste' }, [top], [kenneyPlayingCardAsset(top)], el, e);
  };

  const onWasteDoubleClick = () => {
    if (!playable) return;
    const top = topCard(G.waste);
    if (top && findFoundationIndex(G.foundations, top) >= 0) moves.wasteToFoundation();
  };

  const onTableauPointerDown = (
    col: number,
    index: number,
    e: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    const card = G.tableau[col][index];
    if (!card?.faceUp) return;
    const run = G.tableau[col].slice(index);
    if (!isLegalRun(run)) return;
    const assetSrcs = run.map((c) => kenneyPlayingCardAsset(c));
    const columnEl = e.currentTarget.closest('.klondike-column');
    startDrag(
      { source: 'tableau', col, startIndex: index, count: run.length },
      run,
      assetSrcs,
      columnEl as HTMLElement | null,
      e,
    );
  };

  const onTableauDoubleClick = (col: number) => {
    if (!playable) return;
    const column = G.tableau[col];
    const top = column[column.length - 1];
    if (!top?.faceUp) return;
    if (findFoundationIndex(G.foundations, top) >= 0) moves.tableauToFoundation(col);
  };

  const wasteTop = topCard(G.waste);
  const draggingWaste = drag?.source.source === 'waste';

  return (
    <SoloLeaderboardShell
      gameId="klondike"
      pendingSubmit={pendingSubmit}
      tab={tab}
      onTabChange={setTab}
      testIdPrefix="klondike"
      info={<StatusBar text={status} tone={tone} />}
      board={
        <div className="sol-board klondike-board" data-testid="klondike-board">
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
                  playable={playable}
                  className={draggingWaste ? 'is-dragging' : ''}
                  onPointerDown={playable ? onWastePointerDown : undefined}
                  onDoubleClick={playable ? onWasteDoubleClick : undefined}
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
                  <div
                    key={i}
                    className="klondike-foundation sol-drop"
                    data-sol-drop={`foundation:${i}`}
                    data-testid={`klondike-foundation-${i}`}
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
                  </div>
                );
              })}
            </div>
          </div>

          <div className="klondike-tableau" data-testid="klondike-tableau">
            {G.tableau.map((column, col) => (
              <div
                key={col}
                className="klondike-column sol-drop"
                data-sol-drop={`tableau:${col}`}
                data-testid={`klondike-tableau-${col}`}
              >
                {column.length === 0 ? (
                  <div
                    className="tt-card tt-card--empty klondike-column__empty"
                    data-testid={`klondike-tableau-${col}-empty`}
                  >
                    K
                  </div>
                ) : (
                  column.map((card, index) => {
                    const dragging =
                      drag?.source.source === 'tableau' &&
                      drag.source.col === col &&
                      index >= drag.source.startIndex;
                    if (!card.faceUp) {
                      return (
                        <div
                          key={card.id}
                          className="klondike-slot"
                          style={{ top: `calc(${index} * var(--sol-stack-step))` }}
                        >
                          <CardBack
                            testId={`klondike-tableau-${col}-card-${index}`}
                            label="Face-down card"
                          />
                        </div>
                      );
                    }
                    const isTop = index === column.length - 1;
                    return (
                      <div
                        key={card.id}
                        className="klondike-slot"
                        style={{ top: `calc(${index} * var(--sol-stack-step))` }}
                      >
                        <CardFace
                          card={card}
                          assetSrc={kenneyPlayingCardAsset(card)}
                          playable={playable}
                          className={dragging ? 'is-dragging' : ''}
                          onPointerDown={
                            playable ? (e) => onTableauPointerDown(col, index, e) : undefined
                          }
                          onDoubleClick={
                            playable && isTop ? () => onTableauDoubleClick(col) : undefined
                          }
                          testId={`klondike-tableau-${col}-card-${index}`}
                        />
                      </div>
                    );
                  })
                )}
              </div>
            ))}
          </div>

          {drag ? (
            <SolitaireDragGhost
              x={drag.x}
              y={drag.y}
              cards={drag.cards}
              assetSrcs={drag.assetSrcs}
              cardWidthRem={drag.ghostWidthRem}
            />
          ) : null}
        </div>
      }
    />
  );
}
