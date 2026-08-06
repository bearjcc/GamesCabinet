import type { Card } from '../../games/shared/cards';
import { CardFace } from './CardFace';

export function CardHand({
  cards,
  selectedIndex,
  disabled,
  isPlayable,
  isWild,
  assetFor,
  onSelect,
  testIdPrefix = 'card-hand',
}: {
  cards: Card[];
  selectedIndex?: number | null;
  disabled?: boolean;
  isPlayable?: (card: Card, index: number) => boolean;
  isWild?: (card: Card, index: number) => boolean;
  assetFor?: (card: Card) => string | null;
  onSelect?: (index: number) => void;
  testIdPrefix?: string;
}) {
  return (
    <div className="tt-hand" data-testid={testIdPrefix} role="list" aria-label="Your hand">
      {cards.map((card, i) => (
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
      ))}
    </div>
  );
}
