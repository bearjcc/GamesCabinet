import { describe, expect, it } from 'vitest';
import {
  buildDarkArtsDeck,
  buildLocationDeck,
  buildMarketDeck,
  buildVillainDeck,
  cardHasKeyword,
  getCampaignGame,
  getCampaignGames,
  getCard,
  getCharmForHero,
  getCreatureDie,
  getDarkArt,
  getEncounter,
  getEncountersForSet,
  getHero,
  getHorcrux,
  getHorcruxIds,
  getHouseDice,
  getHouseDiceIds,
  getLocation,
  getMarketSpaces,
  getPatronus,
  getPatronusForHero,
  getPotion,
  getPotionsForSet,
  getProficiency,
  getStartingDeck,
  getVillain,
  getVillainSlots,
} from './dataManager';

describe('dataManager', () => {
  it('loads Game 1 catalogues', () => {
    expect(getCampaignGames().length).toBeGreaterThan(0);
    expect(getCampaignGame(1)?.number).toBe(1);
    expect(getCard('alohomora')?.name).toBeTruthy();
    expect(getVillain('dracomalfoy')?.name).toBeTruthy();
    expect(getDarkArt('expulso')?.name).toBeTruthy();
    expect(getLocation('castlegates')?.name).toBeTruthy();
    expect(getHero('harry')?.name).toContain('Harry');
    expect(getStartingDeck('harry').length).toBeGreaterThan(0);
    expect(getStartingDeck('missing')).toEqual([]);
    expect(buildMarketDeck(1).length).toBeGreaterThan(0);
    expect(buildVillainDeck(1).length).toBeGreaterThan(0);
    expect(buildDarkArtsDeck(1).length).toBeGreaterThan(0);
    expect(buildLocationDeck(1).length).toBeGreaterThan(0);
    expect(getVillainSlots(1)).toBe(1);
    expect(getMarketSpaces(1)).toBe(4);
    expect(buildMarketDeck(99)).toEqual([]);
  });

  it('uses each campaign year complete Dark Arts composition', () => {
    expect(buildDarkArtsDeck(2)).toEqual(getCampaignGame(2)?.dark_arts_deck);
    expect(buildDarkArtsDeck(7)).toEqual(getCampaignGame(7)?.dark_arts_deck);
  });

  it('loads expansion definition tables kept for later games', () => {
    expect(getHouseDiceIds().length).toBeGreaterThan(0);
    expect(getHouseDice(getHouseDiceIds()[0]!)?.faces.length).toBeGreaterThan(0);
    const horcruxId = getHorcruxIds()[0]!;
    expect(getHorcrux(horcruxId)).toBeDefined();
    expect(getCreatureDie()?.faces.length).toBeGreaterThan(0);
    expect(getPatronusForHero('harry')).toBeTruthy();
    expect(getPatronus('missing-patronus')).toBeUndefined();
    expect(getPotion('missing-potion')).toBeUndefined();
    const potions = getPotionsForSet('game12');
    if (potions[0]) expect(getPotion(potions[0].id)).toBeDefined();
    expect(getCharmForHero('harry')).toBeTruthy();
    expect(getEncountersForSet('game8').length).toBeGreaterThanOrEqual(0);
    const enc = getEncountersForSet('game8')[0];
    if (enc) expect(getEncounter(enc.id)).toBeDefined();
    expect(getProficiency('missing')).toBeUndefined();
    expect(getCreatureDie('missing')).toBeUndefined();
    expect(cardHasKeyword(getCard('alohomora'), 'missing')).toBe(false);
    expect(cardHasKeyword(undefined, 'x')).toBe(false);
    const houseCard = Object.values({ x: getCard('alohomora') })[0];
    expect(cardHasKeyword(houseCard, 'house_dice')).toBe(Boolean(houseCard?.house_dice));
  });

  it('uses each campaign game dark arts array as its complete deck', () => {
    for (const game of getCampaignGames()) {
      expect(buildDarkArtsDeck(game.number)).toEqual(game.dark_arts_deck);
    }
  });
});
