import { kenneyDieFaceAsset } from './kenney';
import type { DieFaceArtMap, DieFaceValue } from './types';

/** Build a face-art override map (identity helper for compose call sites). */
export function dieFaceArtMap(overrides: DieFaceArtMap): DieFaceArtMap {
  return { ...overrides };
}

/**
 * Merge face-art maps. Earlier maps win (game overrides before base).
 * Missing faces fall through to Kenney defaults in resolveDieFaceAsset.
 */
export function composeDieFaceArt(...maps: DieFaceArtMap[]): DieFaceArtMap {
  const out: DieFaceArtMap = {};
  for (let i = maps.length - 1; i >= 0; i--) {
    Object.assign(out, maps[i]);
  }
  return out;
}

/**
 * Resolve art for one face. Overrides are slots: pass `{ 1: skullUrl }` to
 * swap the one-pip without forking DieFace behaviour.
 */
export function resolveDieFaceAsset(face: DieFaceValue, overrides?: DieFaceArtMap | null): string {
  return overrides?.[face] ?? kenneyDieFaceAsset(face);
}
