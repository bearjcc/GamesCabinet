import { Link } from 'react-router-dom';
import { cataloguePlayTags } from '../lib/cataloguePlayCopy';
import type { GameMeta } from '../lib/games';
import { isSoloOnly, soloPlayPath } from '../lib/games';

type Props = {
  meta: GameMeta;
  onBrowse: (direction: 'prev' | 'next' | 'up' | 'down') => void;
};

export function CatalogueFocusStrip({ meta, onBrowse }: Props) {
  const playTo = isSoloOnly(meta) ? soloPlayPath(meta.id) : `/game/${meta.id}`;
  const tags = cataloguePlayTags(meta);

  return (
    <section className="cabinet-focus" data-testid="cabinet-focus-strip" aria-live="polite">
      <div className="cabinet-focus__copy">
        <h1 className="cabinet-focus__title">{meta.name}</h1>
        <p className="cabinet-focus__blurb">{meta.blurb}</p>
        <ul className="cabinet-focus__tags">
          {tags.map((tag) => (
            <li key={tag}>{tag}</li>
          ))}
        </ul>
      </div>
      <div className="cabinet-focus__actions">
        <div className="cabinet-focus__browse" role="group" aria-label="Browse games">
          <button
            className="cabinet-focus__arrow"
            data-testid="cabinet-browse-up"
            onClick={() => onBrowse('up')}
            type="button"
            aria-label="Previous shelf"
          >
            ↑
          </button>
          <button
            className="cabinet-focus__arrow"
            data-testid="cabinet-browse-left"
            onClick={() => onBrowse('prev')}
            type="button"
            aria-label="Previous game"
          >
            ←
          </button>
          <button
            className="cabinet-focus__arrow"
            data-testid="cabinet-browse-right"
            onClick={() => onBrowse('next')}
            type="button"
            aria-label="Next game"
          >
            →
          </button>
          <button
            className="cabinet-focus__arrow"
            data-testid="cabinet-browse-down"
            onClick={() => onBrowse('down')}
            type="button"
            aria-label="Next shelf"
          >
            ↓
          </button>
          <span className="cabinet-focus__browse-label">browse</span>
        </div>
        <Link
          className="btn primary cabinet-focus__play"
          data-testid="cabinet-focus-play"
          to={playTo}
        >
          Play →
        </Link>
      </div>
    </section>
  );
}
