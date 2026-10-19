import type { BoardProps } from 'boardgame.io/react';
import { type PointerEvent as ReactPointerEvent, useEffect, useMemo, useState } from 'react';
import { SoloLeaderboardShell } from '../../components/SoloLeaderboardShell';
import { StatusBar } from '../../components/StatusBar';
import { CardFace } from '../../components/tabletop/CardFace';
import { SolitaireDragGhost } from '../../components/tabletop/SolitaireDragGhost';
import type { SubmitScoreInput } from '../../lib/scores';
import { findFoundationIndex } from '../klondike/game';
import { type Card, kenneyPlayingCardAsset } from '../shared/cards';
import { findSolDropTarget } from '../shared/solitaire/drag';
import { preloadKenneyPlayingCards } from '../shared/solitaire/kenneyPreload';
import { type FreeCellState, isLegalCascadeRun } from './game';

const DRAG_THRESHOLD_PX = 4;

type FreeCellDragSource =
  | { source: 'cascade'; col: number; startIndex: number; count: number }
  | { source: 'freecell'; index: number };

type DragState = {
  source: FreeCellDragSource;
  cards: Card[];
  assetSrcs: string[];
  x: number;
  y: number;
  ghostWidthRem: number;
};

function topCard(pile: readonly Card[]): Card | undefined {
  return pile[pile.length - 1];
}

function cardWidthRemFromElement(el: HTMLElement | null): number {
  if (!el) return 4.5;
  const rect = el.getBoundingClientRect();
  const fs = Number.parseFloat(getComputedStyle(document.documentElement).fontSize || '16');
  return rect.width / fs || 4.5;
}

export function FreeCellBoard({ G, ctx, moves, isActive }: BoardProps<FreeCellState>) {
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
    status = 'Drop on a foundation, freecell, or cascade';
  }

  const executeDrop = (source: FreeCellDragSource, target: string) => {
    const [kind, indexStr] = target.split(':');
    const index = Number(indexStr);
    if (!Number.isInteger(index)) return;

    if (source.source === 'freecell') {
      if (kind === 'foundation') moves.freecellToFoundation(source.index);
      else if (kind === 'cascade') moves.freecellToCascade(source.index, index);
      return;
    }

    if (source.source === 'cascade') {
      if (kind === 'foundation' && source.count === 1) moves.cascadeToFoundation(source.col);
      else if (kind === 'freecell' && source.count === 1)
        moves.cascadeToFreecell(source.col, index);
      else if (kind === 'cascade') moves.cascadeToCascade(source.col, index, source.count);
    }
  };

  const startDrag = (
    source: FreeCellDragSource,
    cards: Card[],
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

  const onFreecellPointerDown = (index: number, e: ReactPointerEvent<HTMLButtonElement>) => {
    const card = G.freecells[index];
    if (!card) return;
    const slotEl = e.currentTarget.closest('.freecell-slot') ?? e.currentTarget;
    startDrag(
      { source: 'freecell', index },
      [card],
      [kenneyPlayingCardAsset(card)],
      slotEl as HTMLElement,
      e,
    );
  };

  const onFreecellDoubleClick = (index: number) => {
    if (!playable) return;
    const card = G.freecells[index];
    if (card && findFoundationIndex(G.foundations, card) >= 0) {
      moves.freecellToFoundation(index);
    }
  };

  const onCascadePointerDown = (
    col: number,
    index: number,
    e: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    const run = G.cascades[col].slice(index);
    if (!isLegalCascadeRun(run)) return;
    const assetSrcs = run.map((c) => kenneyPlayingCardAsset(c));
    const columnEl = e.currentTarget.closest('.freecell-column');
    startDrag(
      { source: 'cascade', col, startIndex: index, count: run.length },
      run,
      assetSrcs,
      columnEl as HTMLElement | null,
      e,
    );
  };

  const onCascadeDoubleClick = (col: number) => {
    if (!playable) return;
    const column = G.cascades[col];
    const top = column[column.length - 1];
    if (top && findFoundationIndex(G.foundations, top) >= 0) moves.cascadeToFoundation(col);
  };

  return (
    <SoloLeaderboardShell
      gameId="freecell"
      pendingSubmit={pendingSubmit}
      tab={tab}
      onTabChange={setTab}
      testIdPrefix="freecell"
      info={<StatusBar text={status} tone={tone} />}
      board={
        <div className="sol-board freecell-board" data-testid="freecell-board">
          <div className="freecell-top">
            <div className="freecell-freecells" data-testid="freecell-freecells">
              {G.freecells.map((card, i) => {
                const dragging = drag?.source.source === 'freecell' && drag.source.index === i;
                return (
                  <div
                    key={i}
                    className="freecell-slot sol-drop"
                    data-sol-drop={`freecell:${i}`}
                    data-testid={`freecell-freecell-${i}`}
                  >
                    {card ? (
                      <CardFace
                        card={card}
                        assetSrc={kenneyPlayingCardAsset(card)}
                        playable={playable}
                        className={dragging ? 'is-dragging' : ''}
                        onPointerDown={playable ? (e) => onFreecellPointerDown(i, e) : undefined}
                        onDoubleClick={playable ? () => onFreecellDoubleClick(i) : undefined}
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
                  </div>
                );
              })}
            </div>
            <div className="freecell-foundations" data-testid="freecell-foundations">
              {G.foundations.map((pile, i) => {
                const top = topCard(pile);
                return (
                  <div
                    key={i}
                    className="freecell-foundation sol-drop"
                    data-sol-drop={`foundation:${i}`}
                    data-testid={`freecell-foundation-${i}`}
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
                  </div>
                );
              })}
            </div>
          </div>

          <div className="freecell-cascades" data-testid="freecell-cascades">
            {G.cascades.map((column, col) => (
              <div
                key={col}
                className="freecell-column sol-drop"
                data-sol-drop={`cascade:${col}`}
                data-testid={`freecell-cascade-${col}`}
              >
                {column.length === 0 ? (
                  <div
                    className="tt-card tt-card--empty freecell-column__empty"
                    data-testid={`freecell-cascade-${col}-empty`}
                  >
                    Any
                  </div>
                ) : (
                  column.map((card, index) => {
                    const dragging =
                      drag?.source.source === 'cascade' &&
                      drag.source.col === col &&
                      index >= drag.source.startIndex;
                    const isTop = index === column.length - 1;
                    return (
                      <div
                        key={card.id}
                        className="freecell-slot-card"
                        style={{ top: `calc(${index} * var(--sol-stack-step))` }}
                      >
                        <CardFace
                          card={card}
                          assetSrc={kenneyPlayingCardAsset(card)}
                          playable={playable}
                          className={dragging ? 'is-dragging' : ''}
                          onPointerDown={
                            playable ? (e) => onCascadePointerDown(col, index, e) : undefined
                          }
                          onDoubleClick={
                            playable && isTop ? () => onCascadeDoubleClick(col) : undefined
                          }
                          testId={`freecell-cascade-${col}-card-${index}`}
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
