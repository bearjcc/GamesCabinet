import { Link, useNavigate } from 'react-router-dom';
import { JoinRoomPanel } from '../components/JoinRoomPanel';
import { Shell } from '../components/Shell';
import { catalogueGroups, isSoloOnly, soloPlayPath, visibleGames } from '../lib/games';
import { getUnlockedGames } from '../lib/storage';

export function Home() {
  const navigate = useNavigate();
  const groups = catalogueGroups(visibleGames(getUnlockedGames()));

  return (
    <Shell>
      <h1 className="page-heading">Games</h1>

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
                className={`game-tile${g.brandMark ? ' game-tile--branded' : ''}`}
                to={isSoloOnly(g) ? soloPlayPath(g.id) : `/game/${g.id}`}
                data-testid={`home-game-${g.id}`}
              >
                {g.brandMark ? (
                  <img src={g.brandMark} alt="" className="game-tile__mark" aria-hidden="true" />
                ) : null}
                <h3>{g.name}</h3>
                <p>{g.blurb}</p>
              </Link>
            ))}
          </div>
        </section>
      ))}

      <JoinRoomPanel
        askName
        onJoined={(room) => {
          navigate(`/g/${room.gameName}/${room.matchID}`);
        }}
      />
    </Shell>
  );
}
