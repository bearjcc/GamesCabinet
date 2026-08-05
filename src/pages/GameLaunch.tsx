import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Shell } from '../components/Shell';
import { getGameMeta } from '../lib/games';
import { hostRoom } from '../lib/lobby';
import { getNickname, setNickname } from '../lib/storage';

export function GameLaunch() {
  const { gameId = '' } = useParams();
  const meta = getGameMeta(gameId);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [localSeats, setLocalSeats] = useState(2);

  async function onHost() {
    if (!meta) return;
    setBusy(true);
    setError('');
    const name = getNickname() || 'Player';
    setNickname(name);
    const floor = Math.max(2, meta.minPlayers);
    const numPlayers =
      meta.maxPlayers > floor ? Math.min(meta.maxPlayers, Math.max(floor, partySize)) : floor;
    try {
      const room = await hostRoom(meta.id, numPlayers, name);
      navigate(`/g/${room.gameName}/${room.matchID}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create room');
    } finally {
      setBusy(false);
    }
  }

  if (!meta) {
    return (
      <Shell title="Unknown game">
        <p>That game is not in the cabinet.</p>
        <Link className="btn" to="/">
          Back
        </Link>
      </Shell>
    );
  }

  const onlineSizes: number[] = [];
  for (let n = Math.max(2, meta.minPlayers); n <= meta.maxPlayers; n++) onlineSizes.push(n);

  const localSizes: number[] = [];
  if (meta.hasLocal) {
    for (let n = Math.max(2, meta.minPlayers); n <= meta.maxPlayers; n++) localSizes.push(n);
  }

  return (
    <Shell title={meta.name} backTo="/">
      <p className="launch-blurb">{meta.blurb}</p>
      <div className="launch-actions">
        {meta.hasSolo ? (
          <Link className="btn" to={`/play/${meta.id}?seats=1`} data-testid="play-solo">
            Play
          </Link>
        ) : null}
        {meta.hasLocal ? (
          <>
            {localSizes.length > 1 ? (
              <label className="party-size">
                <span>Pass-and-play seats</span>
                <select
                  value={localSeats}
                  data-testid="local-seats"
                  onChange={(e) => setLocalSeats(Number(e.target.value))}
                >
                  {localSizes.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <Link
              className="btn"
              to={`/play/${meta.id}?seats=${localSizes.length > 1 ? localSeats : (localSizes[0] ?? 2)}`}
              data-testid="play-local"
            >
              Pass and play
            </Link>
          </>
        ) : null}
        {meta.hasBot ? (
          <Link className="btn" to={`/vs-bot/${meta.id}`} data-testid="play-bot">
            Play vs bot
          </Link>
        ) : null}
        {meta.maxPlayers >= 2 ? (
          <>
            {onlineSizes.length > 1 ? (
              <label className="party-size">
                <span>Online players</span>
                <select
                  value={partySize}
                  data-testid="party-size"
                  onChange={(e) => setPartySize(Number(e.target.value))}
                >
                  {onlineSizes.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <button
              type="button"
              className="btn"
              disabled={busy}
              onClick={onHost}
              data-testid="host-room"
            >
              Host a room
            </button>
          </>
        ) : null}
      </div>
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
    </Shell>
  );
}
