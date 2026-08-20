import { describe, expect, it } from 'vitest';
import { getHogwartsSprite, getHogwartsSpriteStyle } from './spriteAssets';

describe('Hogwarts sprite assets', () => {
  it('resolves an English card to its atlas cell', () => {
    expect(getHogwartsSprite('cards', 'alohomora')).toEqual({
      sheet: 'sheet_111',
      index: 0,
      cols: 10,
      rows: 3,
    });
  });

  it('resolves villain, dark arts, and location categories', () => {
    expect(getHogwartsSprite('villains', 'dracomalfoy')?.sheet).toBe('sheet_105');
    expect(getHogwartsSprite('darkArts', 'expulso')?.index).toBe(2);
    expect(getHogwartsSprite('locations', 'castlegates')?.sheet).toBe('sheet_071');
  });

  it('returns no art when an English match is not verified', () => {
    expect(getHogwartsSprite('cards', 'crumplehornedsnorkack')).toBeNull();
    expect(getHogwartsSpriteStyle('cards', 'crumplehornedsnorkack')).toBeNull();
  });
});
