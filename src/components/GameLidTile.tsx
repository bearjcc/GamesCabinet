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
          <span className="game-lid__players-icon">👤</span>
          {playerCountLabel(meta)}
        </span>
      </div>
    </Link>
  );
}
