import type { Tile, TileKind } from './tiles';

export const TRACKS_ASSETS = '/assets/tracks';

const ASSET_KEYS = [
  'straight',
  'curve',
  'junction',
  'bridge-start',
  'bridge-mid',
  'tunnel-arch',
  'tunnel-mid',
  'whistlestop',
  'obstacle-river',
  'obstacle-mountain',
] as const;

export type TracksTileAssetKey = (typeof ASSET_KEYS)[number];

export function tracksTileAssetKey(tile: Pick<Tile, 'kind' | 'variant'>): TracksTileAssetKey {
  if (tile.kind === 'obstacle') {
    return tile.variant === 'mountain' ? 'obstacle-mountain' : 'obstacle-river';
  }
  return tile.kind as TracksTileAssetKey;
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
  const urls: string[] = [];
  for (const size of [512, 1024] as const) {
    for (const key of ASSET_KEYS) {
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
