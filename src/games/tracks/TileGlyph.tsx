import { edgesAt, type Tile } from './tiles';

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
  const edges = edgesAt(tile.kind, rot);
  return (
    <svg viewBox="0 0 40 40" className={`tracks-tile tracks-tile--${tile.kind}`} aria-hidden="true">
      <rect x="1" y="1" width="38" height="38" rx="4" className="tracks-tile__bg" />
      {tile.kind === 'town' && <TownArt />}
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
