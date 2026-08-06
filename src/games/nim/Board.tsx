import type { BoardProps } from 'boardgame.io/react';
import { ActionSurface } from '../../components/ActionSurface';
import { PlayTable } from '../../components/PlayTable';
import { StatusBar } from '../../components/StatusBar';
import { Counter, Token } from '../../components/tabletop';
import { deriveMatchStatus } from '../../lib/matchStatus';
import { getNimActions } from './actions';
import type { NimState } from './game';

/** Cap visual tokens so a full heap stays compact on phone. */
const VISUAL_TOKEN_CAP = 13;

export function NimBoard({ G, ctx, moves, playerID, isActive }: BoardProps<NimState>) {
  const yourTurn = Boolean(isActive && !ctx.gameover);
  const { text: status, tone } = deriveMatchStatus(ctx, playerID, {
    isYourTurn: yourTurn,
    labels: { yourTurn: 'Your turn - take 1 to 3 stones' },
  });

  const pewActions = getNimActions({ G, yourTurn });
  const surfaceActions = pewActions.map((action) => ({
    ...action,
    onAction: () => {
      const match = /^take-(\d+)$/.exec(action.id);
      if (match) moves.take(Number(match[1]));
    },
  }));

  const tokenCount = Math.min(G.heap, VISUAL_TOKEN_CAP);

  return (
    <PlayTable
      info={<StatusBar text={status} tone={tone} />}
      board={
        <div className="nim-table" data-testid="nim-board">
          <Counter value={G.heap} label="Stones left" emphasize testId="nim-count" />
          <div
            className="nim-pile"
            role="group"
            aria-label={`${G.heap} stones in the heap`}
            data-testid="nim-pile"
          >
            {Array.from({ length: tokenCount }, (_, i) => (
              <Token
                key={i}
                player="0"
                variant="chip"
                size="sm"
                label={`Stone ${i + 1}`}
                testId={`nim-stone-${i}`}
              />
            ))}
          </div>
        </div>
      }
      actions={<ActionSurface label="Nim actions" actions={surfaceActions} />}
    />
  );
}
