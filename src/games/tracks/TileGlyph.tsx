import { useMemo } from 'react';
import { tracksTileSizeForDisplay, tracksTileUrl } from './tileArt';
import type { Tile } from './tiles';
import { tilePoints } from './tiles';

export function TileGlyph({ tile, rot = 0 }: { tile: Tile; rot?: number }) {
  const size = tracksTileSizeForDisplay();
  const src = useMemo(() => tracksTileUrl(tile, size), [tile, size]);
  const points = tilePoints(tile);

  return (
    <div
      className={`tracks-tile-wrap tracks-tile-wrap--${tracksTileAssetClass(tile)}`}
      style={{ transform: `rotate(${rot * 90}deg)` }}
      aria-hidden="true"
    >
      <img className="tracks-tile tracks-tile--photo" src={src} alt="" decoding="async" />
      {points > 0 ? <span className="tracks-tile__score">{points}</span> : null}
    </div>
  );
}

function tracksTileAssetClass(tile: Tile): string {
  return tile.kind === 'obstacle' ? `obstacle-${tile.variant ?? 'river'}` : tile.kind;
}
