import type { PointerEvent as ReactPointerEvent } from 'react';
import { type Card, KENNEY_CARD_BACK, type Suit } from '../../games/shared/cards';

const SUIT_LETTER: Record<Suit, string> = {
  clubs: 'C',
  diamonds: 'D',
  hearts: 'H',
  spades: 'S',
};

const RED: Suit[] = ['hearts', 'diamonds'];

export function cardLabel(card: Card): string {
  return `${card.rank} of ${card.suit}`;
}

export function CardFace({
  card,
  assetSrc,
  selected,
  disabled,
  playable,
  wild,
  onSelect,
  onPointerDown,
  onDoubleClick,
  className: classNameProp,
  testId,
}: {
  card: Card;
  assetSrc?: string | null;
  selected?: boolean;
  disabled?: boolean;
  playable?: boolean;
  /** Presentation badge (e.g. Crazy Eights wild). */
  wild?: boolean;
  onSelect?: () => void;
  onPointerDown?: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onDoubleClick?: () => void;
  className?: string;
  testId?: string;
}) {
  const red = RED.includes(card.suit);
  const className = [
    'tt-card',
    assetSrc ? 'tt-card--art' : '',
    red ? 'tt-card--red' : 'tt-card--black',
    selected ? 'is-selected' : '',
    playable ? 'is-playable' : '',
    disabled ? 'is-disabled' : '',
    wild ? 'is-wild' : '',
    classNameProp ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  const body = (
    <>
      {assetSrc ? (
        <img className="tt-card__img" src={assetSrc} alt="" draggable={false} />
      ) : (
        <>
          <span className="tt-card__corner tt-card__corner--tl">
            <span className="tt-card__rank">{card.rank}</span>
            <span className="tt-card__suit">{SUIT_LETTER[card.suit]}</span>
          </span>
          <span className="tt-card__pip" aria-hidden="true">
            {SUIT_LETTER[card.suit]}
          </span>
          <span className="tt-card__corner tt-card__corner--br">
            <span className="tt-card__rank">{card.rank}</span>
            <span className="tt-card__suit">{SUIT_LETTER[card.suit]}</span>
          </span>
        </>
      )}
      {wild ? (
        <span className="tt-card__wild" aria-hidden="true">
          WILD
        </span>
      ) : null}
    </>
  );

  if (onSelect || onPointerDown || onDoubleClick) {
    return (
      <button
        type="button"
        className={className}
        disabled={disabled}
        aria-label={wild ? `${cardLabel(card)}, wild` : cardLabel(card)}
        aria-pressed={selected ?? false}
        data-testid={testId}
        onClick={onSelect}
        onPointerDown={onPointerDown}
        onDoubleClick={onDoubleClick}
      >
        {body}
      </button>
    );
  }

  return (
    <div
      className={className}
      role="img"
      aria-label={wild ? `${cardLabel(card)}, wild` : cardLabel(card)}
      data-testid={testId}
    >
      {body}
    </div>
  );
}

export function CardBack({
  count,
  onClick,
  disabled,
  testId,
  label = 'Draw pile',
  src = KENNEY_CARD_BACK,
}: {
  count?: number;
  onClick?: () => void;
  disabled?: boolean;
  testId?: string;
  label?: string;
  src?: string;
}) {
  const className = 'tt-card tt-card--back tt-card--art';
  const body = (
    <>
      <img className="tt-card__img" src={src} alt="" draggable={false} />
      {count != null ? <span className="tt-card__count">{count}</span> : null}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={className}
        disabled={disabled}
        aria-label={label}
        data-testid={testId}
        onClick={onClick}
      >
        {body}
      </button>
    );
  }

  return (
    <div className={className} role="img" aria-label={label} data-testid={testId}>
      {body}
    </div>
  );
}
