import type { BoardProps } from 'boardgame.io/react';
import { ActionSurface } from '../../components/ActionSurface';
import { PlayTable } from '../../components/PlayTable';
import { StatusBar } from '../../components/StatusBar';
import { Counter } from '../../components/tabletop';
import { deriveMatchStatus } from '../../lib/matchStatus';
import { getMancalaActions } from './actions';
import type { MancalaState } from './game';
import { ownPits, P0_STORE, P1_STORE } from './game';

export function MancalaBoard({ G, ctx, moves, playerID }: BoardProps<MancalaState>) {
  const yourTurn = playerID !== null && ctx.currentPlayer === playerID && !ctx.gameover;
  const player = playerID ?? ctx.currentPlayer;
  const { text: status, tone } = deriveMatchStatus(ctx, playerID, {
    isYourTurn: yourTurn,
    labels: { yourTurn: 'Your turn - tap a pit' },
  });

  const playable = new Set(yourTurn ? ownPits(ctx.currentPlayer) : []);

  const pewActions = getMancalaActions({ G, player, yourTurn });
  const surfaceActions = pewActions.map((action) => ({
    ...action,
    onAction: () => {
      const match = /^sow-(\d+)$/.exec(action.id);
      if (match) moves.sow(Number(match[1]));
    },
  }));

  const pitButton = (i: number) => {
    const canSow = playable.has(i) && G.pits[i] > 0;
    return (
      <button
        key={i}
        type="button"
        className={`mancala-pit${canSow ? ' is-open' : ''}`}
        disabled={!canSow}
        data-testid={`mancala-pit-${i}`}
        onClick={() => moves.sow(i)}
        aria-label={`Pit ${i}, ${G.pits[i]} stones`}
      >
        <Counter value={G.pits[i]} label={`Pit ${i}`} />
      </button>
    );
  };

  const store = (i: number, label: string) => (
    <div
      className="mancala-store"
      data-testid={`mancala-store-${i === P0_STORE ? 0 : 1}`}
      role="status"
      aria-label={`${label} store, ${G.pits[i]} stones`}
    >
      <Counter value={G.pits[i]} label={label} emphasize />
    </div>
  );

  // Visual layout (P0 at bottom): P1 pits 12..7 left-to-right, stores on ends, P0 pits 0..5
  return (
    <PlayTable
      info={<StatusBar text={status} tone={tone} />}
      board={
        <div
          className="mancala-board"
          data-testid="mancala-board"
          role="group"
          aria-label="Mancala board"
        >
          {store(P1_STORE, 'P1')}
          <div className="mancala-rows">
            <div className="mancala-row mancala-row-p1">{[12, 11, 10, 9, 8, 7].map(pitButton)}</div>
            <div className="mancala-row mancala-row-p0">{[0, 1, 2, 3, 4, 5].map(pitButton)}</div>
          </div>
          {store(P0_STORE, 'P0')}
        </div>
      }
      actions={<ActionSurface label="Mancala actions" actions={surfaceActions} />}
    />
  );
}
