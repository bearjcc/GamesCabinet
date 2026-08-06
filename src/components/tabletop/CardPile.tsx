import type { Card } from '../../games/shared/cards';
import { CardBack, CardFace } from './CardFace';

export function DiscardPile({
  top,
  assetSrc,
  suitLabel,
  wild,
  testId = 'card-discard',
}: {
  top?: Card;
  assetSrc?: string | null;
  suitLabel?: string;
  wild?: boolean;
  testId?: string;
}) {
  return (
    <div className="tt-pile" data-testid={testId}>
      {top ? (
        <CardFace card={top} assetSrc={assetSrc} wild={wild} testId={`${testId}-top`} />
      ) : (
        <div className="tt-card tt-card--empty" data-testid={`${testId}-empty`}>
          Empty
        </div>
      )}
      {suitLabel ? (
        <p className="tt-pile__suit" data-testid={`${testId}-suit`}>
          Suit: {suitLabel}
        </p>
      ) : null}
    </div>
  );
}

export function StockPile({
  count,
  onDraw,
  disabled,
  testId = 'card-stock',
}: {
  count: number;
  onDraw?: () => void;
  disabled?: boolean;
  testId?: string;
}) {
  return (
    <div className="tt-pile" data-testid={testId}>
      <CardBack
        count={count}
        onClick={onDraw}
        disabled={disabled}
        testId={`${testId}-draw`}
        label={`Draw pile, ${count} cards`}
      />
    </div>
  );
}
