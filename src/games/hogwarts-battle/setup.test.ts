import { describe, expect, it } from 'vitest';
import {
  DEFAULT_HOGWARTS_HERO_IDS,
  HOGWARTS_CAMPAIGNS,
  parseHogwartsSetup,
  selectHogwartsHeroIds,
} from './setup';

describe('Hogwarts Battle setup', () => {
  it('exposes the seven base-game campaign years', () => {
    expect(HOGWARTS_CAMPAIGNS).toEqual([
      { number: 1, name: "The Sorcerer's Stone" },
      { number: 2, name: 'The Chamber of Secrets' },
      { number: 3, name: 'The Prisoner of Azkaban' },
      { number: 4, name: 'The Goblet of Fire' },
      { number: 5, name: 'The Order of the Phoenix' },
      { number: 6, name: 'The Half-Blood Prince' },
      { number: 7, name: 'The Deathly Hallows' },
    ]);
  });

  it('keeps selected heroes valid and unique while filling the party', () => {
    expect(selectHogwartsHeroIds(['ron', 'ron', 'unknown'], 4)).toEqual([
      'ron',
      'harry',
      'hermione',
      'neville',
    ]);
    expect(selectHogwartsHeroIds(['neville', 'harry'], 2)).toEqual(['neville', 'harry']);
  });

  it('falls back to the first base-game heroes for invalid setup query values', () => {
    expect(parseHogwartsSetup('99', 'unknown')).toEqual({
      gameNumber: 1,
      heroIds: DEFAULT_HOGWARTS_HERO_IDS,
    });
  });
});
