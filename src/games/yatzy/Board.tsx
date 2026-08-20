import type { BoardProps } from 'boardgame.io/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActionSurface } from '../../components/ActionSurface';
import { Roll } from '../../components/cinematic';
import { MatchScoreboard } from '../../components/MatchScoreboard';
import { PlayTable } from '../../components/PlayTable';
import { SoloLeaderboardShell } from '../../components/SoloLeaderboardShell';
import { StatusBar } from '../../components/StatusBar';
import { DiceTray } from '../../components/tabletop';
import type { SubmitScoreInput } from '../../lib/scores';
import { composeDieFaceArt, dieFaceArtMap, kenneyDieFaceAsset } from '../shared/dice';
import { getYatzyActions } from './actions';
import type { YatzyState } from './game';
import {
  CATEGORIES,
  grandTotal,
  type ScoringCategory,
  scoreFns,
  upperBonus,
  upperTotal,
} from './scoring';

/** Kenney d6 faces via shared dice slots (ADR Decision 5). */
const YATZY_FACE_ART = composeDieFaceArt(
  dieFaceArtMap({
    1: kenneyDieFaceAsset(1),
    2: kenneyDieFaceAsset(2),
    3: kenneyDieFaceAsset(3),
    4: kenneyDieFaceAsset(4),
    5: kenneyDieFaceAsset(5),
    6: kenneyDieFaceAsset(6),
  }),
);

function diceValuesChanged(prev: readonly number[], next: readonly number[]): boolean {
  if (prev.length !== next.length) return true;
  return prev.some((face, i) => face !== next[i]);
}

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
  const canHold = yourTurn && G.rolls > 0 && G.rolls < 3;
  const canScore = yourTurn && G.rolls > 0;
  const solo = ctx.numPlayers === 1;
  const [tab, setTab] = useState<'play' | 'scores'>('play');
  /** Client-only roll pulse; remounts Roll so motion never gates G. */
  const [rollPulse, setRollPulse] = useState(0);
  const prevRollsRef = useRef(G.rolls);
  const prevDiceRef = useRef<readonly number[]>(G.dice.slice());

  useEffect(() => {
    const rolled = G.rolls > prevRollsRef.current;
    const changed = diceValuesChanged(prevDiceRef.current, G.dice);
    if (rolled && changed) {
      setRollPulse((n) => n + 1);
    }
    prevRollsRef.current = G.rolls;
    prevDiceRef.current = G.dice.slice();
  }, [G.rolls, G.dice]);

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

  const pewActions = getYatzyActions({ rolls: G.rolls, yourTurn });
  const surfaceActions = pewActions.map((action) => ({
    ...action,
    onAction: () => {
      if (action.id === 'roll') moves.rollDice();
    },
  }));

  const info = (
    <>
      <StatusBar text={status} tone={tone} />
      <MatchScoreboard scores={[{ label: 'Roll', value: `${G.rolls}/3` }]} testId="yatzy-meta" />
    </>
  );

  const card = (
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
              {G.scores.map((scoreCard, i) => {
                const scored = scoreCard[meta.category];
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
            {G.scores.map((scoreCard, i) => (
              <td key={i}>{upperTotal(scoreCard)}</td>
            ))}
          </tr>
          <tr className="yatzy-sub">
            <th scope="row">Bonus</th>
            {G.scores.map((scoreCard, i) => (
              <td key={i}>{upperBonus(scoreCard)}</td>
            ))}
          </tr>
          <tr className="yatzy-total">
            <th scope="row">Total</th>
            {G.scores.map((scoreCard, i) => (
              <td key={i}>{grandTotal(scoreCard)}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );

  const pew = (
    <div className="yatzy-dice">
      <Roll key={rollPulse} active={rollPulse > 0} className="yatzy-dice__cinematic">
        <DiceTray
          dice={G.dice}
          held={G.held}
          disabled={!canHold}
          onToggle={(i) => moves.toggleDie(i)}
          faceArt={YATZY_FACE_ART}
          testId="yatzy-dice"
          testIdPrefix="yatzy-die"
          label="Dice"
        />
      </Roll>
    </div>
  );

  const actionSurface = <ActionSurface label="Yatzy actions" actions={surfaceActions} />;

  if (solo) {
    return (
      <SoloLeaderboardShell
        gameId="yatzy"
        pendingSubmit={pendingSubmit}
        tab={tab}
        onTabChange={setTab}
        testIdPrefix="yatzy"
        info={info}
        board={card}
        pew={pew}
        actions={actionSurface}
      />
    );
  }

  return <PlayTable info={info} board={card} pew={pew} actions={actionSurface} />;
}
