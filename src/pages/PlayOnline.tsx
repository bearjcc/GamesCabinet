import { SocketIO } from 'boardgame.io/multiplayer';
import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { JoinRoomPanel } from '../components/JoinRoomPanel';
import { MatchLifecycleProvider } from '../components/MatchChrome';
import { RoomBar } from '../components/RoomBar';
import { Shell } from '../components/Shell';
import { boards } from '../games/boards';
import { type GameId, gamesById } from '../games/registry';
import { getGameMeta } from '../lib/games';
import { leaveRoom, rematchRoom, type SeatedRoom } from '../lib/lobby';
import { makeClient } from '../lib/makeClient';
import { getNickname, loadSeat, type SeatSession } from '../lib/storage';

const server = import.meta.env.VITE_SERVER_URL || window.location.origin;

function toSeat(room: SeatedRoom): SeatSession {
  return {
    matchID: room.matchID,
    playerID: room.playerID,
    credentials: room.credentials,
    gameName: room.gameName,
  };
}

export function PlayOnline() {
  const { gameId = '', code = '' } = useParams();
  const navigate = useNavigate();
  const meta = getGameMeta(gameId);
  const game = gamesById[gameId as GameId];
  const matchCode = code.toUpperCase();
  const [seat, setSeat] = useState<SeatSession | null>(() => loadSeat(gameId, matchCode));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const MatchClient = useMemo(() => {
    if (!game) return null;
    return makeClient({
      game,
      board: boards[gameId as GameId],
      multiplayer: SocketIO({ server }),
    });
  }, [game, gameId]);

  const exitHome = useCallback(async () => {
    if (!seat) {
      navigate('/');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await leaveRoom(seat);
    } catch {
      /* still leave the UI even if lobby leave fails */
    } finally {
      setBusy(false);
    }
    navigate('/');
  }, [navigate, seat]);

  const exitModes = useCallback(async () => {
    if (seat) {
      setBusy(true);
      try {
        await leaveRoom(seat);
      } catch {
        /* ignore */
      } finally {
        setBusy(false);
      }
    }
    navigate(`/game/${gameId}`);
  }, [gameId, navigate, seat]);

  const onRematch = useCallback(async () => {
    if (!seat) return;
    setBusy(true);
    setError('');
    try {
      const next = await rematchRoom(seat, getNickname() || 'Player');
      setSeat(toSeat(next));
      navigate(`/g/${next.gameName}/${next.matchID}`, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start rematch');
    } finally {
      setBusy(false);
    }
  }, [navigate, seat]);

  if (!meta || !game || !MatchClient) {
    return (
      <Shell title="Unknown game">
        <p>That game is not in the cabinet.</p>
        <Link className="btn" to="/">
          Back
        </Link>
      </Shell>
    );
  }

  if (!seat) {
    return (
      <Shell title={meta.name} backTo="/">
        <p>Join this room to take a seat.</p>
        <JoinRoomPanel
          code={matchCode}
          gameName={meta.id}
          codeEditable={false}
          askName
          title="Join room"
          onJoined={(room) => {
            setSeat(toSeat(room));
            if (room.gameName !== gameId || room.matchID !== matchCode) {
              navigate(`/g/${room.gameName}/${room.matchID}`, { replace: true });
            }
          }}
        />
        <MatchActionsHome />
      </Shell>
    );
  }

  return (
    <Shell title={meta.name} backTo="/">
      <RoomBar gameId={gameId} matchID={seat.matchID} onLeave={() => void exitHome()} busy={busy} />
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      <MatchLifecycleProvider
        value={{
          showWaiting: true,
          playAgainLabel: 'Rematch',
          onPlayAgain: onRematch,
          onHome: exitHome,
          onGameLaunch: exitModes,
        }}
      >
        <MatchClient
          matchID={seat.matchID}
          playerID={seat.playerID}
          credentials={seat.credentials}
        />
      </MatchLifecycleProvider>
    </Shell>
  );
}

function MatchActionsHome() {
  return (
    <p className="join-hint">
      <Link className="btn" to="/">
        Home
      </Link>
    </p>
  );
}
