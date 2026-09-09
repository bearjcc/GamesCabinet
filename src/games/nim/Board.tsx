import type { BoardProps } from 'boardgame.io/react';
import { PlayTable } from '../../components/PlayTable';
import { StatusBar } from '../../components/StatusBar';
import { Counter, Token } from '../../components/tabletop';
import { controlA11y } from '../../lib/actions';
import { deriveMatchStatus } from '../../lib/matchStatus';
import type { NimState } from './game';
import { legalTakes, MAX_TAKE } from './game';

/** Cap visual tokens so a full heap stays compact on phone. */
const VISUAL_TOKEN_CAP = 13;

export function NimBoard({ G, ctx, moves, playerID, isActive }: BoardProps<NimState>) {
  const yourTurn = Boolean(isActive && !ctx.gameover);
  const { text: status, tone } = deriveMatchStatus(ctx, playerID, {
    isYourTurn: yourTurn,
    labels: { yourTurn: 'Your turn - take 1 to 3 stones' },
  });

  const tokenCount = Math.min(G.heap, VISUAL_TOKEN_CAP);
  const legal = new Set(legalTakes(G.heap));

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
            {Array.from({ length: tokenCount }, (_, i) => {
              const takeN = i + 1;
              const can = yourTurn && takeN <= MAX_TAKE && legal.has(takeN);
              const a11y = controlA11y({
                label: `Take ${takeN} stone${takeN === 1 ? '' : 's'}`,
                disabled: !can,
                disabledReason: yourTurn ? 'Not enough stones' : 'Wait for your turn',
              });
              return (
                <button
                  key={i}
                  type="button"
                  className={`nim-stone${can ? ' is-open' : ''}`}
                  disabled={!can}
                  data-testid={`nim-stone-${i}`}
                  title={a11y.title}
                  aria-label={a11y.ariaLabel}
                  onClick={() => moves.take(takeN)}
                >
                  <Token player="0" variant="chip" size="sm" label={`Stone ${i + 1}`} />
                </button>
              );
            })}
          </div>
        </div>
      }
    />
  );
}
