import type { BoardProps } from 'boardgame.io/react';
import { ActionSurface } from '../../components/ActionSurface';
import { PlayTable } from '../../components/PlayTable';
import { StatusBar } from '../../components/StatusBar';
import { DiceTray } from '../../components/tabletop';
import { deriveMatchStatus } from '../../lib/matchStatus';
import { getBackgammonActions } from './actions';
import { BAR, type BackgammonState, checkerCount, legalPlays, pointOwner } from './game';

function firstPlayFor(from: number, plays: ReturnType<typeof legalPlays>) {
  return plays.find((p) => p.from === from) ?? null;
}

export function BackgammonBoard({
  G,
  ctx,
  moves,
  playerID,
  isActive,
}: BoardProps<BackgammonState>) {
  const yourTurn = Boolean(isActive && !ctx.gameover);
  const plays = yourTurn ? legalPlays(G, ctx.currentPlayer) : [];
  const playableFrom = new Set(plays.map((p) => p.from));

  const { text: status, tone } = deriveMatchStatus(ctx, playerID, {
    isYourTurn: yourTurn,
    labels: {
      yourTurn: G.hasRolled
        ? plays.length === 0
          ? 'No legal moves - pass'
          : 'Your turn - play a die'
        : 'Your turn - roll the dice',
    },
  });

  const pewActions = getBackgammonActions({
    G,
    player: ctx.currentPlayer,
    yourTurn,
  });
  const surfaceActions = pewActions.map((action) => ({
    ...action,
    onAction: () => {
      if (action.id === 'roll') {
        moves.roll();
        return;
      }
      if (action.id === 'pass') {
        moves.pass();
        return;
      }
      const match = /^play-(\d+)-(\d+)$/.exec(action.id);
      if (match) moves.play(Number(match[1]), Number(match[2]));
    },
  }));

  const onPoint = (from: number) => {
    if (!yourTurn || !G.hasRolled) return;
    const play = firstPlayFor(from, plays);
    if (play) moves.play(play.from, play.dieIndex);
  };

  const renderPoint = (point: number) => {
    const value = G.points[point];
    const owner = pointOwner(value);
    const count = checkerCount(value);
    const open = playableFrom.has(point);
    return (
      <button
        key={point}
        type="button"
        className={[
          'bg-point',
          point % 2 === 0 ? 'bg-point-dark' : 'bg-point-light',
          open ? 'is-open' : '',
          owner === '0' ? 'has-p0' : '',
          owner === '1' ? 'has-p1' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        disabled={!open}
        data-testid={`backgammon-point-${point}`}
        onClick={() => onPoint(point)}
        aria-label={`Point ${point}${count ? `, ${count} checkers` : ', empty'}`}
      >
        <span className="bg-point-num">{point}</span>
        {count > 0 ? <span className="bg-point-count">{count}</span> : null}
      </button>
    );
  };

  const top = [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];
  const bottom = [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

  const barOpen = playableFrom.has(BAR);

  return (
    <PlayTable
      info={<StatusBar text={status} tone={tone} />}
      board={
        <div className="bg-wrap" data-testid="backgammon-board">
          <div className="bg-board" role="group" aria-label="Backgammon board">
            <div
              className="bg-bear"
              data-testid="backgammon-bear-1"
              role="status"
              aria-label={`P1 borne ${G.borne[1]}`}
            >
              <span className="bg-tray-label">P1 off</span>
              <span className="bg-tray-count">{G.borne[1]}</span>
            </div>

            <div className="bg-quads">
              <div className="bg-row bg-row-top">{top.map(renderPoint)}</div>
              <div className="bg-mid">
                <button
                  type="button"
                  className={`bg-bar${barOpen ? ' is-open' : ''}`}
                  data-testid="backgammon-bar"
                  disabled={!barOpen}
                  onClick={() => onPoint(BAR)}
                  aria-label={`Bar, P0 ${G.bar[0]}, P1 ${G.bar[1]}`}
                >
                  <span data-testid="backgammon-bar-0">P0:{G.bar[0]}</span>
                  <span data-testid="backgammon-bar-1">P1:{G.bar[1]}</span>
                </button>
                {G.hasRolled && G.dice.length > 0 ? (
                  <DiceTray dice={G.dice} disabled testId="backgammon-dice" />
                ) : (
                  <div className="bg-dice-slot" data-testid="backgammon-dice-empty">
                    {G.hasRolled ? 'No dice left' : 'Roll to start'}
                  </div>
                )}
              </div>
              <div className="bg-row bg-row-bottom">{bottom.map(renderPoint)}</div>
            </div>

            <div
              className="bg-bear"
              data-testid="backgammon-bear-0"
              role="status"
              aria-label={`P0 borne ${G.borne[0]}`}
            >
              <span className="bg-tray-label">P0 off</span>
              <span className="bg-tray-count">{G.borne[0]}</span>
            </div>
          </div>
        </div>
      }
      actions={<ActionSurface label="Backgammon actions" actions={surfaceActions} />}
    />
  );
}
