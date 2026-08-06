import type { Suit } from '../../games/shared/cards';
import { SUITS } from '../../games/shared/cards';

const LABELS: Record<Suit, string> = {
  clubs: 'Clubs',
  diamonds: 'Diamonds',
  hearts: 'Hearts',
  spades: 'Spades',
};

export function SuitPicker({
  onPick,
  onCancel,
  testIdPrefix = 'suit-picker',
}: {
  onPick: (suit: Suit) => void;
  onCancel?: () => void;
  testIdPrefix?: string;
}) {
  return (
    <div
      className="tt-suit-picker"
      role="dialog"
      aria-label="Choose suit"
      data-testid={testIdPrefix}
    >
      <p className="tt-suit-picker__title">Choose a suit</p>
      <div className="tt-suit-picker__row">
        {SUITS.map((suit) => (
          <button
            key={suit}
            type="button"
            className="btn tt-suit-picker__btn"
            data-testid={`${testIdPrefix}-${suit}`}
            onClick={() => onPick(suit)}
          >
            {LABELS[suit]}
          </button>
        ))}
      </div>
      {onCancel ? (
        <button
          type="button"
          className="btn"
          data-testid={`${testIdPrefix}-cancel`}
          onClick={onCancel}
        >
          Cancel
        </button>
      ) : null}
    </div>
  );
}
