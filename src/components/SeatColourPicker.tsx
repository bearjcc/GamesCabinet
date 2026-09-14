import { SEAT_COLOUR_PALETTE, type SeatColour, seatColourLabel } from '../lib/storage';

type Props = {
  value?: string;
  onChange: (colour: SeatColour) => void;
  ariaLabel: string;
  testIdFor: (colour: SeatColour) => string;
};

export function SeatColourPicker({ value, onChange, ariaLabel, testIdFor }: Props) {
  return (
    <div className="seat-swatches" role="radiogroup" aria-label={ariaLabel}>
      {SEAT_COLOUR_PALETTE.map((colour) => {
        const name = seatColourLabel(colour);
        const selected = colour === value;
        return (
          <button
            key={colour}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`Seat colour ${name}`}
            className={selected ? 'seat-swatch selected' : 'seat-swatch'}
            data-testid={testIdFor(colour)}
            onClick={() => onChange(colour)}
          >
            <span className="seat-swatch__chip" style={{ backgroundColor: colour }} />
            <span className="seat-swatch__name">{name}</span>
          </button>
        );
      })}
    </div>
  );
}
