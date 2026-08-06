import type { BoardProps } from 'boardgame.io/react';
import { ActionSurface } from '../../components/ActionSurface';
import { PlayTable } from '../../components/PlayTable';
import { StatusBar } from '../../components/StatusBar';
import { Counter } from '../../components/tabletop';
import { deriveMatchStatus } from '../../lib/matchStatus';
import { getDotsAndBoxesActions } from './actions';
import {
  allLineKeys,
  BOX_COLS,
  BOX_ROWS,
  DOT_COLS,
  DOT_ROWS,
  type DotsAndBoxesState,
  parseLineKey,
} from './game';

const CELL = 56;
const PAD = 28;
const DOT_R = 5;
const LINE_HIT = 14;

function lineGeometry(key: string): { x1: number; y1: number; x2: number; y2: number } | null {
  const parsed = parseLineKey(key);
  if (!parsed) return null;
  const { orient, row, col } = parsed;
  if (orient === 'h') {
    return {
      x1: PAD + col * CELL,
      y1: PAD + row * CELL,
      x2: PAD + (col + 1) * CELL,
      y2: PAD + row * CELL,
    };
  }
  return {
    x1: PAD + col * CELL,
    y1: PAD + row * CELL,
    x2: PAD + col * CELL,
    y2: PAD + (row + 1) * CELL,
  };
}

export function DotsAndBoxesBoard({
  G,
  ctx,
  moves,
  playerID,
  isActive,
}: BoardProps<DotsAndBoxesState>) {
  const yourTurn = Boolean(isActive && !ctx.gameover);
  const { text: status, tone } = deriveMatchStatus(ctx, playerID, {
    isYourTurn: yourTurn,
    labels: { yourTurn: 'Your turn - claim a line' },
  });
  const pewActions = getDotsAndBoxesActions({ G, yourTurn });
  const surfaceActions = pewActions.map((action) => ({
    ...action,
    onAction: () => {
      const match = /^claim-(.+)$/.exec(action.id);
      if (match) moves.claimLine(match[1]);
    },
  }));

  const width = PAD * 2 + BOX_COLS * CELL;
  const height = PAD * 2 + BOX_ROWS * CELL;

  return (
    <PlayTable
      info={
        <>
          <StatusBar text={status} tone={tone} />
          <div className="dab-scores" data-testid="dab-scores">
            <Counter value={G.scores[0]} label="P1" emphasize testId="dab-score-0" />
            <span className="dab-scores__sep" aria-hidden="true">
              -
            </span>
            <Counter value={G.scores[1]} label="P2" emphasize testId="dab-score-1" />
          </div>
        </>
      }
      board={
        <div
          className="dab-board"
          data-testid="dab-board"
          role="group"
          aria-label="Dots and Boxes board"
        >
          <svg
            className="dab-svg"
            viewBox={`0 0 ${width} ${height}`}
            width="100%"
            role="img"
            aria-label="Dots and boxes grid"
          >
            {G.boxes.map((owner, i) => {
              if (owner === null) return null;
              const br = Math.floor(i / BOX_COLS);
              const bc = i % BOX_COLS;
              return (
                <rect
                  key={`box-${i}`}
                  className={`dab-box p${owner}`}
                  data-testid={`dab-box-${i}`}
                  x={PAD + bc * CELL + 4}
                  y={PAD + br * CELL + 4}
                  width={CELL - 8}
                  height={CELL - 8}
                  rx={6}
                />
              );
            })}

            {allLineKeys().map((key) => {
              const geo = lineGeometry(key);
              if (!geo) return null;
              const owner = G.lines[key];
              const can = yourTurn && owner === null;
              const midX = (geo.x1 + geo.x2) / 2;
              const midY = (geo.y1 + geo.y2) / 2;
              const horizontal = geo.y1 === geo.y2;
              return (
                <g key={key}>
                  {owner !== null ? (
                    <line
                      className={`dab-line claimed p${owner}`}
                      data-testid={`dab-line-${key}`}
                      x1={geo.x1}
                      y1={geo.y1}
                      x2={geo.x2}
                      y2={geo.y2}
                    />
                  ) : (
                    <line
                      className="dab-line open"
                      data-testid={`dab-line-${key}`}
                      x1={geo.x1}
                      y1={geo.y1}
                      x2={geo.x2}
                      y2={geo.y2}
                    />
                  )}
                  <rect
                    className={`dab-line-hit${can ? ' is-open' : ''}`}
                    data-testid={`dab-hit-${key}`}
                    x={horizontal ? Math.min(geo.x1, geo.x2) : midX - LINE_HIT / 2}
                    y={horizontal ? midY - LINE_HIT / 2 : Math.min(geo.y1, geo.y2)}
                    width={horizontal ? CELL : LINE_HIT}
                    height={horizontal ? LINE_HIT : CELL}
                    role="button"
                    tabIndex={can ? 0 : -1}
                    aria-label={
                      owner === null
                        ? can
                          ? `Claim line ${key}`
                          : `Open line ${key}`
                        : `Line ${key} claimed by player ${Number(owner) + 1}`
                    }
                    aria-disabled={!can}
                    onClick={() => {
                      if (can) moves.claimLine(key);
                    }}
                    onKeyDown={(e) => {
                      if (!can) return;
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        moves.claimLine(key);
                      }
                    }}
                  />
                </g>
              );
            })}

            {Array.from({ length: DOT_ROWS }, (_, r) =>
              Array.from({ length: DOT_COLS }, (_, c) => (
                <circle
                  key={`dot-${r}-${c}`}
                  className="dab-dot"
                  data-testid={`dab-dot-${r}-${c}`}
                  cx={PAD + c * CELL}
                  cy={PAD + r * CELL}
                  r={DOT_R}
                />
              )),
            )}
          </svg>
        </div>
      }
      actions={<ActionSurface label="Dots and Boxes actions" actions={surfaceActions} />}
    />
  );
}
