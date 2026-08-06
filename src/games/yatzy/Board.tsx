import type { BoardProps } from 'boardgame.io/react';
import { useMemo, useState } from 'react';
import { ActionSurface } from '../../components/ActionSurface';
import { LeaderboardPanel } from '../../components/LeaderboardPanel';
import { PlayTable } from '../../components/PlayTable';
import { ScoreSubmitter } from '../../components/ScoreSubmitter';
import { StatusBar } from '../../components/StatusBar';
import type { SubmitScoreInput } from '../../lib/scores';
import type { YatzyState } from './game';
import {
  CATEGORIES,
  grandTotal,
  type ScoringCategory,
  scoreFns,
  upperBonus,
  upperTotal,
} from './scoring';

export function YatzyBoard({
  G,
  ctx,
  moves,
  playerID,
  matchData,
  isActive,
}: BoardProps<YatzyState>) {
  const yourTurn = Boolean(isActive && !ctx.gameover);
  const pid =
    playerID === null || playerID === undefined ? Number(ctx.currentPlayer) : Number(playerID);
  const canRoll = yourTurn && G.rolls < 3;
  const canHold = yourTurn && G.rolls > 0 && G.rolls < 3;
  const canScore = yourTurn && G.rolls > 0;
  const solo = ctx.numPlayers === 1;
  const [tab, setTab] = useState<'play' | 'scores'>('play');

  const pendingSubmit = useMemo((): SubmitScoreInput | null => {
    if (!solo || !ctx.gameover) return null;
    const over = ctx.gameover as { totals: number[] };
    return { score: over.totals[0] ?? grandTotal(G.scores[0]) };
  }, [G.scores, ctx.gameover, solo]);

  let status = 'Waiting…';
  let tone: 'neutral' | 'you' | 'wait' | 'done' = 'wait';
  if (ctx.gameover) {
    tone = 'done';
    const over = ctx.gameover as { winner?: string; draw?: boolean; totals: number[] };
    if (over.draw) status = 'Draw';
    else if (solo) status = `Finished — ${over.totals[0]} pts`;
    else if (over.winner === String(pid) || over.winner === playerID)
      status = `You win — ${over.totals[pid]} pts`;
    else status = `Player ${Number(over.winner) + 1} wins`;
  } else if (yourTurn) {
    tone = 'you';
    status =
      G.rolls === 0
        ? 'Your turn — roll the dice'
        : G.rolls < 3
          ? 'Hold dice or score a category'
          : 'Choose a score category';
  } else {
    status = `Player ${Number(ctx.currentPlayer) + 1}'s turn`;
  }

  const seatLabel = (i: number) => {
    const name = matchData?.[i]?.name;
    return name?.trim() || `P${i + 1}`;
  };

  const showPlayChrome = !solo || tab === 'play';

  return (
    <>
      {solo ? <ScoreSubmitter gameId="yatzy" pendingSubmit={pendingSubmit} /> : null}
      <PlayTable
        info={
          <>
            <StatusBar text={status} tone={tone} />
            <div className="play-table__meta" data-testid="yatzy-meta">
              <span>Roll {G.rolls}/3</span>
            </div>
            {solo ? (
              <div className="lw-tabs">
                <button
                  type="button"
                  className={`btn${tab === 'play' ? ' is-active' : ''}`}
                  data-testid="yatzy-tab-play"
                  onClick={() => setTab('play')}
                >
                  Play
                </button>
                <button
                  type="button"
                  className={`btn${tab === 'scores' ? ' is-active' : ''}`}
                  data-testid="yatzy-tab-scores"
                  onClick={() => setTab('scores')}
                >
                  Scores
                </button>
              </div>
            ) : null}
          </>
        }
        board={
          solo && tab === 'scores' ? (
            <LeaderboardPanel gameId="yatzy" testIdPrefix="yatzy" />
          ) : (
            <div className="yatzy-card-wrap">
              <table className="yatzy-card" data-testid="yatzy-card">
                <thead>
                  <tr>
                    <th scope="col">Category</th>
                    {G.scores.map((_, i) => (
                      <th
                        key={i}
                        scope="col"
                        className={i === Number(ctx.currentPlayer) ? 'is-active' : ''}
                      >
                        {seatLabel(i)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CATEGORIES.map((meta) => (
                    <tr key={meta.category}>
                      <th scope="row">{meta.name}</th>
                      {G.scores.map((card, i) => {
                        const scored = card[meta.category];
                        const isYou = i === pid && canScore && scored === null;
                        if (isYou) {
                          const preview = scoreFns[meta.category as ScoringCategory](G.dice);
                          return (
                            <td key={i}>
                              <button
                                type="button"
                                className="yatzy-score-btn"
                                data-testid={`yatzy-score-${meta.category}`}
                                onClick={() => moves.selectScore(meta.category)}
                              >
                                {preview}
                              </button>
                            </td>
                          );
                        }
                        return (
                          <td key={i} className={scored === null ? 'is-empty' : ''}>
                            {scored === null ? '—' : scored}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  <tr className="yatzy-sub">
                    <th scope="row">Upper</th>
                    {G.scores.map((card, i) => (
                      <td key={i}>{upperTotal(card)}</td>
                    ))}
                  </tr>
                  <tr className="yatzy-sub">
                    <th scope="row">Bonus</th>
                    {G.scores.map((card, i) => (
                      <td key={i}>{upperBonus(card)}</td>
                    ))}
                  </tr>
                  <tr className="yatzy-total">
                    <th scope="row">Total</th>
                    {G.scores.map((card, i) => (
                      <td key={i}>{grandTotal(card)}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )
        }
        pew={
          showPlayChrome ? (
            <div className="yatzy-dice" data-testid="yatzy-dice">
              {G.dice.map((face, i) => {
                const held = G.held[i];
                return (
                  <button
                    key={i}
                    type="button"
                    className={`yatzy-die${held ? ' is-held' : ''}`}
                    disabled={!canHold}
                    data-testid={`yatzy-die-${i}`}
                    onClick={() => moves.toggleDie(i)}
                    aria-pressed={held}
                    aria-label={`Die ${i + 1}: ${face}${held ? ', held' : ''}`}
                  >
                    {face}
                  </button>
                );
              })}
            </div>
          ) : null
        }
        actions={
          showPlayChrome ? (
            <ActionSurface
              label="Yatzy actions"
              actions={[
                {
                  id: 'roll',
                  kind: 'roll',
                  label: `Roll (${G.rolls}/3)`,
                  variant: 'primary',
                  disabled: !canRoll,
                  disabledReason: yourTurn ? 'No rolls left this turn' : 'Wait for your turn',
                  testId: 'yatzy-roll',
                  onAction: () => moves.rollDice(),
                },
              ]}
            />
          ) : null
        }
      />
    </>
  );
}
