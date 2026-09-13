import type { BoardProps } from 'boardgame.io/react';
import { useMemo, useState } from 'react';
import { MatchScoreboard } from '../../components/MatchScoreboard';
import { PlayTable } from '../../components/PlayTable';
import { StatusBar } from '../../components/StatusBar';
import type { StatusTone } from '../../lib/matchStatus';
import {
  type AgencyState,
  canAssignPerson,
  canBuyCard,
  canContribute,
  canPlayCard,
  missionThreshold,
} from './actions';
import {
  BUILDING_LABELS,
  type BuildingId,
  cardDef,
  ERA_TARGET_SOLO,
  EXPLORER_I,
  SLOTS_PER_BUILDING,
} from './cards';

type SelectMode = { kind: 'none' } | { kind: 'person'; cardId: string } | { kind: 'contribute' };

function cardLabel(id: string): string {
  return cardDef(id)?.name ?? id;
}

export function AgencyBoard({ G, ctx, moves, isActive }: BoardProps<AgencyState>) {
  const [select, setSelect] = useState<SelectMode>({ kind: 'none' });
  const playable = Boolean(isActive && !ctx.gameover);
  const gameover = ctx.gameover as { winner?: string; eraScore?: number } | undefined;

  const need = useMemo(() => missionThreshold(G.mission, G.buildings), [G.mission, G.buildings]);

  let status = 'Play cards, staff buildings, fund the mission, or buy from the row.';
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
    status = 'Choose a building for this person.';
  }

  const pickCard = (cardId: string) => {
    if (!playable) return;
    const def = cardDef(cardId);
    if (!def) return;
    if (def.kind === 'person') {
      setSelect({ kind: 'person', cardId });
      return;
    }
    if (canPlayCard(G, cardId)) {
      moves.playCard(cardId);
      setSelect({ kind: 'none' });
    }
  };

  const pickBuilding = (buildingId: BuildingId) => {
    if (!playable || select.kind !== 'person') return;
    if (canAssignPerson(G, select.cardId, buildingId)) {
      moves.assignPerson(select.cardId, buildingId);
      setSelect({ kind: 'none' });
    }
  };

  const pickMarket = (index: number) => {
    if (!playable) return;
    if (canBuyCard(G, index)) {
      moves.buyCard(index);
    }
  };

  const contributeAll = () => {
    if (!playable) return;
    if (canContribute(G, G.funding, G.innovation)) {
      moves.contribute(G.funding, G.innovation);
    }
  };

  const info = (
    <>
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
      <section className="agency-zone" aria-label="Mission">
        <h3 className="agency-zone__title">{EXPLORER_I.name}</h3>
        <p className="agency-mission__need">
          Needs {need.funding} Funding and {need.innovation} Innovation on the mission.
        </p>
        <div className="agency-mission__track" data-testid="agency-mission">
          <span>
            Funding {G.mission.fundingPlaced}/{need.funding}
          </span>
          <span>
            Innovation {G.mission.innovationPlaced}/{need.innovation}
          </span>
        </div>
        {playable && (G.funding > 0 || G.innovation > 0) ? (
          <button
            type="button"
            className="agency-chip"
            data-testid="agency-contribute"
            onClick={contributeAll}
          >
            Commit {G.funding} Funding and {G.innovation} Innovation
          </button>
        ) : null}
      </section>

      <section className="agency-zone" aria-label="Buildings">
        <h3 className="agency-zone__title">Buildings</h3>
        <div className="agency-buildings">
          {G.buildings.map((building) => {
            const highlight =
              select.kind === 'person' && canAssignPerson(G, select.cardId, building.id);
            return (
              <button
                key={building.id}
                type="button"
                className={`agency-building${highlight ? ' is-legal' : ''}`}
                data-testid={`agency-building-${building.id}`}
                disabled={!highlight}
                onClick={() => pickBuilding(building.id)}
              >
                <span className="agency-building__name">{BUILDING_LABELS[building.id]}</span>
                <ul className="agency-building__slots">
                  {Array.from({ length: SLOTS_PER_BUILDING }, (_, slot) => {
                    const personId = building.assigned[slot];
                    return (
                      <li key={slot} className="agency-slot">
                        {personId ? cardLabel(personId) : 'Empty slot'}
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
            const def = cardDef(cardId);
            const affordable = canBuyCard(G, index);
            return (
              <li key={`${cardId}-${index}`}>
                <button
                  type="button"
                  className={`agency-card agency-card--market${affordable && playable ? ' is-legal' : ''}`}
                  data-testid={`agency-market-${index}`}
                  disabled={!playable || !affordable}
                  onClick={() => pickMarket(index)}
                >
                  <span className="agency-card__name">{def?.name ?? cardId}</span>
                  <span className="agency-card__meta">
                    {def?.marketCost ?? 0} Funding — {def?.blurb}
                  </span>
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
        const canPlay = playable && canPlayCard(G, cardId);
        return (
          <li key={`${cardId}-${index}`}>
            <button
              type="button"
              className={`agency-card agency-card--hand${selected ? ' is-selected' : ''}${canPlay ? ' is-legal' : ''}`}
              data-testid={`agency-hand-${cardId}`}
              disabled={!canPlay}
              onClick={() => pickCard(cardId)}
            >
              <span className="agency-card__name">{def?.name ?? cardId}</span>
              <span className="agency-card__meta">{def?.blurb}</span>
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
