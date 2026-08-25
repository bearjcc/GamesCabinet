import { SocketIO } from 'boardgame.io/multiplayer';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { JoinRoomPanel } from '../components/JoinRoomPanel';
import { MatchLifecycleProvider } from '../components/MatchChrome';
import { RoomBar } from '../components/RoomBar';
import { Shell } from '../components/Shell';
import { boards } from '../games/boards';
import { type GameId, gamesById } from '../games/registry';
import { createSilentBotBoard } from '../lib/botSeat';
import { getGameMeta, isAccessGated } from '../lib/games';
import { withHotseatSeatSync } from '../lib/hotseat';
import { leaveRoom, rematchRoom, type SeatedRoom } from '../lib/lobby';
import { makeClient } from '../lib/makeClient';
import {
  deviceSeats,
  getNickname,
  getUnlockedGames,
  loadSeat,
  type SeatSession,
} from '../lib/storage';

const server = import.meta.env.VITE_SERVER_URL || window.location.origin;

function toSeat(room: SeatedRoom): SeatSession {
  return {
    matchID: room.matchID,
    playerID: room.playerID,
    credentials: room.credentials,
    gameName: room.gameName,
    ...(room.localSeats === undefined ? {} : { localSeats: room.localSeats }),
    ...(room.setupData === undefined ? {} : { setupData: room.setupData }),
  };
}

export function PlayOnline() {
  const { gameId = '', code = '' } = useParams();
  const navigate = useNavigate();
  const meta = getGameMeta(gameId);
  const game = gamesById[gameId as GameId];
  const Board = boards[gameId as GameId];
  const matchCode = code.toUpperCase();
  const [seat, setSeat] = useState<SeatSession | null>(() => loadSeat(gameId, matchCode));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const tableSeats = seat ? deviceSeats(seat) : [];
  const humanSeats = tableSeats.filter((entry) => entry.kind !== 'bot');
  const botSeats = tableSeats.filter((entry) => entry.kind === 'bot');
  const humanIDs = humanSeats.map((entry) => entry.playerID);
  const humanKey = humanIDs.join(',');
  const firstHuman = humanSeats[0]?.playerID ?? seat?.playerID ?? '0';
  const [activeID, setActiveID] = useState(firstHuman);

  useEffect(() => {
    setActiveID(firstHuman);
  }, [firstHuman]);

  const activeSeat = humanSeats.find((entry) => entry.playerID === activeID) ?? humanSeats[0];

  const MatchClient = useMemo(() => {
    if (!game || !Board) return null;
    const humans = new Set(humanKey.split(',').filter(Boolean));
    const board =
      humans.size > 1
        ? withHotseatSeatSync(Board, setActiveID, (playerID) => humans.has(playerID))
        : Board;
    return makeClient({
      game,
      board,
      multiplayer: SocketIO({ server }),
    });
  }, [Board, game, humanKey]);

  const BotClient = useMemo(() => {
    if (!game || botSeats.length === 0) return null;
    return makeClient({
      game,
      board: createSilentBotBoard(game),
      multiplayer: SocketIO({ server }),
    });
  }, [botSeats.length, game]);

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

  if (isAccessGated(meta) && !getUnlockedGames().includes(meta.id)) {
    return <Navigate to={`/game/${meta.id}`} replace />;
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
          key={`${seat.matchID}-${activeSeat?.playerID ?? seat.playerID}`}
          matchID={seat.matchID}
          playerID={activeSeat?.playerID ?? seat.playerID}
          credentials={activeSeat?.credentials ?? seat.credentials}
        />
      </MatchLifecycleProvider>
      {BotClient
        ? botSeats.map((entry) => (
            <div hidden key={`${seat.matchID}-bot-${entry.playerID}`}>
              <BotClient
                matchID={seat.matchID}
                playerID={entry.playerID}
                credentials={entry.credentials}
              />
            </div>
          ))
        : null}
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
