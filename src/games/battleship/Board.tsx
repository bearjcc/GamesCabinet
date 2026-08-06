import type { BoardProps } from 'boardgame.io/react';
import { useState } from 'react';
import { ActionSurface } from '../../components/ActionSurface';
import { PlayTable } from '../../components/PlayTable';
import { StatusBar } from '../../components/StatusBar';
import { deriveMatchStatus } from '../../lib/matchStatus';
import { getBattleshipActions } from './actions';
import {
  type BattleshipState,
  isLegalPlacement,
  nextShipId,
  type Orientation,
  SHIP_LENGTHS,
  type Shot,
} from './game';

function opponent(player: string): string {
  return player === '0' ? '1' : '0';
}

function cellLabel(shot: Shot, hasShip: boolean): string {
  if (shot === 'sunk') return 'Sunk';
  if (shot === 'hit') return 'Hit';
  if (shot === 'miss') return 'Miss';
  if (hasShip) return 'Ship';
  return 'Empty';
}

export function BattleshipBoard({
  G,
  ctx,
  moves,
  playerID,
  isActive,
}: BoardProps<BattleshipState>) {
  const [orientation, setOrientation] = useState<Orientation>('H');
  const yourTurn = Boolean(isActive && !ctx.gameover);
  const player = playerID ?? ctx.currentPlayer;
  const phase = ctx.phase;
  const own = G.boards[player] ?? G.boards['0'];
  const opp = G.boards[opponent(player)] ?? G.boards['1'];
  const ownShipCells = new Set(own.ships.flatMap((s) => s.cells));
  const nextId = phase === 'setup' ? nextShipId(own) : null;

  const { text: status, tone } = deriveMatchStatus(ctx, playerID, {
    isYourTurn: yourTurn,
    labels: {
      yourTurn:
        phase === 'setup'
          ? own.ready
            ? 'Fleet ready - waiting for opponent'
            : nextId !== null
              ? `Place ship (${SHIP_LENGTHS[nextId]} long)`
              : 'Confirm when ready'
          : 'Your turn - fire',
      theirTurn:
        phase === 'setup'
          ? own.ready
            ? 'Fleet ready - waiting for opponent'
            : 'Opponent is placing ships'
          : 'Their turn',
    },
  });

  const pewActions = getBattleshipActions({
    G,
    player,
    yourTurn,
    phase,
    orientation,
  });
  const surfaceActions = pewActions.map((action) => ({
    ...action,
    onAction: () => {
      if (action.id === 'rotate') {
        setOrientation((o) => (o === 'H' ? 'V' : 'H'));
        return;
      }
      if (action.id === 'confirmSetup') {
        moves.confirmSetup();
      }
    },
  }));

  const canPlace = phase === 'setup' && yourTurn && !own.ready && nextId !== null;
  const canFire = phase === 'battle' && yourTurn;

  return (
    <PlayTable
      info={<StatusBar text={status} tone={tone} />}
      board={
        <div className="battleship-board" data-testid="battleship-board">
          <div className="battleship-grid-wrap">
            <div className="battleship-grid-label">Your fleet</div>
            <div
              className="battleship-grid"
              role="grid"
              aria-label="Your fleet"
              data-testid="battleship-own"
            >
              {own.shots.map((shot, i) => {
                const hasShip = ownShipCells.has(i);
                const placeOk =
                  canPlace &&
                  nextId !== null &&
                  isLegalPlacement(own.ships, nextId, i, orientation);
                return (
                  <button
                    key={`own-${i}`}
                    type="button"
                    className={[
                      'battleship-cell',
                      hasShip ? 'is-ship' : '',
                      shot ? `is-${shot}` : '',
                      placeOk ? 'is-open' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    disabled={!placeOk}
                    data-testid={`battleship-cell-own-${i}`}
                    onClick={() => {
                      if (canPlace && nextId !== null) {
                        moves.placeShip(nextId, i, orientation);
                      }
                    }}
                    aria-label={`${cellLabel(shot, hasShip)} own ${i}`}
                  />
                );
              })}
            </div>
          </div>

          <div className="battleship-grid-wrap">
            <div className="battleship-grid-label">Opponent waters</div>
            <div
              className="battleship-grid"
              role="grid"
              aria-label="Opponent waters"
              data-testid="battleship-opp"
            >
              {opp.shots.map((shot, i) => {
                const open = canFire && shot === null;
                return (
                  <button
                    key={`opp-${i}`}
                    type="button"
                    className={['battleship-cell', shot ? `is-${shot}` : '', open ? 'is-open' : '']
                      .filter(Boolean)
                      .join(' ')}
                    disabled={!open}
                    data-testid={`battleship-cell-opp-${i}`}
                    onClick={() => {
                      if (open) moves.fire(i);
                    }}
                    aria-label={`${cellLabel(shot, false)} opponent ${i}`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      }
      actions={
        surfaceActions.length > 0 ? (
          <ActionSurface label="Battleship actions" actions={surfaceActions} />
        ) : null
      }
    />
  );
}
