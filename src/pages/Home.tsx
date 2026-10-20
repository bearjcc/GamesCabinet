import type { CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GameThumbnail } from '../components/GameThumbnail';
import { JoinRoomPanel } from '../components/JoinRoomPanel';
import { Shell } from '../components/Shell';
import { gameAccentStyle } from '../lib/gameIdentity';
import { catalogueGroups, isSoloOnly, soloPlayPath, visibleGames } from '../lib/games';
import { getUnlockedGames } from '../lib/storage';

export function Home() {
  const navigate = useNavigate();
  const groups = catalogueGroups(visibleGames(getUnlockedGames()));

  return (
    <Shell layout="catalogue">
      {groups.map((group) => (
        <section
          key={group.id}
          className="catalogue-group"
          aria-labelledby={`catalogue-${group.id}`}
          data-testid={`catalogue-group-${group.id}`}
        >
          <h2 id={`catalogue-${group.id}`} className="catalogue-group-title">
            {group.label}
          </h2>
          <div className="game-grid">
            {group.games.map((g) => (
              <Link
                key={g.id}
                className="game-tile"
                style={gameAccentStyle(g.id) as CSSProperties}
                to={isSoloOnly(g) ? soloPlayPath(g.id) : `/game/${g.id}`}
                data-testid={`home-game-${g.id}`}
              >
                <GameThumbnail gameId={g.id} />
                <h3>{g.name}</h3>
              </Link>
            ))}
          </div>
        </section>
      ))}

      <details className="join-details" data-testid="join-details">
        <summary className="join-panel-summary">Join with a code</summary>
        <JoinRoomPanel
          askName
          title=""
          onJoined={(room) => {
            navigate(`/g/${room.gameName}/${room.matchID}`);
          }}
        />
      </details>
    </Shell>
  );
}
