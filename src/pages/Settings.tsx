import { useState } from 'react';
import { SeatColourPicker } from '../components/SeatColourPicker';
import { Shell } from '../components/Shell';
import { UnlockPanel } from '../components/UnlockPanel';
import { GAMES, isAccessGated } from '../lib/games';
import {
  getNickname,
  getSeatColour,
  getUnlockedGames,
  type SeatColour,
  setNickname,
  setSeatColour,
} from '../lib/storage';

export function Settings() {
  const [name, setName] = useState(() => getNickname() || 'Player');
  const [seatColour, setSeatColourState] = useState<SeatColour>(() => getSeatColour());
  const [unlocked, setUnlocked] = useState<string[]>(() => getUnlockedGames());
  const revealed = GAMES.filter((g) => isAccessGated(g) && unlocked.includes(g.id));

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
        <SeatColourPicker
          value={seatColour}
          ariaLabel="Seat colour"
          testIdFor={(colour) => `settings-seat-colour-${colour}`}
          onChange={(colour) => {
            setSeatColourState(colour);
            setSeatColour(colour);
          }}
        />
      </section>

      <section aria-label="Access codes">
        <p className="launch-blurb">Access codes</p>
        <p className="launch-blurb">
          Some shelves stay hidden until a code opens them on this device.
        </p>
        <UnlockPanel onUnlocked={() => setUnlocked(getUnlockedGames())} />
        {revealed.length ? (
          <ul data-testid="settings-unlocked-games">
            {revealed.map((g) => (
              <li key={g.id}>{g.name}</li>
            ))}
          </ul>
        ) : null}
      </section>
    </Shell>
  );
}
