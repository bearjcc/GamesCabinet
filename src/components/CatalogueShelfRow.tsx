import type { CatalogueShelfView } from '../lib/catalogueShelves';
import { GameLidTile } from './GameLidTile';

type Props = {
  shelf: CatalogueShelfView;
  focusId: string;
  onFocusGame: (gameId: string) => void;
};

export function CatalogueShelfRow({ shelf, focusId, onFocusGame }: Props) {
  return (
    <section
      className="cabinet-shelf"
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
        {shelf.games.map((game) => (
          <GameLidTile
            key={game.id}
            meta={game}
            selected={game.id === focusId}
            onFocus={() => onFocusGame(game.id)}
          />
        ))}
      </div>
    </section>
  );
}
