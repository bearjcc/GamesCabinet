import { TRACKS_ASSETS, tracksTilePreloadUrls } from './tileArt';

let preloaded = false;

export function preloadTracksTiles(): void {
  if (preloaded || typeof Image === 'undefined') return;
  preloaded = true;
  const grass = [`${TRACKS_ASSETS}/grass-tile.webp`, `${TRACKS_ASSETS}/grass-tile-768.webp`];
  for (const url of [...tracksTilePreloadUrls(), ...grass]) {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
  }
}
