import { describe, expect, it } from 'vitest';
import {
  KENNEY_DICE_DIR,
  KENNEY_DICE_SKULL,
  kenneyDieFaceAsset,
  kenneyDieFacePath,
} from './kenney';

describe('kenney dice faces', () => {
  it('maps faces 1-6 onto board-game-icons SVG paths', () => {
    expect(kenneyDieFacePath(1)).toBe(`${KENNEY_DICE_DIR}/dice_1.svg`);
    expect(kenneyDieFacePath(6)).toBe(`${KENNEY_DICE_DIR}/dice_6.svg`);
    expect(kenneyDieFaceAsset(3)).toBe('/assets/kenney/board-game-icons/Vector/Icons/dice_3.svg');
    expect(KENNEY_DICE_SKULL).toBe('/assets/kenney/board-game-icons/Vector/Icons/dice_skull.svg');
  });
});
