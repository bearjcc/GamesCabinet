import type { Tile, TileKind } from './tiles';

export const TRACKS_ASSETS = '/assets/tracks';

export type TracksTileArtSource = 'bear-finished' | 'bear-composed' | 'bear-composed-placeholder';

const SOURCE: Partial<Record<string, TracksTileArtSource>> = {
  'tunnel-arch': 'bear-finished',
  'tunnel-mid': 'bear-finished',
  straight: 'bear-composed',
  curve: 'bear-composed',
  junction: 'bear-composed-placeholder',
  'bridge-start': 'bear-composed-placeholder',
  'bridge-mid': 'bear-composed-placeholder',
  whistlestop: 'bear-composed-placeholder',
  'obstacle-river': 'bear-composed-placeholder',
  'obstacle-mountain': 'bear-composed-placeholder',
};

export function tracksTileAssetKey(tile: Pick<Tile, 'kind' | 'variant'>): string {
  if (tile.kind === 'obstacle') {
    return `obstacle-${tile.variant ?? 'river'}`;
  }
  return tile.kind;
}

export function tracksTileArtSource(tile: Pick<Tile, 'kind' | 'variant'>): TracksTileArtSource {
  return SOURCE[tracksTileAssetKey(tile)] as TracksTileArtSource;
}

export type TracksTileSize = 512 | 1024;

export function tracksTileSizeForDisplay(): TracksTileSize {
  if (typeof window === 'undefined') return 512;
  return window.devicePixelRatio >= 1.5 ? 1024 : 512;
}

export function tracksTileUrl(
  tile: Pick<Tile, 'kind' | 'variant'>,
  size: TracksTileSize = 512,
): string {
  const key = tracksTileAssetKey(tile);
  return `${TRACKS_ASSETS}/${size}/${key}.webp`;
}

export function tracksTilePreloadUrls(): string[] {
  const keys = Object.keys(SOURCE);
  const urls: string[] = [];
  for (const size of [512, 1024] as const) {
    for (const key of keys) {
      urls.push(`${TRACKS_ASSETS}/${size}/${key}.webp`);
    }
  }
  return urls;
}

export const TRACKS_RASTER_KINDS: TileKind[] = [
  'straight',
  'curve',
  'junction',
  'bridge-start',
  'bridge-mid',
  'tunnel-arch',
  'tunnel-mid',
  'whistlestop',
  'obstacle',
];
