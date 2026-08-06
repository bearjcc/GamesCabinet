import type { BoardProps } from 'boardgame.io/react';
import { ActionSurface } from '../../components/ActionSurface';
import { PlayTable } from '../../components/PlayTable';
import { StatusBar } from '../../components/StatusBar';
import { deriveMatchStatus } from '../../lib/matchStatus';
import { getNineMensMorrisActions } from './actions';
import {
  ADJACENT,
  type Cell,
  legalMoves,
  legalPlaces,
  legalRemovals,
  type NmmState,
  POINT_COORDS,
  POINT_COUNT,
} from './game';

function pointAriaLabel(
  index: number,
  cell: Cell,
  opts: { selected: boolean; target: boolean; removable: boolean; placeable: boolean },
): string {
  const parts = [`Point ${index}`];
  if (cell) parts.push(cell === '0' ? 'dark piece' : 'light piece');
  else parts.push('empty');
  if (opts.selected) parts.push('selected');
  if (opts.target) parts.push('move target');
  if (opts.removable) parts.push('removable');
  if (opts.placeable) parts.push('placeable');
  return parts.join(', ');
}

/** SVG line segments for the geometric board (percentage viewBox 0–100). */
function boardLines(): { x1: number; y1: number; x2: number; y2: number }[] {
  const seen = new Set<string>();
  const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (let from = 0; from < POINT_COUNT; from++) {
    for (const to of ADJACENT[from]) {
      if (to < from) continue;
      const key = `${from}-${to}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const a = POINT_COORDS[from];
      const b = POINT_COORDS[to];
      lines.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
    }
  }
  return lines;
}

const BOARD_LINES = boardLines();

export function NineMensMorrisBoard({ G, ctx, moves, playerID }: BoardProps<NmmState>) {
  const yourTurn = playerID !== null && ctx.currentPlayer === playerID && !ctx.gameover;
  const player = playerID ?? ctx.currentPlayer;

  const places = yourTurn && G.phase === 'place' && !G.pendingRemoval ? legalPlaces(G, player) : [];
  const placeSet = new Set(places);
  const removals = yourTurn && G.pendingRemoval ? legalRemovals(G, player) : [];
  const removalSet = new Set(removals);
  const relocations =
    yourTurn && G.phase === 'move' && !G.pendingRemoval ? legalMoves(G, player) : [];
  const selectable = new Set(relocations.map((m) => m.from));
  const targets =
    G.selected === null ? [] : relocations.filter((m) => m.from === G.selected).map((m) => m.to);
  const targetSet = new Set(targets);

  let yourTurnLabel = 'Your turn';
  if (G.pendingRemoval) yourTurnLabel = 'Mill — remove an opponent piece';
  else if (G.phase === 'place') yourTurnLabel = 'Your turn — place a piece';
  else if (G.selected === null) yourTurnLabel = 'Your turn — select a piece';
  else yourTurnLabel = 'Your turn — choose a destination';

  const { text: status, tone } = deriveMatchStatus(ctx, playerID, {
    isYourTurn: yourTurn,
    labels: { yourTurn: yourTurnLabel },
  });

  const pewActions = getNineMensMorrisActions({ G, player, yourTurn });
  const surfaceActions = pewActions.map((action) => ({
    ...action,
    onAction: () => {
      const place = /^place-(\d+)$/.exec(action.id);
      if (place) {
        moves.place(Number(place[1]));
        return;
      }
      const remove = /^remove-(\d+)$/.exec(action.id);
      if (remove) {
        moves.remove(Number(remove[1]));
        return;
      }
      const select = /^select-(\d+)$/.exec(action.id);
      if (select) {
        moves.select(Number(select[1]));
        return;
      }
      const moveTo = /^move-to-(\d+)$/.exec(action.id);
      if (moveTo && G.selected !== null) {
        moves.move(Number(moveTo[1]));
      }
    },
  }));

  return (
    <PlayTable
      info={<StatusBar text={status} tone={tone} />}
      board={
        <div
          className="nmm-board"
          role="group"
          aria-label="Nine Men's Morris board"
          data-testid="nmm-board"
        >
          <svg className="nmm-lines" viewBox="0 0 100 100" aria-hidden role="presentation">
            {BOARD_LINES.map((line) => (
              <line
                key={`${line.x1}-${line.y1}-${line.x2}-${line.y2}`}
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
              />
            ))}
          </svg>
          {G.points.map((cell, i) => {
            const { x, y } = POINT_COORDS[i];
            const isSel = G.selected === i;
            const isTarget = targetSet.has(i);
            const isRemovable = removalSet.has(i);
            const isPlaceable = placeSet.has(i);
            const canClick =
              yourTurn &&
              (isPlaceable ||
                isRemovable ||
                isTarget ||
                (cell !== null && selectable.has(i) && !G.pendingRemoval));

            return (
              <button
                key={i}
                type="button"
                className={[
                  'nmm-point',
                  cell ? `p${cell}` : '',
                  isSel ? 'selected' : '',
                  isTarget ? 'target' : '',
                  isRemovable ? 'removable' : '',
                  isPlaceable ? 'placeable' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={{ left: `${x}%`, top: `${y}%` }}
                data-testid={`nmm-point-${i}`}
                disabled={!canClick}
                aria-label={pointAriaLabel(i, cell, {
                  selected: isSel,
                  target: isTarget,
                  removable: isRemovable,
                  placeable: isPlaceable,
                })}
                onClick={() => {
                  if (isRemovable) {
                    moves.remove(i);
                    return;
                  }
                  if (isPlaceable) {
                    moves.place(i);
                    return;
                  }
                  if (isTarget) {
                    moves.move(i);
                    return;
                  }
                  if (cell && selectable.has(i)) {
                    moves.select(i);
                  }
                }}
              >
                {cell ? <span className={`nmm-piece p${cell}`} aria-hidden /> : null}
              </button>
            );
          })}
        </div>
      }
      actions={<ActionSurface label="Nine Men's Morris actions" actions={surfaceActions} />}
    />
  );
}
