import type { BoardProps } from 'boardgame.io/react';
import { useMemo, useState } from 'react';
import { MatchScoreboard } from '../../components/MatchScoreboard';
import { PlayTable } from '../../components/PlayTable';
import { StatusBar } from '../../components/StatusBar';
import type { StatusTone } from '../../lib/matchStatus';
import { AgencyWordmark } from './AgencyWordmark';
import {
  type AgencyState,
  canAssignPerson,
  canBuyCard,
  canContribute,
  canPlaceFacility,
  canPlayCard,
  missionThreshold,
} from './actions';
import {
  cardDef,
  ERA_TARGET_SOLO,
  EXPLORER_I,
  facilityStaffedPassive,
  facilityStaffSlots,
} from './cards';
import { PersonCard } from './PersonCard';
import { PlayCard } from './PlayCard';
import { isPersonCard } from './personData';

type SelectMode = { kind: 'none' } | { kind: 'person'; cardId: string };

export function AgencyBoard({ G, ctx, moves, isActive }: BoardProps<AgencyState>) {
  const [select, setSelect] = useState<SelectMode>({ kind: 'none' });
  const playable = Boolean(isActive && !ctx.gameover);
  const gameover = ctx.gameover as { winner?: string; eraScore?: number } | undefined;

  const need = useMemo(() => missionThreshold(G.mission, G.facilities), [G.mission, G.facilities]);

  const canCommit =
    playable && (G.funding > 0 || G.innovation > 0) && canContribute(G, G.funding, G.innovation);

  let status = 'Play cards, place facilities, staff them, fund the mission, or buy from the row.';
  let tone: StatusTone = 'you';
  if (gameover) {
    tone = 'done';
    status =
      gameover.winner === 'player'
        ? `Era won — ${gameover.eraScore ?? G.eraScore} era points`
        : `Rival reached the Moon first — you scored ${gameover.eraScore ?? G.eraScore}`;
  } else if (!playable) {
    tone = 'wait';
    status = 'Waiting…';
  } else if (select.kind === 'person') {
    status = 'Tap a facility — assigned people stay and grant bonuses each turn.';
  } else if (canCommit) {
    status = 'Tap the mission to commit your Funding and Innovation.';
  }

  const pickCard = (cardId: string) => {
    if (!playable) return;
    const def = cardDef(cardId);
    if (!def) return;
    if (def.kind === 'facility') {
      if (canPlaceFacility(G, cardId)) {
        moves.placeFacility(cardId);
      }
      return;
    }
    if (def.kind === 'person') {
      setSelect({ kind: 'person', cardId });
      return;
    }
    if (canPlayCard(G, cardId)) {
      moves.playCard(cardId);
      setSelect({ kind: 'none' });
    }
  };

  const pickFacility = (instanceId: string) => {
    if (!playable || select.kind !== 'person') return;
    if (canAssignPerson(G, select.cardId, instanceId)) {
      moves.assignPerson(select.cardId, instanceId);
      setSelect({ kind: 'none' });
    }
  };

  const pickMarket = (index: number) => {
    if (!playable) return;
    if (canBuyCard(G, index)) {
      moves.buyCard(index);
    }
  };

  const commitToMission = () => {
    if (!canCommit) return;
    moves.contribute(G.funding, G.innovation);
  };

  const info = (
    <>
      <AgencyWordmark variant="play" />
      <span data-testid="agency-status">
        <StatusBar text={status} tone={tone} />
      </span>
      <MatchScoreboard
        testId="agency-meta"
        scores={[
          { label: 'Era', value: `${G.eraScore}/${ERA_TARGET_SOLO}` },
          { label: 'Rival', value: `${G.rivalScore}/${ERA_TARGET_SOLO}` },
          { label: 'Funding', value: String(G.funding) },
          { label: 'Innovation', value: String(G.innovation) },
        ]}
      />
    </>
  );

  const board = (
    <div className="agency-board" data-testid="agency-board">
      <section className="agency-zone agency-zone--mission" aria-label="Mission">
        <h3 className="agency-zone__title">{EXPLORER_I.name}</h3>
        <p className="agency-mission__need">
          Needs {need.funding} Funding and {need.innovation} Innovation on the mission.
        </p>
        <button
          type="button"
          className={`agency-mission${canCommit ? ' is-legal' : ''}`}
          data-testid="agency-mission"
          disabled={!canCommit}
          onClick={commitToMission}
          aria-label={
            canCommit
              ? `Commit ${G.funding} Funding and ${G.innovation} Innovation to the mission`
              : 'Mission progress'
          }
        >
          <div className="agency-mission__track">
            <span className="agency-mission__meter agency-mission__meter--funding">
              Funding {G.mission.fundingPlaced}/{need.funding}
              {G.funding > 0 ? ` (+${G.funding} ready)` : ''}
            </span>
            <span className="agency-mission__meter agency-mission__meter--innovation">
              Innovation {G.mission.innovationPlaced}/{need.innovation}
              {G.innovation > 0 ? ` (+${G.innovation} ready)` : ''}
            </span>
          </div>
          {canCommit ? <span className="agency-mission__hint">Tap to commit tokens</span> : null}
        </button>
      </section>

      <section className="agency-zone" aria-label="Facilities">
        <h3 className="agency-zone__title">Facilities</h3>
        <div className="agency-facilities">
          {G.facilities.map((facility) => {
            const def = cardDef(facility.cardId);
            const slots = facilityStaffSlots(facility.cardId);
            const staffCount = facility.assigned.length;
            const passive = facilityStaffedPassive(facility.cardId, staffCount);
            const highlight =
              select.kind === 'person' && canAssignPerson(G, select.cardId, facility.instanceId);
            return (
              <button
                key={facility.instanceId}
                type="button"
                className={`agency-facility${highlight ? ' is-legal' : ''}${staffCount > 0 ? ' is-staffed' : ''}`}
                data-testid={`agency-facility-${facility.instanceId}`}
                disabled={!highlight}
                onClick={() => pickFacility(facility.instanceId)}
              >
                <span className="agency-facility__name">{def?.name ?? facility.cardId}</span>
                {passive ? <span className="agency-facility__passive">{passive}</span> : null}
                <ul className="agency-facility__slots">
                  {Array.from({ length: slots }, (_, slot) => {
                    const personId = facility.assigned[slot];
                    return (
                      <li key={slot} className="agency-slot">
                        {personId ? <PersonCard cardId={personId} size="slot" /> : 'Empty slot'}
                      </li>
                    );
                  })}
                </ul>
              </button>
            );
          })}
        </div>
      </section>

      <section className="agency-zone" aria-label="Market row">
        <h3 className="agency-zone__title">Market</h3>
        <ul className="agency-market">
          {G.market.map((cardId, index) => {
            if (!cardId) {
              return (
                <li key={index} className="agency-market__empty">
                  Empty
                </li>
              );
            }
            const affordable = canBuyCard(G, index);
            const person = isPersonCard(cardId);
            return (
              <li key={`${cardId}-${index}`}>
                <button
                  type="button"
                  className={`agency-card-btn agency-card-btn--market${affordable && playable ? ' is-legal' : ''}`}
                  data-testid={`agency-market-${index}`}
                  disabled={!playable || !affordable}
                  onClick={() => pickMarket(index)}
                >
                  {person ? (
                    <PersonCard cardId={cardId} size="market" />
                  ) : (
                    <PlayCard cardId={cardId} size="market" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );

  const pew = (
    <ul className="agency-hand" data-testid="agency-hand">
      {G.hand.map((cardId, index) => {
        const def = cardDef(cardId);
        const selected = select.kind === 'person' && select.cardId === cardId;
        const canPlace = playable && canPlaceFacility(G, cardId);
        const canPlay = playable && canPlayCard(G, cardId);
        const interactive = canPlace || canPlay || def?.kind === 'person';
        const person = isPersonCard(cardId);
        return (
          <li key={`${cardId}-${index}`}>
            <button
              type="button"
              className={`agency-card-btn agency-card-btn--hand${selected ? ' is-selected' : ''}${interactive ? ' is-legal' : ''}`}
              data-testid={`agency-hand-${cardId}`}
              disabled={!interactive}
              onClick={() => pickCard(cardId)}
            >
              {person ? (
                <PersonCard cardId={cardId} size="hand" />
              ) : (
                <PlayCard cardId={cardId} size="hand" />
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );

  const actions = playable ? (
    <button
      type="button"
      className="btn btn--primary"
      data-testid="agency-end-turn"
      onClick={() => moves.endTurn()}
    >
      End turn
    </button>
  ) : null;

  return <PlayTable info={info} board={board} pew={pew} actions={actions} />;
}
