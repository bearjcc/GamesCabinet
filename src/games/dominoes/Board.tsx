import type { BoardProps } from 'boardgame.io/react';
import {
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ActionSurface } from '../../components/ActionSurface';
import { Snap } from '../../components/cinematic';
import { GameRules } from '../../components/GameRules';
import { MatchScoreboard } from '../../components/MatchScoreboard';
import { PlayTable } from '../../components/PlayTable';
import { StatusBar } from '../../components/StatusBar';
import { deriveMatchStatus } from '../../lib/matchStatus';
import { getDominoesActions } from './actions';
import type { DominoesState, Tile } from './game';
import { placementForEnd, playableEndIndexes } from './game';
import {
  boardBoundsRem,
  endBoxRem,
  nearestEndIndex,
  TILE_LONG_REM,
  TILE_SHORT_REM,
  tileBoxRem,
  tileDisplayRotation,
} from './layout';

const KENNEY = '/assets/kenney/domino-pack/Vector/Light';

function kenneySrc(tile: Tile): string {
  const a = Math.min(tile.a, tile.b);
  const b = Math.max(tile.a, tile.b);
  return `${KENNEY}/tile_${a}_${b}.svg`;
}

function remToPx(rem: number): number {
  return rem * Number.parseFloat(getComputedStyle(document.documentElement).fontSize || '16');
}

