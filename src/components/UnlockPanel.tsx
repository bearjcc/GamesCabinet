import { useState } from 'react';
import { findGameByAccessCode, type GameMeta } from '../lib/games';
import { getUnlockedGames, unlockGame } from '../lib/storage';

/** Code entry that reveals hidden shelves; used by Settings and locked launch pages. */
export function UnlockPanel({ onUnlocked }: { onUnlocked?: (game: GameMeta) => void }) {
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');

  function submit() {
    const game = findGameByAccessCode(code);
    if (!game) {
      setMessage('That code does not open any shelf.');
      return;
    }
    if (getUnlockedGames().includes(game.id)) {
      setMessage(`${game.name} is already in your cabinet.`);
      return;
    }
    unlockGame(game.id);
    setCode('');
    setMessage(`${game.name} added to your cabinet.`);
    onUnlocked?.(game);
  }

  return (
    <div className="unlock-panel">
      <div className="launch-actions">
        <label className="party-size name-field">
          <span>Access code</span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
            maxLength={64}
            autoComplete="off"
            data-testid="unlock-code"
            aria-label="Access code"
          />
        </label>
        <button type="button" className="btn primary" onClick={submit} data-testid="unlock-submit">
          Unlock
        </button>
      </div>
      {message ? (
        <p className="launch-blurb" role="status" data-testid="unlock-feedback">
          {message}
        </p>
      ) : null}
    </div>
  );
}
