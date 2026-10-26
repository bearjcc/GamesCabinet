import type { TileKind } from './tiles';

export const TRACKS_ASSETS = '/assets/tracks';

export type TracksTileArtSource = 'bear-finished' | 'bear-composed' | 'placeholder';

const RASTER: Partial<Record<TileKind, TracksTileArtSource>> = {
  'tunnel-arch': 'bear-finished',
  'tunnel-mid': 'bear-finished',
  straight: 'bear-composed',
  curve: 'bear-composed',
};

export function tracksTileArtSource(kind: TileKind): TracksTileArtSource {
  return RASTER[kind] ?? 'placeholder';
}

export function tracksTileHasRaster(kind: TileKind): boolean {
  return RASTER[kind] !== undefined;
}

export type TracksTileSize = 512 | 1024;

export function tracksTileSizeForDisplay(): TracksTileSize {
  if (typeof window === 'undefined') return 512;
  return window.devicePixelRatio >= 1.5 ? 1024 : 512;
}

export function tracksGrassUrl(size: TracksTileSize = 512): string {
  return `${TRACKS_ASSETS}/${size}/grass.webp`;
}

export function tracksRasterTileUrl(kind: TileKind, size: TracksTileSize = 512): string | null {
  if (!tracksTileHasRaster(kind)) return null;
  return `${TRACKS_ASSETS}/${size}/${kind}.webp`;
}

/** Every WebP this game preloads (both sizes). */
export function tracksTilePreloadUrls(): string[] {
  const kinds = Object.keys(RASTER) as TileKind[];
  const urls: string[] = [];
  for (const size of [512, 1024] as const) {
    urls.push(tracksGrassUrl(size));
    for (const kind of kinds) {
      urls.push(`${TRACKS_ASSETS}/${size}/${kind}.webp`);
    }
  }
  return urls;
}
