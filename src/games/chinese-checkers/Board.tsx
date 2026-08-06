import type { BoardProps } from 'boardgame.io/react';
import { useState } from 'react';
import { ActionSurface } from '../../components/ActionSurface';
import { PlayTable } from '../../components/PlayTable';
import { StatusBar } from '../../components/StatusBar';
import { deriveMatchStatus } from '../../lib/matchStatus';
import { getChineseCheckersActions } from './actions';
import {
  type ChineseCheckersState,
  GOAL_0,
  GOAL_1,
  HOLE_COUNT,
  holeAt,
  legalMoves,
  NODES,
  type Peg,
} from './game';

/** Pointy-top hex → pixel (unit size 1). */
function hexToPixel(q: number, r: number): { x: number; y: number } {
  return {
    x: Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r,
    y: (3 / 2) * r,
  };
}

const LAYOUT = (() => {
  const pts = NODES.map((n) => hexToPixel(n.q, n.r));
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  const pad = 0.9;
  minX -= pad;
  maxX += pad;
  minY -= pad;
  maxY += pad;
  const w = maxX - minX;
  const h = maxY - minY;
  return pts.map((p) => ({
    left: ((p.x - minX) / w) * 100,
    top: ((p.y - minY) / h) * 100,
  }));
})();

const GOAL_0_SET = new Set(GOAL_0);
const GOAL_1_SET = new Set(GOAL_1);

function holeAriaLabel(
  index: number,
  peg: Peg | null,
  isSelected: boolean,
  isTarget: boolean,
): string {
  const { q, r } = holeAt(index);
  const parts = [`Hole ${q},${r}`];
  if (peg) parts.push(peg === '0' ? 'red peg' : 'blue peg');
  else parts.push('empty');
  if (isSelected) parts.push('selected');
  if (isTarget) parts.push('move target');
  return parts.join(', ');
}

export function ChineseCheckersBoard({
  G,
  ctx,
  moves,
  playerID,
}: BoardProps<ChineseCheckersState>) {
  const [selected, setSelected] = useState<number | null>(null);
  const yourTurn = playerID !== null && ctx.currentPlayer === playerID && !ctx.gameover;
  const player = playerID ?? ctx.currentPlayer;
  const legal = yourTurn ? legalMoves(G, ctx.currentPlayer) : [];
  const relocate = legal.flatMap((m) =>
    m.kind === 'step' || m.kind === 'hop' ? [{ from: m.from, to: m.to }] : [],
  );
  const chainFrom = G.mustContinueFrom;
  const effectiveSelected = chainFrom !== null ? chainFrom : selected;
  const targets =
    effectiveSelected === null
      ? []
      : relocate.filter((m) => m.from === effectiveSelected).map((m) => m.to);
  const selectable = new Set(chainFrom !== null ? [chainFrom] : relocate.map((m) => m.from));

  const { text: status, tone } = deriveMatchStatus(ctx, playerID, {
    isYourTurn: yourTurn,
    labels: {
      yourTurn:
        chainFrom !== null
          ? 'Hop again or end hop'
          : effectiveSelected === null
            ? 'Your turn — tap a peg'
            : 'Tap a hole to move',
    },
  });

  const pewActions = getChineseCheckersActions({
    G,
    player,
    yourTurn,
    selected: effectiveSelected,
  });
  const surfaceActions = pewActions.map((action) => ({
    ...action,
    onAction: () => {
      if (action.id === 'end-hop') {
        moves.endHop();
        setSelected(null);
        return;
      }
      const match = /^move-to-(\d+)$/.exec(action.id);
      if (!match || effectiveSelected === null) return;
      moves.movePeg(effectiveSelected, Number(match[1]));
      setSelected(null);
    },
  }));

  return (
    <PlayTable
      info={<StatusBar text={status} tone={tone} />}
      board={
        <div
          className="chinese-checkers-board"
          role="group"
          aria-label="Chinese Checkers board"
          data-testid="chinese-checkers-board"
        >
          {Array.from({ length: HOLE_COUNT }, (_, i) => {
            const peg = G.board[i];
            const isTarget = targets.includes(i);
            const isSel = effectiveSelected === i;
            const homeClass = GOAL_1_SET.has(i) ? 'home-0' : GOAL_0_SET.has(i) ? 'home-1' : '';
            const { left, top } = LAYOUT[i];
            return (
              <button
                key={i}
                type="button"
                data-testid={peg ? `cc-peg-${i}` : `cc-node-${i}`}
                aria-label={holeAriaLabel(i, peg, isSel, isTarget)}
                className={['cc-hole', homeClass, isSel ? 'selected' : '', isTarget ? 'target' : '']
                  .filter(Boolean)
                  .join(' ')}
                style={{ left: `${left}%`, top: `${top}%` }}
                disabled={
                  !yourTurn || (!!peg && !selectable.has(i) && !isTarget) || (!peg && !isTarget)
                }
                onClick={() => {
                  if (isTarget && effectiveSelected !== null) {
                    moves.movePeg(effectiveSelected, i);
                    setSelected(null);
                    return;
                  }
                  if (peg && selectable.has(i)) setSelected(i);
                }}
              >
                {peg ? <span className={`cc-peg p${peg}`} aria-hidden /> : null}
              </button>
            );
          })}
        </div>
      }
      actions={<ActionSurface label="Chinese Checkers actions" actions={surfaceActions} />}
    />
  );
}
