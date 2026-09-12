import type { BoardProps } from 'boardgame.io/react';
import { useMemo, useState } from 'react';
import { SoloLeaderboardShell } from '../../components/SoloLeaderboardShell';
import { StatusBar } from '../../components/StatusBar';
import type { StatusTone } from '../../lib/matchStatus';
import type { SubmitScoreInput } from '../../lib/scores';
import {
  canPlayFuel,
  canPlayReady,
  canPlaySatellite,
  crawlerReady,
  fuelPlayedValue,
  fuelRequiredFor,
  HAZARD_ROUNDS,
  type HazardKind,
  MAX_BOOSTERS,
  type OrbitsArea,
  type OrbitsCard,
} from './cards';
import { MAX_FAILURES, type OrbitsState } from './game';

const HAZARD_LABELS: Record<HazardKind, string> = {
  'design-failure': 'Design failure',
  weather: 'Weather',
  engine: 'Engine flameout',
  junk: 'Space junk',
};

function describeCard(card: OrbitsCard): string {
  switch (card.kind) {
    case 'fuel':
      return `Fuel ${card.fuel}`;
    case 'booster':
      return 'Booster (fuel 200, scores 100)';
    case 'satellite':
      return `${card.name} - ${card.orbit}, fuel ${card.fuelRequired}`;
    case 'ready':
      return 'Ready for takeoff';
    case 'countermeasure':
      return `${card.counter} (counters ${HAZARD_LABELS[card.resolves]})`;
    case 'upgrade':
      return `${card.upgrade} (counters ${HAZARD_LABELS[card.resolves]})`;
  }
}

function cardTestId(id: string): string {
  return id.replace(/[^a-z0-9-]/gi, '-');
}

