import { tracksTilePreloadUrls } from './tileArt';

let preloaded = false;

export function preloadTracksTiles(): void {
  if (preloaded || typeof Image === 'undefined') return;
  preloaded = true;
  for (const url of tracksTilePreloadUrls()) {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
  }
}
