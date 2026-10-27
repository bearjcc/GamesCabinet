import { useState } from 'react';
import { joinKnownRoom, joinRoom, type SeatedRoom } from '../lib/lobby';
import { getNickname, setNickname } from '../lib/storage';
import { RoomCodeBoxes } from './RoomCodeBoxes';

type Props = {
  /** Prefill room code. */
  code?: string;
  /** When set with a locked code, join that game match directly. */
  gameName?: string;
  codeEditable?: boolean;
  title?: string;
  /** Nickname field when joining from a dialog or after code entry. */
  askName?: boolean;
  /** Header row on the catalogue: code boxes only, no section title. */
  compact?: boolean;
  /** Four single-letter boxes instead of one text field. */
  codeBoxes?: boolean;
  joinLabel?: string;
  testIdPrefix?: string;
  onJoined: (room: SeatedRoom) => void;
};

export function JoinRoomPanel({
  code: initialCode = '',
  gameName,
  codeEditable = true,
  title = 'Join a game',
  askName = false,
  compact = false,
  codeBoxes = false,
  joinLabel = 'Join',
  testIdPrefix = 'join',
  onJoined,
}: Props) {
  const [name, setName] = useState(getNickname() || '');
  const [joinCode, setJoinCode] = useState(initialCode.toUpperCase());
  const [needName, setNeedName] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const codeReady = joinCode.trim().length >= (codeBoxes ? 6 : 1);

  async function onJoin() {
    setBusy(true);
    setError('');
    const stored = getNickname()?.trim();
    const playerName = askName || needName ? name.trim() : stored || name.trim();
    if (!playerName) {
      setNeedName(true);
      setBusy(false);
      return;
    }
    if (askName || needName) setNickname(playerName);
    try {
      const room =
        !codeEditable && gameName
          ? await joinKnownRoom({ matchID: joinCode.trim().toUpperCase(), gameName }, playerName)
          : await joinRoom(joinCode, playerName);
      onJoined(room);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not join room');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={compact ? 'join-panel join-panel--compact' : 'join-panel'}>
      {compact ? (
        title ? (
          <span className="join-panel__compact-label">{title}</span>
        ) : null
      ) : title ? (
        <h2>{title}</h2>
      ) : null}
      {!codeEditable ? <p className="code-display">{joinCode}</p> : null}
      <div className="join-row">
        {codeEditable && codeBoxes ? (
          <RoomCodeBoxes
            value={joinCode}
            onChange={setJoinCode}
            disabled={busy}
            length={6}
            testId={`${testIdPrefix}-code`}
          />
        ) : null}
        {codeEditable && !codeBoxes ? (
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="Room code"
            maxLength={8}
            autoCapitalize="characters"
            aria-label="Room code"
            data-testid={`${testIdPrefix}-code`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && codeReady && !busy) void onJoin();
            }}
          />
        ) : null}
        {(askName || needName) && !compact ? (
          <label className="name-field join-name">
            <span className="sr-only">Your name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={24}
              autoComplete="nickname"
              aria-label="Your name"
              placeholder="Your name"
              data-testid="join-name"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && codeReady && !busy) void onJoin();
              }}
            />
          </label>
        ) : null}
        <button
          type="button"
          className="btn primary join-submit"
          disabled={busy || !codeReady}
          onClick={() => void onJoin()}
          data-testid={`${testIdPrefix}-room`}
        >
          {joinLabel}
        </button>
      </div>
      {needName && compact ? (
        <div className="join-row join-row--name">
          <label className="name-field join-name">
            <span className="sr-only">Your name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={24}
              autoComplete="nickname"
              aria-label="Your name"
              placeholder="Your name"
              data-testid="join-name"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && codeReady && !busy) void onJoin();
              }}
            />
          </label>
        </div>
      ) : null}
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
