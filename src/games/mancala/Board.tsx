import type { BoardProps } from 'boardgame.io/react';
import { PlayTable } from '../../components/PlayTable';
import { StatusBar } from '../../components/StatusBar';
import { Token } from '../../components/tabletop';
import { deriveMatchStatus } from '../../lib/matchStatus';
import type { MancalaState } from './game';
import { ownPits, P0_STORE, P1_STORE } from './game';

const PIT_STONE_CAP = 10;
const STORE_STONE_CAP = 14;

function StonePile({ count, cap }: { count: number; cap: number }) {
  const shown = Math.min(count, cap);
  return (
    <span className="mancala-stones" aria-hidden>
      {Array.from({ length: shown }, (_, n) => (
        <Token key={n} player="0" variant="chip" size="sm" />
      ))}
    </span>
  );
}

export function MancalaBoard({ G, ctx, moves, playerID }: BoardProps<MancalaState>) {
  const yourTurn = playerID !== null && ctx.currentPlayer === playerID && !ctx.gameover;
  const { text: status, tone } = deriveMatchStatus(ctx, playerID, {
    isYourTurn: yourTurn,
    labels: { yourTurn: 'Your turn — tap a pit' },
  });

  const playable = new Set(yourTurn ? ownPits(ctx.currentPlayer) : []);

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
        <StonePile count={G.pits[i]} cap={PIT_STONE_CAP} />
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
      <span className="mancala-store__label">{label}</span>
      <StonePile count={G.pits[i]} cap={STORE_STONE_CAP} />
    </div>
  );

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
    />
  );
}
