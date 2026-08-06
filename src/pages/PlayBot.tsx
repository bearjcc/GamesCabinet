import { Local } from 'boardgame.io/multiplayer';
import { useMemo, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { MatchLifecycleProvider } from '../components/MatchChrome';
import { Shell } from '../components/Shell';
import { boards } from '../games/boards';
import { type GameId, gamesById } from '../games/registry';
import {
  botDifficultyLabel,
  botSeatCount,
  createMctsBotClass,
  cycleBotDifficulty,
  parseBotDifficulty,
} from '../lib/bots';
import { getGameMeta, supportsBotPlay } from '../lib/games';
import { localRematchMatchID } from '../lib/localRematch';
import { makeClient } from '../lib/makeClient';

export function PlayBot() {
  const { gameId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const meta = getGameMeta(gameId);
  const game = gamesById[gameId as GameId];
  const difficulty = parseBotDifficulty(params.get('difficulty'));
  /** Client.reset() nulls multiplayer state; bump match id for a fresh Local+bots match. */
  const [rematchGen, setRematchGen] = useState(0);
  const matchID = localRematchMatchID(`bot-${gameId}`, rematchGen);

  const BotClient = useMemo(() => {
    if (!game || !meta) return null;
    const Bot = createMctsBotClass(difficulty);
    // Seat count via helper (always 2 today); 3-4p bot parties deferred - see botSeatCount.
    const numPlayers = botSeatCount(meta);
    return makeClient({
      game,
      board: boards[gameId as GameId],
      numPlayers,
      multiplayer: Local({
        bots: { '1': Bot },
      }),
    });
  }, [difficulty, game, gameId, meta]);

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

  if (!supportsBotPlay(meta) || !BotClient) {
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
            setParams({ difficulty: next }, { replace: true });
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
        <BotClient key={`${matchID}-${difficulty}`} playerID="0" matchID={matchID} />
      </MatchLifecycleProvider>
    </Shell>
  );
}