export function DominoesBoard({ G, ctx, moves, playerID }: BoardProps<DominoesState>) {
  const [handIndex, setHandIndex] = useState<number | null>(null);
  const [drag, setDrag] = useState<{
    handIndex: number;
    x: number;
    y: number;
  } | null>(null);
  const [hoverEnd, setHoverEnd] = useState<number | null>(null);
  /** Client-only play pulse; remounts Snap so motion never gates G. */
  const [playPulse, setPlayPulse] = useState(0);
  const prevBoardLenRef = useRef(G.board.length);
  const tableRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const latestRef = useRef({ G, hand: [] as Tile[], boundsMin: { x: 0, y: 0 } });

  const pid = playerID === null ? -1 : Number(playerID);
  const yourTurn = playerID !== null && ctx.currentPlayer === playerID && !ctx.gameover;
  const hand = pid >= 0 ? G.hands[pid] : [];

  useEffect(() => {
    if (G.board.length > prevBoardLenRef.current) {
      setPlayPulse((n) => n + 1);
    }
    prevBoardLenRef.current = G.board.length;
  }, [G.board.length]);

  const bounds = useMemo(() => boardBoundsRem(G.board, G.ends, TILE_LONG_REM), [G.board, G.ends]);
  latestRef.current = { G, hand, boundsMin: { x: bounds.minX, y: bounds.minY } };

  const endChoices = useMemo(() => {
    if (handIndex === null || !yourTurn) return [] as number[];
    return playableEndIndexes(G, hand[handIndex]);
  }, [G, hand, handIndex, yourTurn]);

  const dragChoices = useMemo(() => {
    if (!drag || !yourTurn) return [] as number[];
    return playableEndIndexes(G, hand[drag.handIndex]);
  }, [G, hand, drag, yourTurn]);

  const litEnds = drag ? dragChoices : endChoices;

  const { text: baseStatus, tone } = deriveMatchStatus(ctx, playerID, {
    isYourTurn: yourTurn,
  });
  let status = baseStatus;
  if (G.showing) status = 'Blocked — showing hands for pip count';
  else if (yourTurn && !ctx.gameover) {
    if (drag) status = 'Drop on an open end';
    else if (handIndex === null) status = 'Your turn — drag a tile to play';
    else if (G.board.length === 0) status = 'Drop a starter on the table';
    else status = 'Drag to an open end';
  }

  const clientToStageRem = (clientX: number, clientY: number) => {
    const stage = stageRef.current;
    if (!stage) return null;
    const rect = stage.getBoundingClientRect();
    const fs = Number.parseFloat(getComputedStyle(document.documentElement).fontSize || '16');
    const { boundsMin } = latestRef.current;
    return {
      x: (clientX - rect.left) / fs + boundsMin.x,
      y: (clientY - rect.top) / fs + boundsMin.y,
    };
  };

  const startDrag = (hi: number, e: ReactPointerEvent) => {
    if (!yourTurn || e.button !== 0) return;
    e.preventDefault();
    const originX = e.clientX;
    const originY = e.clientY;
    setHandIndex(hi);
    setDrag({ handIndex: hi, x: originX, y: originY });

    const onMove = (ev: PointerEvent) => {
      setDrag({ handIndex: hi, x: ev.clientX, y: ev.clientY });
      const { G: g, hand: h } = latestRef.current;
      const choices = playableEndIndexes(g, h[hi]);
      if (g.board.length === 0) {
        setHoverEnd(null);
        return;
      }
      const pt = clientToStageRem(ev.clientX, ev.clientY);
      setHoverEnd(pt ? nearestEndIndex(pt, g.ends, choices) : null);
    };

    const finish = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);

      const { G: g, hand: h } = latestRef.current;
      const moved = Math.hypot(ev.clientX - originX, ev.clientY - originY) > 12;
      const choices = playableEndIndexes(g, h[hi]);

      if (g.board.length === 0) {
        const table = tableRef.current?.getBoundingClientRect();
        const overTable =
          !!table &&
          ev.clientX >= table.left &&
          ev.clientX <= table.right &&
          ev.clientY >= table.top &&
          ev.clientY <= table.bottom;
        if (moved && overTable) {
          moves.playTile(hi, -1);
          setHandIndex(null);
          setDrag(null);
          setHoverEnd(null);
          return;
        }
        setHandIndex(hi);
        setDrag(null);
        setHoverEnd(null);
        return;
      }

      const pt = clientToStageRem(ev.clientX, ev.clientY);
      const endIdx = pt ? nearestEndIndex(pt, g.ends, choices) : null;
      if (moved && endIdx !== null) {
        moves.playTile(hi, endIdx);
        setHandIndex(null);
        setDrag(null);
        setHoverEnd(null);
        return;
      }
      setHandIndex(hi);
      setDrag(null);
      setHoverEnd(null);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', finish);
  };

  const dragTile = drag ? hand[drag.handIndex] : null;
  const preview =
    drag && hoverEnd !== null && G.ends[hoverEnd] && dragTile
      ? placementForEnd(G.ends[hoverEnd], dragTile)
      : null;

  const pewActions = getDominoesActions({ G, player: pid, yourTurn });
  const surfaceActions = pewActions.map((action) => ({
    ...action,
    onAction: () => {
      if (action.id === 'draw') {
        moves.drawTile();
        return;
      }
      if (action.id === 'pass') {
        moves.pass();
      }
    },
  }));

  const scoreItems = G.scores.map((value, seat) => ({
    label: seat === pid ? 'You' : `P${seat + 1}`,
    value,
  }));

  return (
    <PlayTable
      info={
        <>
          <StatusBar text={status} tone={tone} />
          <MatchScoreboard
            scores={[{ label: 'Boneyard', value: G.boneyard.length }, ...scoreItems]}
            testId="dom-meta"
          />
          <GameRules testId="dom-rules">
            <p>
              Empty your hand or win when the game blocks. Score the pip total left in every
              opponent&apos;s hand.
            </p>
            <ul>
              <li>Go out: add all pips still held by opponents.</li>
              <li>Blocked: everyone shows their tiles; lowest pip total wins the same way.</li>
            </ul>
          </GameRules>
        </>
      }
      board={
        <div className="dom-scroll" data-testid="dom-board" ref={tableRef}>
          <Snap key={playPulse} active={playPulse > 0} className="dom-snap">
            <div
              className="dom-stage"
              ref={stageRef}
              style={{
                width: `${bounds.width}rem`,
                height: `${bounds.height}rem`,
              }}
            >
              {G.board.map((p) => {
                const box = tileBoxRem(p.x, p.y, p.rot);
                return (
                  <div
                    key={`${p.tile.id}:${p.x},${p.y}`}
                    className="dom-placed"
                    style={{
                      left: `${box.left - bounds.minX}rem`,
                      top: `${box.top - bounds.minY}rem`,
                      width: `${box.width}rem`,
                      height: `${box.height}rem`,
                    }}
                  >
                    <img
                      className="dom-tile-img"
                      src={kenneySrc(p.tile)}
                      alt=""
                      draggable={false}
                      style={{ transform: `rotate(${tileDisplayRotation(p.rot)}deg)` }}
                    />
                  </div>
                );
              })}
              {G.board.length === 0 ? (
                <button
                  type="button"
                  className={`dom-starter${handIndex !== null && yourTurn ? ' lit' : ''}`}
                  disabled={handIndex === null || !yourTurn}
                  data-testid="dom-starter"
                  onClick={() => {
                    if (handIndex === null) return;
                    moves.playTile(handIndex, -1);
                    setHandIndex(null);
                  }}
                >
                  Drop starter here
                </button>
              ) : null}
              {G.ends.map((e, i) => {
                const box = endBoxRem(e.x, e.y, e.dir);
                const lit = litEnds.includes(i);
                const hot = hoverEnd === i;
                return (
                  <button
                    key={e.id}
                    type="button"
                    className={`dom-end${lit ? ' lit' : ''}${hot ? ' snap' : ''}`}
                    style={{
                      left: `${box.left - bounds.minX}rem`,
                      top: `${box.top - bounds.minY}rem`,
                      width: `${box.width}rem`,
                      height: `${box.height}rem`,
                    }}
                    disabled={!lit}
                    data-testid={`dom-end-${i}`}
                    onClick={() => {
                      if (handIndex === null) return;
                      moves.playTile(handIndex, i);
                      setHandIndex(null);
                    }}
                  >
                    <span className="sr-only">Play on {e.value}</span>
                  </button>
                );
              })}
            </div>
          </Snap>
          {dragTile && drag && preview ? (
            <div
              className="dom-placement-preview"
              style={{
                left: `${tileBoxRem(preview.x, preview.y, preview.rot).left - bounds.minX}rem`,
                top: `${tileBoxRem(preview.x, preview.y, preview.rot).top - bounds.minY}rem`,
                width: `${tileBoxRem(preview.x, preview.y, preview.rot).width}rem`,
                height: `${tileBoxRem(preview.x, preview.y, preview.rot).height}rem`,
              }}
              data-testid="dom-placement-preview"
            >
              <img
                className="dom-tile-img"
                src={kenneySrc(dragTile)}
                alt=""
                draggable={false}
                style={{ transform: `rotate(${tileDisplayRotation(preview.rot)}deg)` }}
              />
            </div>
          ) : dragTile && drag ? (
            <div
              className="dom-drag-ghost"
              style={{
                left: drag.x - remToPx(TILE_LONG_REM) / 2,
                top: drag.y - remToPx(TILE_SHORT_REM) / 2,
              }}
            >
              <div className="dom-tile kenney">
                <img src={kenneySrc(dragTile)} alt="" draggable={false} />
              </div>
            </div>
          ) : null}
        </div>
      }
      pew={
        <div className="dom-hand" data-testid="dom-hand">
          {hand.map((tile, i) => (
            <button
              key={`${tile.id}-${i}`}
              type="button"
              className={`dom-hand-slot${handIndex === i ? ' selected' : ''}${drag?.handIndex === i ? ' is-dragging' : ''}`}
              disabled={!yourTurn}
              aria-label={`${tile.a}-${tile.b}`}
              data-testid={`dom-hand-${i}`}
              onPointerDown={(e) => startDrag(i, e)}
            >
              <span className="dom-tile kenney">
                <img src={kenneySrc(tile)} alt="" draggable={false} />
              </span>
            </button>
          ))}
        </div>
      }
      actions={<ActionSurface label="Dominoes actions" actions={surfaceActions} />}
    />
  );
}
