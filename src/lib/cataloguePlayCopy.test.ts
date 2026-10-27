import { describe, expect, it } from 'vitest';
import { cataloguePlayTags, playerCountLabel } from './cataloguePlayCopy';
import { type GameMeta, getGameMeta } from './games';

describe('cataloguePlayCopy', () => {
  it('formats player counts and play tags', () => {
    const c4 = getGameMeta('connect-four')!;
    expect(playerCountLabel(c4)).toBe('2');
    expect(cataloguePlayTags(c4)).toEqual(['2 players', 'Same screen or online', 'Bot available']);

    const solo = getGameMeta('2048')!;
    expect(cataloguePlayTags(solo)).toEqual(['1 player', 'Solo scores']);

    const dominoes = getGameMeta('dominoes')!;
    expect(playerCountLabel(dominoes)).toBe('2–4');

    const localOnly = { ...c4, hasOnline: false } as GameMeta;
    expect(cataloguePlayTags(localOnly)).toContain('Same screen');

    const soloNoBoard = { ...solo, hasLeaderboard: false } as GameMeta;
    expect(playerCountLabel(soloNoBoard)).toBe('1');
    expect(cataloguePlayTags(soloNoBoard)).toEqual(['1 player']);

    const onlineOnly = {
      ...c4,
      hasLocal: false,
      hasOnline: true,
      hasBot: false,
    } as GameMeta;
    expect(cataloguePlayTags(onlineOnly)).toEqual(['2 players']);
  });
});
