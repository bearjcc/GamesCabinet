import { useState } from 'react';
import type { Card } from '../../games/shared/cards';
import { type CardHandMode, chooseCardHandMode } from '../../lib/representation';
import { CardFace, cardLabel } from './CardFace';

export function CardHand({
  cards,
  selectedIndex,
  disabled,
  isPlayable,
  isWild,
  assetFor,
  onSelect,
  mode: modeOverride,
  testIdPrefix = 'card-hand',
}: {
  cards: Card[];
  selectedIndex?: number | null;
  disabled?: boolean;
  isPlayable?: (card: Card, index: number) => boolean;
  isWild?: (card: Card, index: number) => boolean;
  assetFor?: (card: Card) => string | null;
  onSelect?: (index: number) => void;
  /** Override shell-chosen representation (physical / compact / list). */
  mode?: CardHandMode;
  testIdPrefix?: string;
}) {
  const mode = modeOverride ?? chooseCardHandMode(cards.length);
  const [filter, setFilter] = useState('');
  const query = filter.trim().toLowerCase();

  const slots = cards.map((card, i) => {
    if (mode === 'list' && query && !cardLabel(card).toLowerCase().includes(query)) {
      return null;
    }
    return (
      <div key={`${card.id}-${i}`} className="tt-hand__slot" role="listitem">
        <CardFace
          card={card}
          assetSrc={assetFor?.(card)}
          selected={selectedIndex === i}
          disabled={disabled}
          playable={isPlayable?.(card, i)}
          wild={isWild?.(card, i)}
          testId={`${testIdPrefix}-${i}`}
          onSelect={onSelect ? () => onSelect(i) : undefined}
        />
      </div>
    );
  });

  if (mode === 'list') {
    return (
      <div className="tt-hand tt-hand--list" data-testid={testIdPrefix} data-hand-mode="list">
        <label className="tt-hand__search">
          <span className="tt-hand__search-label">Search hand</span>
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter cards"
            data-testid={`${testIdPrefix}-search`}
            autoComplete="off"
          />
        </label>
        <div className="tt-hand__scroll" role="list" aria-label="Your hand">
          {slots}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`tt-hand tt-hand--${mode}`}
      data-testid={testIdPrefix}
      data-hand-mode={mode}
      role="list"
      aria-label="Your hand"
    >
      {slots}
    </div>
  );
}
