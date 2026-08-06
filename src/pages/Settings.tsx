import { useState } from 'react';
import { Shell } from '../components/Shell';
import {
  getNickname,
  getSeatColour,
  SEAT_COLOUR_PALETTE,
  type SeatColour,
  setNickname,
  setSeatColour,
} from '../lib/storage';

export function Settings() {
  const [name, setName] = useState(() => getNickname() || 'Player');
  const [seatColour, setSeatColourState] = useState<SeatColour>(() => getSeatColour());

  return (
    <Shell title="Settings">
      <section aria-label="Nickname">
        <label className="party-size name-field">
          <span>Nickname</span>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setNickname(e.target.value);
            }}
            maxLength={24}
            autoComplete="nickname"
            data-testid="settings-nickname"
            aria-label="Nickname"
          />
        </label>
      </section>

      <section aria-label="Default seat colour">
        <p className="launch-blurb">Default seat colour</p>
        <div className="launch-actions" role="radiogroup" aria-label="Seat colour">
          {SEAT_COLOUR_PALETTE.map((colour) => {
            const selected = colour === seatColour;
            return (
              <button
                key={colour}
                type="button"
                role="radio"
                aria-checked={selected}
                className={selected ? 'btn primary' : 'btn'}
                style={{ backgroundColor: colour, borderColor: colour, minWidth: '2.5rem' }}
                data-testid={`settings-seat-colour-${colour}`}
                aria-label={`Seat colour ${colour}`}
                onClick={() => {
                  setSeatColourState(colour);
                  setSeatColour(colour);
                }}
              />
            );
          })}
        </div>
      </section>

      <p className="launch-blurb">Theme and motion live in the topbar.</p>
    </Shell>
  );
}
