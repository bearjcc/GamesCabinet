import type { BoardProps } from 'boardgame.io/react';
import { type CSSProperties, useEffect, useState } from 'react';
import { MatchScoreboard } from '../../components/MatchScoreboard';
import { PlayTable } from '../../components/PlayTable';
import { StatusBar } from '../../components/StatusBar';
import {
  getCampaignGame,
  getCard,
  getDarkArt,
  getHorcrux,
  getLocation,
  getProficiency,
  getVillain,
} from './engine/dataManager';
import { getCardInstance } from './engine/gameState';
import { getEffectiveCardCost } from './engine/proficiencies';
import type { HogwartsGameState } from './engine/types';
import {
  canAssignAttack,
  canBuyAtIndex,
  canEndTurn,
  canPlayCard,
  canUseHorcruxReward,
  canUseProficiency,
  cardTitle,
  heroDisplayName,
  pendingChoicePlayerId,
  resolveHandCardTap,
  turnHeadline,
  unassignedAttack,
} from './gameSelectors';
import {
  getHogwartsSprite,
  getHogwartsSpriteStyle,
  type HogwartsSpriteCategory,
} from './spriteAssets';

function SpriteBadge({
  category,
  id,
  label,
}: {
  category: HogwartsSpriteCategory;
  id: string;
  label: string;
}) {
  const asset = getHogwartsSprite(category, id);
  const position = getHogwartsSpriteStyle(category, id);
  const style: CSSProperties | undefined =
    asset && position
      ? {
          ...position,
          backgroundImage: `url("/assets/hogwarts-battle/sheets/${asset.sheet}.webp")`,
        }
      : undefined;

  return (
    <span
      className={`hb-sprite${style ? ' hb-sprite--atlas' : ''}`}
      style={style}
      aria-hidden="true"
    >
      <span className="hb-sprite__fallback">{label}</span>
    </span>
  );
}

function TextCard({
  title,
  subtitle,
  selected,
  disabled,
  onClick,
  testId,
  spriteId,
  titleHint,
}: {
  title: string;
  subtitle?: string;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  testId?: string;
  spriteId?: string;
  titleHint?: string;
}) {
  return (
    <button
      type="button"
      className={`hb-card${selected ? ' is-selected' : ''}${disabled ? ' is-disabled' : ''}`}
      disabled={disabled}
      onClick={onClick}
      data-testid={testId}
      title={titleHint}
    >
      {spriteId ? <SpriteBadge category="cards" id={spriteId} label={title} /> : null}
      <span className="hb-card__title">{title}</span>
      {subtitle ? <span className="hb-card__sub">{subtitle}</span> : null}
    </button>
  );
}

const HORCRUX_SYMBOL_LABELS: Record<string, string> = {
  attack: 'Attack',
  draw: 'Draw',
  heal: 'Health',
  influence: 'Influence',
};

