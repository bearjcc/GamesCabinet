import { useMemo, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { MatchLifecycleProvider } from '../components/MatchChrome';
import { Shell } from '../components/Shell';
import { boards } from '../games/boards';
import { parseHogwartsSetup } from '../games/hogwarts-battle/setup';
import { type GameId, gamesById } from '../games/registry';
import { getGameMeta, isAccessGated, isSoloOnly, supportsLocalPlay } from '../lib/games';
import { withHotseatSeatSync } from '../lib/hotseat';
import { makeClient } from '../lib/makeClient';
import { getUnlockedGames } from '../lib/storage';

/** Offline local match (solo or hotseat) without the lobby server. */
export function PlayLocal() {
  const { gameId = '' } = useParams();
  const [params] = useSearchParams();
  const meta = getGameMeta(gameId);
  const game = gamesById[gameId as GameId];
  const [seat, setSeat] = useState('0');

  const seatsParam = Number(params.get('seats') || '');
  const setupData = useMemo(
    () =>
      gameId === 'hogwarts-battle'
        ? parseHogwartsSetup(params.get('year'), params.get('heroes'))
        : undefined,
    [gameId, params],
  );
  const numPlayers = useMemo(() => {
    if (!meta) return 1;
    if (isSoloOnly(meta)) return 1;
    if (meta.hasSolo && !meta.hasLocal) return 1;
    if (meta.hasSolo && Number.isFinite(seatsParam) && seatsParam === 1) return 1;
    const floor = meta.hasLocal ? Math.max(2, meta.minPlayers) : meta.minPlayers;
    const requested = Number.isFinite(seatsParam) && seatsParam > 0 ? seatsParam : floor;
    return Math.min(meta.maxPlayers, Math.max(floor, requested));
  }, [meta, seatsParam]);

  const Board = boards[gameId as GameId];
  const hotseat = numPlayers >= 2;

  const LocalClient = useMemo(() => {
    if (!game || !meta || !Board) return null;
    const board = hotseat ? withHotseatSeatSync(Board, setSeat) : Board;
    return makeClient({
      game,
      board,
      numPlayers,
      setupData,
    });
  }, [Board, game, hotseat, meta, numPlayers, setupData]);

  if (!meta || !game) {
    return (
      <Shell title="Unknown game">
        <p>That game is not in the cabinet.</p>
        <Link className="btn" to="/">
          Back
        </Link>
      </Shell>
    );
  }

  if (!supportsLocalPlay(meta) || !LocalClient) {
    return <Navigate to={`/game/${meta.id}`} replace />;
  }

  if (isAccessGated(meta) && !getUnlockedGames().includes(meta.id)) {
    return <Navigate to={`/game/${meta.id}`} replace />;
  }

  const shellTitle =
    meta.id === 'agency' ? undefined : hotseat ? `${meta.name} (pass and play)` : meta.name;

  return (
    <Shell title={shellTitle} backTo={isSoloOnly(meta) ? '/' : `/game/${meta.id}`}>
      <MatchLifecycleProvider
        value={{
          resetOnPlayAgain: true,
          playAgainLabel: 'Play again',
          gameLaunchTo: isSoloOnly(meta) ? '/' : `/game/${meta.id}`,
          homeTo: '/',
        }}
      >
        <LocalClient
          playerID={hotseat ? seat : '0'}
          matchID={`local-${gameId}-${numPlayers}-${setupData?.gameNumber ?? 0}`}
        />
      </MatchLifecycleProvider>
    </Shell>
  );
}