export function OrbitsBoard({ G, ctx, moves, isActive, playerID }: BoardProps<OrbitsState>) {
  const [tab, setTab] = useState<'play' | 'scores'>('play');
  const p = Number(playerID ?? 0);
  const area: OrbitsArea = G.areas[p];
  const hand = G.hands[p];
  const launch = G.launch;
  const gameover = ctx.gameover as { score: number; reason: string } | undefined;
  const playable = Boolean(isActive && !gameover);

  const mainPhase = playable && !launch && !G.refillPending;
  const canAct = mainPhase && G.drewThisTurn;

  const pendingSubmit = useMemo((): SubmitScoreInput | null => {
    if (!gameover) return null;
    return { score: gameover.score, moves: G.turns, meta: { reason: gameover.reason } };
  }, [gameover, G.turns]);

  // Solo programme chrome - not the multiplayer turn/win shape of useMatchStatus.
  let status = G.drewThisTurn ? 'Play a card, declare the crawler, or discard' : 'Draw a card';
  let tone: StatusTone = 'you';
  if (gameover) {
    tone = 'done';
    status =
      gameover.reason === 'failures'
        ? `Programme cancelled after ${MAX_FAILURES} failed rockets - score ${gameover.score}`
        : `Deck exhausted - score ${gameover.score}`;
  } else if (G.refillPending) {
    status = 'Launch turn complete - refill your hand';
  } else if (launch) {
    tone = 'wait';
    status = launch.pending
      ? `Hazard: ${HAZARD_LABELS[launch.pending.hazard]}${
          launch.pending.countermeasureOnly ? ' (countermeasure only)' : ''
        }`
      : `Launch round ${launch.round + 1} of ${HAZARD_ROUNDS.length}: ${
          HAZARD_ROUNDS[launch.round] ? HAZARD_LABELS[HAZARD_ROUNDS[launch.round]] : 'clear'
        }`;
  }

  const playedFuel = fuelPlayedValue(area);
  const requiredFuel = fuelRequiredFor(area.satellites);

  return (
    <SoloLeaderboardShell
      gameId="orbits"
      pendingSubmit={pendingSubmit}
      tab={tab}
      onTabChange={setTab}
      testIdPrefix="orbits"
      info={
        <>
          <div className="orbits-scoreline" data-testid="orbits-score">
            Score {G.scores[p]} - Failures {G.failures}/{MAX_FAILURES} - Deck {G.deck.length}
          </div>
          <StatusBar text={status} tone={tone} />
        </>
      }
      board={
        <div className="orbits-board" data-testid="orbits-board">
          <section className="orbits-zone" aria-label="Rocket stack">
            <h3>
              Stack{area.onCrawler ? ' (on the crawler)' : ''} - fuel {playedFuel}/
              {requiredFuel || 0}
            </h3>
            {area.satellites.length === 0 &&
            area.fuel.length === 0 &&
            area.upgrades.length === 0 ? (
              <p className="orbits-empty">No rocket on the pad yet.</p>
            ) : (
              <ul className="orbits-cards">
                {area.satellites.map((c) => (
                  <li key={c.id} className="orbits-card orbits-satellite">
                    {describeCard(c)}
                  </li>
                ))}
                {area.fuel.map((c) => (
                  <li key={c.id} className="orbits-card orbits-fuel">
                    {describeCard(c)}
                  </li>
                ))}
                {area.upgrades.map((u) => (
                  <li
                    key={u.card.id}
                    className={`orbits-card orbits-upgrade${u.revealed ? ' is-revealed' : ''}`}
                  >
                    {u.revealed ? describeCard(u.card) : 'Upgrade (face down)'}
                  </li>
                ))}
              </ul>
            )}
            {mainPhase && !area.onCrawler ? (
              <button
                type="button"
                className="btn"
                data-testid="orbits-crawler"
                disabled={!canAct || !crawlerReady(area)}
                onClick={() => moves.declareCrawler()}
              >
                Declare on the crawler
              </button>
            ) : null}
          </section>

          {G.refillPending && playable ? (
            <section className="orbits-zone" aria-label="Refill hand">
              <h3>Refill</h3>
              <div className="orbits-controls">
                <button
                  type="button"
                  className="btn primary"
                  data-testid="orbits-refill-keep"
                  onClick={() => moves.refillHand(false)}
                >
                  Keep hand and draw up
                </button>
                <button
                  type="button"
                  className="btn"
                  data-testid="orbits-refill-discard"
                  onClick={() => moves.refillHand(true)}
                >
                  Discard hand and redraw
                </button>
              </div>
            </section>
          ) : null}

          {launch && playable ? (
            <section className="orbits-zone" aria-label="Launch">
              <h3>Launch</h3>
              {launch.pending ? (
                <div className="orbits-controls">
                  {hand
                    .filter(
                      (c) => c.kind === 'countermeasure' && c.resolves === launch.pending?.hazard,
                    )
                    .map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="btn primary"
                        data-testid={`orbits-counter-${cardTestId(c.id)}`}
                        onClick={() => moves.resolveWithCountermeasure(c.id)}
                      >
                        Play {describeCard(c)}
                      </button>
                    ))}
                  {!launch.pending.countermeasureOnly
                    ? area.upgrades
                        .filter((u) => !u.revealed && u.card.resolves === launch.pending?.hazard)
                        .map((u) => (
                          <button
                            key={u.card.id}
                            type="button"
                            className="btn"
                            data-testid={`orbits-flip-${cardTestId(u.card.id)}`}
                            onClick={() => moves.resolveWithUpgrade(u.card.id)}
                          >
                            Reveal {u.card.upgrade}
                          </button>
                        ))
                    : null}
                  {!launch.pending.countermeasureOnly
                    ? hand
                        .filter(
                          (c) => c.kind === 'upgrade' && c.resolves === launch.pending?.hazard,
                        )
                        .map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            className="btn"
                            data-testid={`orbits-faceup-${cardTestId(c.id)}`}
                            onClick={() => moves.playUpgradeFaceUp(c.id)}
                          >
                            Play {describeCard(c)} face up
                          </button>
                        ))
                    : null}
                  {launch.pending.hazard === 'design-failure'
                    ? [...area.fuel, ...area.upgrades.map((u) => u.card)].map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className="btn"
                          data-testid={`orbits-fix-${cardTestId(c.id)}`}
                          onClick={() => moves.resolveDesignFailure(c.id)}
                        >
                          Fix: discard {describeCard(c)}
                        </button>
                      ))
                    : null}
                </div>
              ) : (
                <button
                  type="button"
                  className="btn primary"
                  data-testid="orbits-roll"
                  onClick={() => moves.rollHazard()}
                >
                  Roll for hazards
                </button>
              )}
              <button
                type="button"
                className="btn"
                data-testid="orbits-abort"
                onClick={() => moves.abortLaunch()}
              >
                Abort launch
              </button>
            </section>
          ) : null}

          <section className="orbits-zone" aria-label="Hand">
            <h3>Hand ({hand.length})</h3>
            {mainPhase && !G.drewThisTurn ? (
              <button
                type="button"
                className="btn primary"
                data-testid="orbits-draw"
                onClick={() => moves.drawCard()}
              >
                Draw a card
              </button>
            ) : null}
            <ul className="orbits-cards">
              {hand.map((c) => {
                const playableNow =
                  canAct &&
                  ((c.kind === 'satellite' && canPlaySatellite(area, c)) ||
                    ((c.kind === 'fuel' || c.kind === 'booster') && canPlayFuel(area, c)) ||
                    c.kind === 'upgrade' ||
                    (c.kind === 'ready' && canPlayReady(area, c)));
                return (
                  <li key={c.id} className="orbits-card">
                    <span>{describeCard(c)}</span>
                    {mainPhase ? (
                      <span className="orbits-card-actions">
                        <button
                          type="button"
                          className="btn"
                          data-testid={`orbits-play-${cardTestId(c.id)}`}
                          disabled={!playableNow}
                          onClick={() => moves.playCard(c.id)}
                        >
                          Play
                        </button>
                        <button
                          type="button"
                          className="btn"
                          data-testid={`orbits-discard-${cardTestId(c.id)}`}
                          disabled={!canAct}
                          onClick={() => moves.discardCard(c.id)}
                        >
                          Discard
                        </button>
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            <p className="orbits-hint">
              Boosters: max {MAX_BOOSTERS} per rocket. Same orbit only until the crawler.
            </p>
          </section>
        </div>
      }
    />
  );
}
