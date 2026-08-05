import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { JoinRoomPanel } from '../components/JoinRoomPanel';
import { Shell } from '../components/Shell';
import { GAMES } from '../lib/games';
import { getNickname, setNickname } from '../lib/storage';

export function Home() {
  const navigate = useNavigate();
  const [name, setName] = useState(getNickname() || 'Player');

  return (
    <Shell
      trailing={
        <label className="name-field">
          <span className="sr-only">Your name</span>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setNickname(e.target.value);
            }}
            maxLength={24}
            autoComplete="nickname"
            aria-label="Your name"
            title="Your name"
          />
        </label>
      }
    >
      <h1 className="sr-only">Games</h1>
      <section className="game-grid" aria-label="Games">
        {GAMES.map((g) => (
          <Link
            key={g.id}
            className="game-tile"
            to={`/game/${g.id}`}
            data-testid={`home-game-${g.id}`}
          >
            <h2>{g.name}</h2>
            <p>{g.blurb}</p>
          </Link>
        ))}
      </section>

      <JoinRoomPanel
        onJoined={(room) => {
          navigate(`/g/${room.gameName}/${room.matchID}`);
        }}
      />
    </Shell>
  );
}
