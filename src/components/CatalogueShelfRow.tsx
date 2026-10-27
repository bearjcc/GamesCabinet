import { useState } from 'react';
import { BOARDS_SHELF_COLLAPSED_LIMIT, type CatalogueShelfView } from '../lib/catalogueShelves';
import { GameLidTile } from './GameLidTile';

type Props = {
  shelf: CatalogueShelfView;
  focusId: string;
  onFocusGame: (gameId: string) => void;
};

export function CatalogueShelfRow({ shelf, focusId, onFocusGame }: Props) {
  const [expanded, setExpanded] = useState(false);
  const collapseLimit = shelf.id === 'boards' ? BOARDS_SHELF_COLLAPSED_LIMIT : shelf.games.length;
  const canCollapse = shelf.id === 'boards' && shelf.games.length > collapseLimit;
  const hiddenCount = canCollapse && !expanded ? shelf.games.length - collapseLimit : 0;
  const visibleGames = canCollapse && !expanded ? shelf.games.slice(0, collapseLimit) : shelf.games;

  return (
    <section
      className={`cabinet-shelf${expanded ? ' cabinet-shelf--expanded' : ''}`}
      aria-labelledby={`cabinet-shelf-${shelf.id}`}
      data-testid={`catalogue-shelf-${shelf.id}`}
    >
      <div className="cabinet-shelf__head">
        <h2 id={`cabinet-shelf-${shelf.id}`} className="cabinet-shelf__title">
          <span className="cabinet-shelf__label">{shelf.label}</span>
          <span className="cabinet-shelf__count">{shelf.games.length}</span>
        </h2>
        <span className="cabinet-shelf__see-all" aria-hidden>
          See all ›
        </span>
      </div>
      <div className="cabinet-shelf__row" role="list">
        {visibleGames.map((game) => (
          <GameLidTile
            key={game.id}
            meta={game}
            selected={game.id === focusId}
            onFocus={() => onFocusGame(game.id)}
          />
        ))}
        {hiddenCount > 0 ? (
          <button
            type="button"
            className="game-lid game-lid--more"
            data-testid={`catalogue-shelf-${shelf.id}-more`}
            onClick={() => setExpanded(true)}
          >
            <span className="game-lid__more-label">› {hiddenCount} more</span>
          </button>
        ) : null}
      </div>
    </section>
  );
}
