import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { HogwartsSetupPanel } from '../components/HogwartsSetupPanel';
import { Shell } from '../components/Shell';
import { UnlockPanel } from '../components/UnlockPanel';
import {
  createHogwartsSetupData,
  DEFAULT_HOGWARTS_HERO_IDS,
  hogwartsPlayQuery,
} from '../games/hogwarts-battle/setup';
import { getGameMeta, isAccessGated } from '../lib/games';
import { hostRoom } from '../lib/lobby';
import { getNickname, getUnlockedGames, setNickname } from '../lib/storage';

export function GameLaunch() {
  const { gameId = '' } = useParams();
  const meta = getGameMeta(gameId);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [localSeats, setLocalSeats] = useState(2);
  const [justUnlocked, setJustUnlocked] = useState(false);
  const [hogwartsSetup, setHogwartsSetup] = useState(() =>
    createHogwartsSetupData(1, DEFAULT_HOGWARTS_HERO_IDS),
  );

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
      const room = await hostRoom(
        meta.id,
        numPlayers,
        name,
        meta.id === 'hogwarts-battle' ? hogwartsSetup : undefined,
      );
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

  const locked = isAccessGated(meta) && !justUnlocked && !getUnlockedGames().includes(meta.id);
  if (locked) {
    return (
      <Shell title="Hidden shelf" backTo="/">
        <div data-testid="launch-locked">
          <p className="launch-blurb">This shelf is hidden. Enter its access code to open it.</p>
          <UnlockPanel onUnlocked={() => setJustUnlocked(true)} />
        </div>
      </Shell>
    );
  }

  const onlineSizes: number[] = [];
  for (let n = Math.max(2, meta.minPlayers); n <= meta.maxPlayers; n++) onlineSizes.push(n);

  const localSizes: number[] = [];
  if (meta.hasLocal) {
    for (let n = Math.max(2, meta.minPlayers); n <= meta.maxPlayers; n++) localSizes.push(n);
  }

  const hasOnline = meta.hasOnline !== false && meta.maxPlayers >= 2;
  const primaryIsSolo = Boolean(meta.hasSolo);
  const primaryIsLocal = !primaryIsSolo && Boolean(meta.hasLocal);
  const primaryIsBot = !primaryIsSolo && !primaryIsLocal && Boolean(meta.hasBot);
  const primaryIsHost = !primaryIsSolo && !primaryIsLocal && !primaryIsBot && hasOnline;
  const hogwartsQuery = meta.id === 'hogwarts-battle' ? hogwartsPlayQuery(hogwartsSetup, 1) : '';
  const localQuery =
    meta.id === 'hogwarts-battle'
      ? hogwartsPlayQuery(hogwartsSetup, localSizes.length > 1 ? localSeats : (localSizes[0] ?? 2))
      : '';

  return (
    <Shell title={meta.name} backTo="/">
      <p className="launch-blurb">{meta.blurb}</p>
      {meta.id === 'hogwarts-battle' ? (
        <HogwartsSetupPanel value={hogwartsSetup} onChange={setHogwartsSetup} />
      ) : null}
      <div className="launch-modes" data-testid="launch-modes">
        {meta.hasSolo ? (
          <div className="launch-mode" data-testid="launch-mode-solo">
            <Link
              className={primaryIsSolo ? 'btn primary' : 'btn'}
              to={`/play/${meta.id}${meta.id === 'hogwarts-battle' ? hogwartsQuery : '?seats=1'}`}
              data-testid="play-solo"
            >
              Play
            </Link>
          </div>
        ) : null}

        {meta.hasLocal ? (
          <div className="launch-mode" data-testid="launch-mode-local">
            {localSizes.length > 1 ? (
              <label className="party-size">
                <span>{meta.id === 'hogwarts-battle' ? 'Heroes' : 'Players'}</span>
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
              className={primaryIsLocal ? 'btn primary' : 'btn'}
              to={
                meta.id === 'hogwarts-battle'
                  ? `/play/${meta.id}${localQuery}`
                  : `/play/${meta.id}?seats=${localSizes.length > 1 ? localSeats : (localSizes[0] ?? 2)}`
              }
              data-testid="play-local"
            >
              Pass and play
            </Link>
          </div>
        ) : null}

        {meta.hasBot ? (
          <div className="launch-mode" data-testid="launch-mode-bot">
            <Link
              className={primaryIsBot ? 'btn primary' : 'btn'}
              to={`/vs-bot/${meta.id}`}
              data-testid="play-bot"
            >
              Play vs bot
            </Link>
          </div>
        ) : null}

        {hasOnline ? (
          <div className="launch-mode" data-testid="launch-mode-host">
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
              className={primaryIsHost ? 'btn primary' : 'btn'}
              disabled={busy}
              onClick={onHost}
              data-testid="host-room"
            >
              Host a room
            </button>
          </div>
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