export function HogwartsBattleBoard({
  G,
  ctx,
  moves,
  playerID,
  isActive,
}: BoardProps<HogwartsGameState>) {
  const seat = playerID ?? ctx.currentPlayer;
  const isMyTurn = Boolean(
    isActive && !ctx.gameover && !G.isGameOver && G.currentPlayerId === seat,
  );
  const player = G.players[seat];
  const [selectedHand, setSelectedHand] = useState<string | null>(null);
  const unassigned = unassignedAttack(G, G.currentPlayerId);
  const campaign = getCampaignGame(G.gameNumber);
  const selectedCard = selectedHand
    ? getCard(getCardInstance(G, selectedHand)?.cardId ?? '')
    : undefined;
  const pendingChooser = pendingChoicePlayerId(G);
  const canChoosePending = Boolean(G.pendingChoice && isMyTurn && pendingChooser === seat);
  const activeHorcrux = G.horcruxState?.activeHorcruxId
    ? getHorcrux(G.horcruxState.activeHorcruxId)
    : undefined;
  const manualHorcruxRewards = (player?.destroyedHorcruxIds ?? [])
    .map((id) => getHorcrux(id))
    .filter((horcrux) => horcrux?.reward?.trigger === 'manual');
  const proficiency = getProficiency(player?.proficiencyId ?? '');
  const proficiencyGate = proficiency ? canUseProficiency(G, seat) : undefined;
  const proficiencyAction = moves.useProficiency;
  const horcruxRewardAction = moves.useHorcruxReward;

  useEffect(() => {
    if (G.darkArtsRemainingToReveal <= 0) return;
    const timer = window.setTimeout(() => {
      moves.revealDarkArts?.();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [G.darkArtsRemainingToReveal, moves]);

  const status = turnHeadline(G, seat, isMyTurn);
  const tone = ctx.gameover ? 'done' : isMyTurn ? 'you' : 'wait';

  const scores = Object.entries(G.players).map(([id, p]) => ({
    label:
      id === ctx.currentPlayer
        ? `* ${heroDisplayName(p.characterId)}`
        : heroDisplayName(p.characterId),
    value: `${p.health} HP`,
  }));

  const loc = G.currentLocation;
  const locDef = loc ? getLocation(loc.locationId) : undefined;

  return (
    <PlayTable
      info={
        <>
          <StatusBar text={status} tone={tone} />
          <MatchScoreboard scores={scores} />
          <p className="hb-meta" data-testid="hb-meta">
            Game {G.gameNumber}: {campaign?.name ?? 'Campaign'} - Turn {G.turnNumber}
            {unassigned > 0 ? ` - ${unassigned} attack unassigned` : ''}
          </p>
        </>
      }
      board={
        <div className="hb-board" data-testid="hb-board">
          <section className="hb-threat" data-testid="hb-threat">
            <div className="hb-location">
              <div className="hb-object-heading">
                {loc ? (
                  <SpriteBadge
                    category="locations"
                    id={loc.locationId}
                    label={locDef?.name ?? loc.locationId}
                  />
                ) : null}
                <div>
                  <h3>{locDef?.name ?? loc?.locationId ?? 'No location'}</h3>
                  {loc ? (
                    <p>
                      Control {loc.currentControl}/{loc.maxControl} - {loc.darkArtsToReveal} Dark
                      Arts
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="hb-dark-arts">
              <h3>Dark Arts</h3>
              <ul>
                {G.darkArtsPlayedThisTurn.map((id) => (
                  <li key={id}>
                    <SpriteBadge category="darkArts" id={id} label={getDarkArt(id)?.name ?? id} />
                    <span>{getDarkArt(id)?.name ?? id}</span>
                  </li>
                ))}
                {G.darkArtsPlayedThisTurn.length === 0 ? (
                  <li className="hb-muted">None yet</li>
                ) : null}
              </ul>
            </div>
            <div className="hb-villains" data-testid="hb-villains">
              <h3>Villains</h3>
              <div className="hb-villain-row">
                {G.activeVillains.map((v, index) => {
                  if (!v.isActive) return null;
                  const def = getVillain(v.villainId);
                  const assigned = G.attackAssignments[String(index)] ?? 0;
                  const focused = G.focusedVillainIndex === index;
                  return (
                    <div
                      key={`${v.villainId}-${index}`}
                      className={`hb-villain${focused ? ' is-focused' : ''}`}
                      data-testid={`hb-villain-${index}`}
                    >
                      <button
                        type="button"
                        className="hb-villain__focus"
                        onClick={() => moves.focusVillain?.(index)}
                      >
                        <SpriteBadge
                          category="villains"
                          id={v.villainId}
                          label={def?.name ?? v.villainId}
                        />
                        <span className="hb-villain__copy">
                          <strong>{def?.name ?? v.villainId}</strong>
                          <span>
                            {v.currentHp}/{v.maxHp} HP
                          </span>
                        </span>
                      </button>
                      <div className="hb-villain__atk">
                        <button
                          type="button"
                          disabled={!canAssignAttack(G, seat, -1).allowed || assigned <= 0}
                          onClick={() => moves.assignAttack?.(index, -1)}
                        >
                          -
                        </button>
                        <span>{assigned}</span>
                        <button
                          type="button"
                          disabled={!canAssignAttack(G, seat, 1).allowed}
                          onClick={() => moves.assignAttack?.(index, 1)}
                        >
                          +
                        </button>
                        <button
                          type="button"
                          className="btn"
                          disabled={!isMyTurn || assigned <= 0}
                          onClick={() => moves.attackVillain?.(index)}
                          data-testid={`hb-attack-${index}`}
                        >
                          Strike
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="hb-market" data-testid="hb-market">
            <h3>Hogwarts market</h3>
            <div className="hb-card-row">
              {G.market.availableCards.map((slot, index) => {
                if (!slot) {
                  return <div key={`empty-${index}`} className="hb-card hb-card--empty" />;
                }
                const card = getCard(getCardInstance(G, slot)?.cardId ?? '');
                const gate = canBuyAtIndex(G, seat, index);
                const cost = getEffectiveCardCost(G, seat, card);
                return (
                  <TextCard
                    key={slot}
                    title={card?.name ?? slot}
                    subtitle={`Cost ${cost}${card && cost !== card.cost ? ` (was ${card.cost})` : ''}`}
                    disabled={!gate.allowed}
                    onClick={() => moves.buyCard?.(index)}
                    testId={`hb-market-${index}`}
                    spriteId={card?.id}
                    titleHint={gate.reason ?? card?.description}
                  />
                );
              })}
            </div>
          </section>

          <section className="hb-allies" data-testid="hb-allies">
            <h3>Heroes</h3>
            <div className="hb-ally-row">
              {Object.entries(G.players).map(([id, p]) => (
                <div
                  key={id}
                  className={`hb-ally${id === ctx.currentPlayer ? ' is-active' : ''}`}
                  data-testid={`hb-hero-${id}`}
                >
                  <strong>{heroDisplayName(p.characterId)}</strong>
                  <span>
                    {p.health} HP - hand {p.hand.length} - deck {p.deck.length}
                  </span>
                  {G.gameNumber >= 6 && p.proficiencyId ? (
                    <div className="hb-proficiency" data-testid={`hb-proficiency-${id}`}>
                      <strong>{getProficiency(p.proficiencyId)?.name ?? p.proficiencyId}</strong>
                      <span>
                        {getProficiency(p.proficiencyId)?.description ?? 'No rules text.'}
                      </span>
                      {id === seat && getProficiency(p.proficiencyId)?.trigger === 'manual' ? (
                        <>
                          <button
                            type="button"
                            className="btn"
                            disabled={!proficiencyGate?.allowed}
                            onClick={() => proficiencyAction?.()}
                            data-testid="hb-use-proficiency"
                          >
                            Use proficiency
                          </button>
                          {!proficiencyGate?.allowed ? (
                            <small className="hb-action-reason">{proficiencyGate?.reason}</small>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          {G.horcruxState ? (
            <section className="hb-horcrux" data-testid="hb-horcruxes">
              <div className="hb-section-heading">
                <h3>Horcruxes</h3>
                <span>
                  {G.horcruxState.destroyedHorcruxIds.length} destroyed -{' '}
                  {G.horcruxState.stack.length} remaining
                </span>
              </div>
              {activeHorcrux ? (
                <div className="hb-horcrux__active">
                  <div className="hb-object-heading">
                    <div className="hb-horcrux__sigil" aria-hidden="true">
                      Needs:{' '}
                      {activeHorcrux.destroy_symbols
                        .map((symbol) => HORCRUX_SYMBOL_LABELS[symbol] ?? symbol)
                        .join(' + ')}
                    </div>
                    <div>
                      <strong>{activeHorcrux.name}</strong>
                      <span>{activeHorcrux.description ?? 'Destroy this Horcrux to advance.'}</span>
                    </div>
                  </div>
                  <p>
                    Rolled:{' '}
                    {G.horcruxState.rolledSymbols.length > 0
                      ? G.horcruxState.rolledSymbols
                          .map((symbol) => HORCRUX_SYMBOL_LABELS[symbol] ?? symbol)
                          .join(', ')
                      : 'none'}
                  </p>
                </div>
              ) : (
                <p className="hb-muted">All Horcruxes destroyed. Voldemort can be attacked.</p>
              )}
              {manualHorcruxRewards.length > 0 ? (
                <div className="hb-horcrux__rewards">
                  <strong>Rewards you can use</strong>
                  {manualHorcruxRewards.map((horcrux) => {
                    if (!horcrux) return null;
                    const gate = canUseHorcruxReward(G, seat, horcrux.id);
                    return (
                      <div key={horcrux.id} className="hb-reward">
                        <span>
                          {horcrux.name}: {horcrux.reward?.description ?? 'Manual reward'}
                        </span>
                        <button
                          type="button"
                          className="btn"
                          disabled={!gate.allowed}
                          onClick={() => horcruxRewardAction?.(horcrux.id)}
                          data-testid={`hb-horcrux-reward-${horcrux.id}`}
                          title={gate.reason}
                        >
                          Use reward
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </section>
          ) : null}

          {G.pendingChoice ? (
            <div className="hb-choice" data-testid="hb-choice" role="dialog" aria-live="polite">
              <p>
                {canChoosePending
                  ? 'Choose an option'
                  : `Waiting for ${heroDisplayName(pendingChooser ?? G.currentPlayerId)} to choose`}
              </p>
              {canChoosePending ? (
                <div className="hb-choice__options">
                  {G.pendingChoice.options.map((opt, index) => (
                    <button
                      key={`${opt.label}-${index}`}
                      type="button"
                      className="btn"
                      onClick={() => moves.chooseOption?.(index)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="hb-muted">The choice will resolve before the next action.</p>
              )}
            </div>
          ) : null}
        </div>
      }
      pew={
        <div className="hb-pew" data-testid="hb-pew">
          <div className="hb-resources">
            <span data-testid="hb-attack">Attack {player?.attackTokens ?? 0}</span>
            <span data-testid="hb-influence">Influence {player?.moneyTokens ?? 0}</span>
            <span>
              Deck {player?.deck.length ?? 0} - Discard {player?.discard.length ?? 0}
            </span>
          </div>
          {selectedCard ? (
            <aside className="hb-card-detail" data-testid="hb-card-detail" aria-live="polite">
              <div className="hb-card-detail__heading">
                <SpriteBadge category="cards" id={selectedCard.id} label={selectedCard.name} />
                <div>
                  <h3>{selectedCard.name}</h3>
                  <p>
                    {selectedCard.type} - Cost {selectedCard.cost}
                    {selectedCard.keywords?.length ? ` - ${selectedCard.keywords.join(', ')}` : ''}
                  </p>
                </div>
              </div>
              <p>{selectedCard.description ?? 'No rules text.'}</p>
              {selectedCard.passive_effect?.description ? (
                <p className="hb-card-detail__passive">{selectedCard.passive_effect.description}</p>
              ) : null}
            </aside>
          ) : (
            <p className="hb-selection-hint">
              Tap a card to play it. Unplayable cards open to read.
            </p>
          )}
          <div className="hb-card-row hb-hand" data-testid="hb-hand">
            {(player?.hand ?? []).map((id) =>
              (() => {
                const cardId = getCardInstance(G, id)?.cardId ?? id;
                const card = getCard(cardId);
                return (
                  <TextCard
                    key={id}
                    title={cardTitle(G, id)}
                    subtitle={card?.type}
                    selected={selectedHand === id}
                    onClick={() => {
                      if (resolveHandCardTap(G, seat, id) === 'play') {
                        moves.playCard?.(id);
                        setSelectedHand(null);
                        return;
                      }
                      setSelectedHand(id === selectedHand ? null : id);
                    }}
                    testId={`hb-hand-${id}`}
                    spriteId={card?.id}
                    titleHint={canPlayCard(G, seat, id).reason}
                  />
                );
              })(),
            )}
          </div>
          <div className="hb-card-row hb-play" data-testid="hb-play-area">
            {(player?.playArea ?? []).map((id) => (
              <TextCard
                key={id}
                title={cardTitle(G, id)}
                disabled
                testId={`hb-played-${id}`}
                spriteId={getCardInstance(G, id)?.cardId}
              />
            ))}
          </div>
          <div className="hb-actions">
            <button
              type="button"
              className="btn"
              disabled={!isMyTurn || G.currentPhase !== 'HERO_ACTION' || Boolean(G.pendingChoice)}
              onClick={() => {
                moves.playAll?.();
                setSelectedHand(null);
              }}
              data-testid="hb-play-all"
            >
              Play all
            </button>
            <button
              type="button"
              className="btn"
              disabled={
                !isMyTurn ||
                G.currentPhase !== 'HERO_ACTION' ||
                Boolean(G.pendingChoice) ||
                Boolean(player?.hasCycledMarket)
              }
              onClick={() => moves.cycleMarket?.()}
              data-testid="hb-cycle-market"
              title="Once per game: set the market aside and refill it from the deck"
            >
              Cycle market
            </button>
            <button
              type="button"
              className="btn primary"
              disabled={!isMyTurn || !canEndTurn(G, seat).allowed}
              onClick={() => moves.endTurn?.()}
              data-testid="hb-end-turn"
            >
              End turn
            </button>
          </div>
        </div>
      }
    />
  );
}
