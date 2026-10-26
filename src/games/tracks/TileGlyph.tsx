import { useMemo } from 'react';
import {
  tracksGrassUrl,
  tracksRasterTileUrl,
  tracksTileHasRaster,
  tracksTileSizeForDisplay,
} from './tileArt';
import { edgesAt, type Tile, tilePoints } from './tiles';

const MAT_CLASS = {
  rail: 'tracks-edge--rail',
  bridge: 'tracks-edge--bridge',
  tunnel: 'tracks-edge--tunnel',
} as const;

/** Edge stubs as lines from the centre to the edge midpoint (N,E,S,W). */
const STUBS = [
  { x2: 20, y2: 2 },
  { x2: 38, y2: 20 },
  { x2: 20, y2: 38 },
  { x2: 2, y2: 20 },
] as const;

export function TileGlyph({ tile, rot = 0 }: { tile: Tile; rot?: number }) {
  const size = tracksTileSizeForDisplay();
  const points = tilePoints(tile);
  const rasterSrc = useMemo(
    () => (tracksTileHasRaster(tile.kind) ? tracksRasterTileUrl(tile.kind, size) : null),
    [tile.kind, size],
  );
  const grassSrc = useMemo(() => tracksGrassUrl(size), [size]);

  if (rasterSrc) {
    return (
      <div
        className={`tracks-tile-wrap tracks-tile-wrap--${tile.kind}`}
        style={{ transform: `rotate(${rot * 90}deg)` }}
        aria-hidden="true"
      >
        <img className="tracks-tile tracks-tile--photo" src={rasterSrc} alt="" decoding="async" />
        {points > 0 ? <span className="tracks-tile__score">{points}</span> : null}
      </div>
    );
  }

  const edges = edgesAt(tile.kind, rot);
  return (
    <div className={`tracks-tile-wrap tracks-tile-wrap--${tile.kind}`} aria-hidden="true">
      <img className="tracks-tile tracks-tile--grass" src={grassSrc} alt="" decoding="async" />
      <svg
        viewBox="0 0 40 40"
        className={`tracks-tile tracks-tile--glyph tracks-tile--${tile.kind}`}
        aria-hidden="true"
      >
        {tile.kind === 'obstacle' && <ObstacleArt variant={tile.variant} />}
        {edges.map((edge, i) =>
          edge ? (
            <line
              key={i}
              x1="20"
              y1="20"
              x2={STUBS[i].x2}
              y2={STUBS[i].y2}
              className={`tracks-edge ${MAT_CLASS[edge]}`}
            />
          ) : null,
        )}
        {edges.some(Boolean) && <circle cx="20" cy="20" r="3" className="tracks-tile__hub" />}
        {tile.kind === 'whistlestop' && <TownArt small />}
      </svg>
      {points > 0 ? <span className="tracks-tile__score">{points}</span> : null}
    </div>
  );
}

function TownArt({ small = false }: { small?: boolean }) {
  const size = small ? 8 : 14;
  return (
    <rect
      x={20 - size / 2}
      y={20 - size / 2}
      width={size}
      height={size}
      rx="2"
      className="tracks-town"
    />
  );
}

function ObstacleArt({ variant }: { variant?: 'river' | 'mountain' }) {
  if (variant === 'mountain') {
    return <path d="M8 30 L20 10 L32 30 Z" className="tracks-mountain" />;
  }
  return <path d="M6 16 Q13 12 20 16 T34 16 M6 24 Q13 20 20 24 T34 24" className="tracks-river" />;
}
