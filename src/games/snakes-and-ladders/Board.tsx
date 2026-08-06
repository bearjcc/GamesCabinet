import type { BoardProps } from 'boardgame.io/react';
import { useEffect, useRef, useState } from 'react';
import { ActionSurface } from '../../components/ActionSurface';
import { Roll } from '../../components/cinematic';
import { PlayTable } from '../../components/PlayTable';
import { StatusBar } from '../../components/StatusBar';
import { DieFace, Token } from '../../components/tabletop';
import { deriveMatchStatus } from '../../lib/matchStatus';
import { asDieFaceValue } from '../shared/dice';
import { getSnakesAndLaddersActions } from './actions';
import {
  BOARD_SIZE,
  FINAL_SQUARE,
  SNAKES_AND_LADDERS,
  type SnakesAndLaddersState,
  squareAt,
} from './game';

function teleporterLabel(square: number): string | null {
  const dest = SNAKES_AND_LADDERS[square];
  if (dest == null) return null;
  return dest > square ? `Ladder to ${dest}` : `Snake to ${dest}`;
}

export function SnakesAndLaddersBoard({
  G,
  ctx,
  moves,
  playerID,
  isActive,
}: BoardProps<SnakesAndLaddersState>) {
  const yourTurn = Boolean(isActive && !ctx.gameover);
  const { text: status, tone } = deriveMatchStatus(ctx, playerID, {
    isYourTurn: yourTurn,
    labels: { yourTurn: 'Your turn - roll the die' },
  });

  const [rollPulse, setRollPulse] = useState(0);
  const prevRollRef = useRef(G.lastRoll);

  useEffect(() => {
    if (G.lastRoll != null && G.lastRoll !== prevRollRef.current) {
      setRollPulse((n) => n + 1);
    }
    prevRollRef.current = G.lastRoll;
  }, [G.lastRoll]);

  const pewActions = getSnakesAndLaddersActions({ G, yourTurn });
  const surfaceActions = pewActions.map((action) => ({
    ...action,
    onAction: () => {
      if (action.id === 'roll') moves.roll();
    },
  }));

  const cells: number[] = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      cells.push(squareAt(row, col));
    }
  }

  return (
    <PlayTable
      info={<StatusBar text={status} tone={tone} />}
      board={
        <div className="sal-table" data-testid="sal-board">
          <div className="sal-meta">
            <div className="sal-positions" role="group" aria-label="Pawn positions">
              <span data-testid="sal-pos-0">
                P1: {G.positions[0] === 0 ? 'start' : G.positions[0]}
              </span>
              <span data-testid="sal-pos-1">
                P2: {G.positions[1] === 0 ? 'start' : G.positions[1]}
              </span>
              <span className="sal-goal">Goal: {FINAL_SQUARE}</span>
            </div>
            <div className="sal-die-slot" aria-live="polite">
              {G.lastRoll != null ? (
                <Roll key={rollPulse} active={rollPulse > 0} className="sal-die-cinematic">
                  <DieFace
                    face={asDieFaceValue(G.lastRoll)}
                    testId="sal-die"
                    label={`Rolled ${G.lastRoll}`}
                  />
                </Roll>
              ) : (
                <div className="sal-die-empty" data-testid="sal-die-empty">
                  Roll to start
                </div>
              )}
            </div>
          </div>
          <div className="sal-grid" role="grid" aria-label="Snakes and Ladders board">
            {cells.map((n) => {
              const tele = teleporterLabel(n);
              const occupants = (['0', '1'] as const).filter((p) => G.positions[Number(p)] === n);
              return (
                <div
                  key={n}
                  className={[
                    'sal-cell',
                    tele?.startsWith('Ladder') ? 'is-ladder' : '',
                    tele?.startsWith('Snake') ? 'is-snake' : '',
                    n === FINAL_SQUARE ? 'is-finish' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  role="gridcell"
                  data-testid={`sal-cell-${n}`}
                  aria-label={
                    tele
                      ? `Square ${n}, ${tele}`
                      : n === FINAL_SQUARE
                        ? `Square ${n}, finish`
                        : `Square ${n}`
                  }
                >
                  <span className="sal-cell-num">{n}</span>
                  {tele ? (
                    <span className="sal-cell-tele" aria-hidden="true">
                      {SNAKES_AND_LADDERS[n]}
                    </span>
                  ) : null}
                  {occupants.length > 0 ? (
                    <span className="sal-pawns">
                      {occupants.map((p) => (
                        <Token
                          key={p}
                          player={p}
                          variant="pawn"
                          size="sm"
                          testId={`sal-pawn-${p}`}
                          label={`Player ${Number(p) + 1}`}
                        />
                      ))}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      }
      actions={<ActionSurface label="Snakes and Ladders actions" actions={surfaceActions} />}
    />
  );
}
