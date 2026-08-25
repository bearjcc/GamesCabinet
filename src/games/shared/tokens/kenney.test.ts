import { describe, expect, it } from 'vitest';
import {
  KENNEY_CROWN,
  KENNEY_HIT,
  KENNEY_ICONS_DIR,
  KENNEY_LADDER,
  KENNEY_MISS,
  KENNEY_SNAKE,
  KENNEY_SUNK,
  kenneyIcon,
  kenneyTokenGlyph,
} from './kenney';

describe('kenney token and marker icons', () => {
  it('points at board-game-icons SVGs', () => {
    expect(kenneyIcon('pawn')).toBe(`${KENNEY_ICONS_DIR}/pawn.svg`);
    expect(kenneyIcon('token')).toBe(`${KENNEY_ICONS_DIR}/token.svg`);
    expect(KENNEY_CROWN).toBe(`${KENNEY_ICONS_DIR}/crown_a.svg`);
  });

  it('uses Kenney silhouettes for pawn and chip, not solid discs', () => {
    expect(kenneyTokenGlyph('pawn')).toBe(kenneyIcon('pawn'));
    expect(kenneyTokenGlyph('chip')).toBe(kenneyIcon('token'));
    expect(kenneyTokenGlyph('disc')).toBeNull();
  });

  it('maps shot and teleporter marks onto the same icon pack', () => {
    expect(KENNEY_HIT).toBe(`${KENNEY_ICONS_DIR}/fire.svg`);
    expect(KENNEY_MISS).toBe(`${KENNEY_ICONS_DIR}/token.svg`);
    expect(KENNEY_SUNK).toBe(`${KENNEY_ICONS_DIR}/skull.svg`);
    expect(KENNEY_LADDER).toBe(`${KENNEY_ICONS_DIR}/pawn_up.svg`);
    expect(KENNEY_SNAKE).toBe(`${KENNEY_ICONS_DIR}/arrow_right_curve.svg`);
  });
});
