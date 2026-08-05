import { MCTSBot } from 'boardgame.io/ai';
import { Local } from 'boardgame.io/multiplayer';
import { useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { MatchLifecycleProvider } from '../components/MatchChrome';
import { Shell } from '../components/Shell';
import { boards } from '../games/boards';
import { type GameId, gamesById } from '../games/registry';
import { getGameMeta, supportsBotPlay } from '../lib/games';
import { localRematchMatchID } from '../lib/localRematch';
import { makeClient } from '../lib/makeClient';

/** Medium handheld-era difficulty: modest MCTS iterations. */
class MediumBot extends MCTSBot {
  constructor(opts: ConstructorParameters<typeof MCTSBot>[0]) {
    super({
      ...opts,
      iterations: 200,
      playoutDepth: 8,
    });
  }
}

export function PlayBot() {
  const { gameId = '' } = useParams();
  const meta = getGameMeta(gameId);
  const game = gamesById[gameId as GameId];
  /** Client.reset() nulls multiplayer state; bump match id for a fresh Local+bots match. */
  const [rematchGen, setRematchGen] = useState(0);
  const matchID = localRematchMatchID(`bot-${gameId}`, rematchGen);

  const BotClient = useMemo(() => {
    if (!game) return null;
    return makeClient({
      game,
      board: boards[gameId as GameId],
      numPlayers: 2,
      multiplayer: Local({
        bots: { '1': MediumBot },
      }),
    });
  }, [game, gameId]);

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
    <Shell title={`${meta.name} vs bot`} backTo={`/game/${meta.id}`}>
      <MatchLifecycleProvider
        value={{
          onPlayAgain: () => setRematchGen((n) => n + 1),
          playAgainLabel: 'Play again',
          gameLaunchTo: `/game/${meta.id}`,
          homeTo: '/',
        }}
      >
        <BotClient key={matchID} playerID="0" matchID={matchID} />
      </MatchLifecycleProvider>
    </Shell>
  );
}
