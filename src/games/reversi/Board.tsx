import type { BoardProps } from 'boardgame.io/react';
import { useEffect, useRef, useState } from 'react';
import { ActionSurface } from '../../components/ActionSurface';
import { Drop, Snap } from '../../components/cinematic';
import { PlayTable } from '../../components/PlayTable';
import { StatusBar } from '../../components/StatusBar';
import { Token } from '../../components/tabletop';
import { primitiveProfile } from '../../lib/cinematic';
import { deriveMatchStatus } from '../../lib/matchStatus';
import { readEffectiveMotion } from '../../lib/motion';
import { getReversiActions } from './actions';
import type { ReversiState } from './game';
import { legalPlaces, SIZE } from './game';

type Cell = string | null;

function cloneCells(cells: readonly Cell[]): Cell[] {
  return cells.slice();
}

/** First empty square that gained a disc (placement). */
function findPlaceIndex(prev: readonly Cell[], next: readonly Cell[]): number | null {
  for (let i = 0; i < next.length; i++) {
    if (next[i] !== null && prev[i] === null) return i;
  }
  return null;
}

/** Occupied squares whose owner changed (flips). */
function findFlipIndexes(prev: readonly Cell[], next: readonly Cell[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < next.length; i++) {
    if (prev[i] !== null && next[i] !== null && prev[i] !== next[i]) out.push(i);
  }
  return out;
}

type DiscChromeProps = {
  player: string;
  snapPulse: number;
  snapActive: boolean;
  dropPulse: number;
  dropActive: boolean;
};

/** Client-only Snap/Drop pulse; remounts so motion never gates G or taps. */
function DiscChrome({ player, snapPulse, snapActive, dropPulse, dropActive }: DiscChromeProps) {
  const inner = <Token player={player} variant="disc" size="md" />;
  if (snapActive) {
    return (
      <Snap key={snapPulse} active={snapActive} className="reversi-cell__cinematic">
        {inner}
      </Snap>
    );
  }
  if (dropActive) {
    return (
      <Drop key={dropPulse} active={dropActive} className="reversi-cell__cinematic">
        {inner}
      </Drop>
    );
  }
  return inner;
}

export function ReversiBoard({ G, ctx, moves, playerID, isActive }: BoardProps<ReversiState>) {
  /** Client-only place / flip pulses; remount wrappers so motion never gates G. */
  const [placePulse, setPlacePulse] = useState(0);
  const [placeActive, setPlaceActive] = useState(false);
  const [placeIndex, setPlaceIndex] = useState<number | null>(null);
  const [flipPulse, setFlipPulse] = useState(0);
  const [flipActive, setFlipActive] = useState(false);
  const [flipIndexes, setFlipIndexes] = useState<number[]>([]);
  const prevCellsRef = useRef(cloneCells(G.cells));

  const yourTurn = Boolean(isActive && !ctx.gameover);
  const player = playerID ?? ctx.currentPlayer;
  const places = yourTurn ? legalPlaces(G, ctx.currentPlayer) : [];
  const placeSet = new Set(places);

  useEffect(() => {
    if (!yourTurn || ctx.gameover) return;
    if (places.length === 0) moves.pass();
  }, [yourTurn, ctx.gameover, places.length, moves]);

  useEffect(() => {
    const placed = findPlaceIndex(prevCellsRef.current, G.cells);
    const flipped = findFlipIndexes(prevCellsRef.current, G.cells);
    if (placed !== null) {
      setPlaceIndex(placed);
      setPlacePulse((n) => n + 1);
    }
    if (flipped.length > 0) {
      setFlipIndexes(flipped);
      setFlipPulse((n) => n + 1);
    }
    prevCellsRef.current = cloneCells(G.cells);
  }, [G.cells]);

  useEffect(() => {
    if (placePulse === 0) return;
    setPlaceActive(true);
    const ms = primitiveProfile('snap', readEffectiveMotion()).durationMs;
    const t = window.setTimeout(() => setPlaceActive(false), ms);
    return () => window.clearTimeout(t);
  }, [placePulse]);

  useEffect(() => {
    if (flipPulse === 0) return;
    setFlipActive(true);
    const ms = primitiveProfile('drop', readEffectiveMotion()).durationMs;
    const t = window.setTimeout(() => setFlipActive(false), ms);
    return () => window.clearTimeout(t);
  }, [flipPulse]);

  const dark = G.cells.filter((c) => c === '0').length;
  const light = G.cells.filter((c) => c === '1').length;
  const { text: status, tone } = deriveMatchStatus(ctx, playerID, {
    isYourTurn: yourTurn,
    labels: {
      yourTurn:
        places.length === 0 ? 'No moves - passing' : `Your turn - place a disc (${dark}-${light})`,
    },
  });

  const pewActions = getReversiActions({ G, player, yourTurn });
  const surfaceActions = pewActions.map((action) => ({
    ...action,
    onAction: () => {
      if (action.id === 'pass') {
        moves.pass();
        return;
      }
      const match = /^place-(\d+)$/.exec(action.id);
      if (match) moves.place(Number(match[1]));
    },
  }));

  return (
    <PlayTable
      info={<StatusBar text={status} tone={tone} />}
      board={
        <div
          className="reversi-board"
          role="grid"
          aria-label="Reversi board"
          data-testid="reversi-board"
        >
          {G.cells.map((cell, i) => {
            const can = yourTurn && placeSet.has(i);
            const row = Math.floor(i / SIZE);
            const col = i % SIZE;
            const file = String.fromCharCode(97 + col);
            const rank = SIZE - row;
            const isPlacement = placeIndex === i;
            const isFlip = flipIndexes.includes(i);
            return (
              <button
                key={i}
                type="button"
                className={`reversi-cell${can ? ' is-open' : ''}`}
                disabled={!can}
                data-testid={`reversi-cell-${i}`}
                onClick={() => moves.place(i)}
                aria-label={
                  cell === null
                    ? can
                      ? `Place at ${file}${rank}`
                      : `Empty ${file}${rank}`
                    : `${cell === '0' ? 'Dark' : 'Light'} disc at ${file}${rank}`
                }
              >
                {cell !== null ? (
                  <DiscChrome
                    player={cell}
                    snapPulse={placePulse}
                    snapActive={isPlacement && placeActive}
                    dropPulse={flipPulse}
                    dropActive={isFlip && flipActive}
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      }
      actions={<ActionSurface label="Reversi actions" actions={surfaceActions} />}
    />
  );
}
