import { useState } from 'react';
import { joinKnownRoom, joinRoom, type SeatedRoom } from '../lib/lobby';
import { getNickname, setNickname } from '../lib/storage';

type Props = {
  /** Prefill room code. */
  code?: string;
  /** When set with a locked code, join that game match directly. */
  gameName?: string;
  codeEditable?: boolean;
  title?: string;
  /** Show nickname field (deep link). Home keeps nickname in the shell. */
  askName?: boolean;
  onJoined: (room: SeatedRoom) => void;
};

export function JoinRoomPanel({
  code: initialCode = '',
  gameName,
  codeEditable = true,
  title = 'Join a game',
  askName = false,
  onJoined,
}: Props) {
  const [name, setName] = useState(getNickname() || 'Player');
  const [joinCode, setJoinCode] = useState(initialCode.toUpperCase());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function onJoin() {
    setBusy(true);
    setError('');
    const playerName = askName ? name : getNickname() || name || 'Player';
    if (askName) setNickname(playerName);
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
    <section className="join-panel">
      <h2>{title}</h2>
      {!codeEditable ? <p className="code-display">{joinCode}</p> : null}
      <div className="join-row">
        {codeEditable ? (
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="Room code"
            maxLength={8}
            autoCapitalize="characters"
            aria-label="Room code"
            data-testid="join-code"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && joinCode && !busy) void onJoin();
            }}
          />
        ) : null}
        {askName ? (
          <label className="name-field join-name">
            <span className="sr-only">Your name</span>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNickname(e.target.value);
              }}
              maxLength={24}
              autoComplete="nickname"
              aria-label="Your name"
              placeholder="Your name"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && joinCode && !busy) void onJoin();
              }}
            />
          </label>
        ) : null}
        <button
          type="button"
          className="btn primary"
          disabled={busy || !joinCode}
          onClick={() => void onJoin()}
          data-testid="join-room"
        >
          Join
        </button>
      </div>
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
