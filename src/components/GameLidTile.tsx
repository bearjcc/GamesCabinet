import { Link } from 'react-router-dom';
import { playerCountLabel } from '../lib/cataloguePlayCopy';
import type { CatalogueShelfGame } from '../lib/catalogueShelves';
import { usesLidPlaceholder } from '../lib/gameLidArt';
import { isSoloOnly, soloPlayPath } from '../lib/games';
import { GameThumbnail } from './GameThumbnail';

type Props = {
  meta: CatalogueShelfGame;
  selected?: boolean;
  onFocus?: () => void;
};

export function GameLidTile({ meta, selected = false, onFocus }: Props) {
  const to = isSoloOnly(meta) ? soloPlayPath(meta.id) : `/game/${meta.id}`;
  const placeholder = usesLidPlaceholder(meta.id);

  return (
    <Link
      className={`game-lid${selected ? ' is-selected' : ''}${placeholder ? ' game-lid--placeholder' : ''}`}
      data-testid={`home-game-${meta.id}`}
      to={to}
      onFocus={onFocus}
      onMouseEnter={onFocus}
      aria-current={selected ? 'true' : undefined}
    >
      <div className="game-lid__art">
        {meta.catalogueLocked ? (
          <span className="game-lid__lock" data-testid={`home-game-${meta.id}-lock`} title="Locked">
            <span aria-hidden="true">🔒</span>
          </span>
        ) : null}
        {placeholder ? (
          <span className="game-lid__placeholder">Lid to come</span>
        ) : (
          <GameThumbnail gameId={meta.id} variant="lid" />
        )}
      </div>
      <div className="game-lid__foot">
        <span className="game-lid__name">{meta.name}</span>
        <span className="game-lid__players" aria-hidden>
          <svg className="game-lid__person" viewBox="0 0 12 12" aria-hidden="true">
            <circle cx="6" cy="3.25" r="2" fill="none" stroke="currentColor" strokeWidth="1.1" />
            <path
              d="M2.25 10.75c0-2.07 1.68-3.75 3.75-3.75s3.75 1.68 3.75 3.75"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.1"
              strokeLinecap="round"
            />
          </svg>
          {playerCountLabel(meta)}
        </span>
      </div>
    </Link>
  );
}
