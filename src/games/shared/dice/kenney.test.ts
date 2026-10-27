import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  KENNEY_DICE_DIR,
  KENNEY_DICE_SKULL,
  kenneyDieFaceAsset,
  kenneyDieFacePath,
} from './kenney';

const KENNEY_ICONS_ROOT = path.join(
  process.cwd(),
  'public/assets/kenney/board-game-icons/Vector/Icons',
);

describe('kenney dice faces', () => {
  it('ships viewBox on pip faces so img tiles are not clipped', () => {
    for (const face of [1, 2, 3, 4, 5, 6] as const) {
      const file = path.join(KENNEY_ICONS_ROOT, `dice_${face}.svg`);
      const svg = readFileSync(file, 'utf8');
      expect(svg).toMatch(/viewBox="-36 -36 72 72"/);
    }
  });

  it('maps faces 1-6 onto board-game-icons SVG paths', () => {
    expect(kenneyDieFacePath(1)).toBe(`${KENNEY_DICE_DIR}/dice_1.svg`);
    expect(kenneyDieFacePath(6)).toBe(`${KENNEY_DICE_DIR}/dice_6.svg`);
    expect(kenneyDieFaceAsset(3)).toBe('/assets/kenney/board-game-icons/Vector/Icons/dice_3.svg');
    expect(KENNEY_DICE_SKULL).toBe('/assets/kenney/board-game-icons/Vector/Icons/dice_skull.svg');
  });
});
