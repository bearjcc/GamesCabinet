import { Local } from 'boardgame.io/multiplayer';
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { MatchLifecycleProvider } from '../components/MatchChrome';
import { Shell } from '../components/Shell';
import { boards } from '../games/boards';
import { type GameId, gamesById } from '../games/registry';
import {
  botDifficultyLabel,
  createMctsBotClass,
  cycleBotDifficulty,
  parseBotDifficulty,
} from '../lib/bots';
import { getGameMeta, supportsBotPlay } from '../lib/games';
import { withHotseatSeatSync } from '../lib/hotseat';
import { localRematchMatchID } from '../lib/localRematch';
import { makeClient } from '../lib/makeClient';
import { deriveLaunch, playerIDsOfKind, seatsFromKindsQuery } from '../lib/tableSetup';

export function PlayBot() {
  const { gameId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const meta = getGameMeta(gameId);
  const game = gamesById[gameId as GameId];
  const Board = boards[gameId as GameId];
  const difficulty = parseBotDifficulty(params.get('difficulty'));
  const kindsKey = params.get('kinds') ?? '';
  const tableSeats = useMemo(() => seatsFromKindsQuery(kindsKey || null), [kindsKey]);
  const launchPlan = meta ? deriveLaunch(meta, tableSeats) : null;
  const localIDs = useMemo(() => playerIDsOfKind(tableSeats, 'local'), [tableSeats]);
  const botIDs = useMemo(() => playerIDsOfKind(tableSeats, 'bot'), [tableSeats]);
  const numPlayers = tableSeats.filter((seat) => seat.kind !== 'empty').length;
  const firstLocal = localIDs[0] ?? '0';
  /** Client.reset() nulls multiplayer state; bump match id for a fresh Local+bots match. */
  const [rematchGen, setRematchGen] = useState(0);
  const [seat, setSeat] = useState(firstLocal);
  const matchID = localRematchMatchID(`bot-${gameId}`, rematchGen);

  useEffect(() => {
    setSeat(firstLocal);
  }, [firstLocal]);

  const BotClient = useMemo(() => {
    if (!game || !meta || !Board) return null;
    const Bot = createMctsBotClass(difficulty);
    const bots = Object.fromEntries(botIDs.map((id) => [id, Bot]));
    const humanSeats = new Set(localIDs);
    const hotseat = localIDs.length > 1;
    const board = hotseat
      ? withHotseatSeatSync(Board, setSeat, (playerID) => humanSeats.has(playerID))
      : Board;
    return makeClient({
      game,
      board,
      numPlayers,
      multiplayer: Local({ bots }),
    });
  }, [Board, botIDs, difficulty, game, localIDs, meta, numPlayers]);

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

  if (
    !supportsBotPlay(meta) ||
    !BotClient ||
    launchPlan?.status !== 'ready' ||
    launchPlan.mode !== 'bot'
  ) {
    return <Navigate to={`/game/${meta.id}`} replace />;
  }

  return (
    <Shell
      title={`${meta.name} vs bot`}
      backTo={`/game/${meta.id}`}
      trailing={
        <button
          type="button"
          className="btn ghost"
          data-testid="bot-difficulty"
          onClick={() => {
            const next = cycleBotDifficulty(difficulty);
            setParams(
              (current) => {
                const nextParams = new URLSearchParams(current);
                nextParams.set('difficulty', next);
                return nextParams;
              },
              { replace: true },
            );
            setRematchGen((n) => n + 1);
          }}
          aria-label={`Bot difficulty ${botDifficultyLabel(difficulty)}. Click to cycle.`}
          title="Cycle bot difficulty"
        >
          {botDifficultyLabel(difficulty)}
        </button>
      }
    >
      <MatchLifecycleProvider
        value={{
          onPlayAgain: () => setRematchGen((n) => n + 1),
          playAgainLabel: 'Play again',
          gameLaunchTo: `/game/${meta.id}`,
          homeTo: '/',
        }}
      >
        <BotClient key={`${matchID}-${difficulty}`} playerID={seat} matchID={matchID} />
      </MatchLifecycleProvider>
    </Shell>
  );
}
