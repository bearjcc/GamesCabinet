import type { SpriteAsset, SpriteStyle } from '../shared/cards/sprites';
import { spriteStyle } from '../shared/cards/sprites';
import spriteManifest from './data/sprite-assets.json';

export type HogwartsSpriteCategory = 'cards' | 'villains' | 'darkArts' | 'locations';

type HogwartsSpriteManifest = Record<HogwartsSpriteCategory, Record<string, SpriteAsset>>;

const assets = spriteManifest as HogwartsSpriteManifest;

export function getHogwartsSprite(
  category: HogwartsSpriteCategory,
  id: string,
): SpriteAsset | null {
  return assets[category][id] ?? null;
}

export function getHogwartsSpriteStyle(
  category: HogwartsSpriteCategory,
  id: string,
): SpriteStyle | null {
  const asset = getHogwartsSprite(category, id);
  return asset ? spriteStyle(asset) : null;
}
