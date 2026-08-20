import campaign from '../data/campaign/campaign.json';
import market from '../data/cards/market.json';
import starters from '../data/cards/starters.json';
import charmsData from '../data/charms/charms.json';
import creatureDieData from '../data/creature_die.json';
import darkArts from '../data/dark_arts/dark_arts.json';
import encountersData from '../data/encounters/encounters.json';
import heroes from '../data/heroes/heroes.json';
import houseDice from '../data/heroes/house_dice.json';
import proficiencies from '../data/heroes/proficiencies.json';
import horcruxes from '../data/horcrux/horcrux.json';
import locations from '../data/locations/locations.json';
import patronusData from '../data/patronus/patronus.json';
import potionsData from '../data/potions/potions.json';
import villains from '../data/villains/villains.json';
import type {
  CampaignGame,
  CardDefinition,
  CharmDefinition,
  CreatureDieDefinition,
  DarkArtDefinition,
  EffectData,
  EncounterDefinition,
  HeroDefinition,
  HorcruxDefinition,
  LocationDefinition,
  PatronusDefinition,
  PotionDefinition,
  ProficiencyDefinition,
  VillainDefinition,
} from './types';

const cardDatabase: Record<string, CardDefinition> = {
  ...(starters as Record<string, CardDefinition>),
  ...(market as Record<string, CardDefinition>),
};

const villainDatabase = villains as Record<string, VillainDefinition>;
const darkArtsDatabase = darkArts as Record<string, DarkArtDefinition>;
const locationDatabase = locations as Record<string, LocationDefinition>;
const heroDatabase = heroes as Record<string, HeroDefinition>;
const proficiencyDatabase = proficiencies as Record<string, ProficiencyDefinition>;
const horcruxDatabase = horcruxes as Record<string, HorcruxDefinition>;
const encounterDatabase = encountersData as Record<string, EncounterDefinition>;
const creatureDieDatabase = creatureDieData as Record<string, CreatureDieDefinition>;
const patronusDatabase = patronusData as Record<string, PatronusDefinition>;
const potionDatabase = potionsData as Record<string, PotionDefinition>;
const charmDatabase = charmsData as Record<string, CharmDefinition>;
const campaignGames = (campaign as { games: CampaignGame[] }).games;
const houseDiceDatabase = houseDice as Record<
  string,
  { id: string; name: string; faces: { face: number; effect: EffectData }[] }
>;

export function getHouseDice(diceId: string) {
  return houseDiceDatabase[diceId];
}

export function getHouseDiceIds(): string[] {
  return Object.keys(houseDiceDatabase);
}

export function getCard(cardId: string): CardDefinition | undefined {
  return cardDatabase[cardId];
}

export function getVillain(villainId: string): VillainDefinition | undefined {
  return villainDatabase[villainId];
}

export function getDarkArt(darkArtId: string): DarkArtDefinition | undefined {
  return darkArtsDatabase[darkArtId];
}

export function getLocation(locationId: string): LocationDefinition | undefined {
  return locationDatabase[locationId];
}

export function getHero(heroId: string): HeroDefinition | undefined {
  return heroDatabase[heroId];
}

export function getProficiency(proficiencyId: string): ProficiencyDefinition | undefined {
  return proficiencyDatabase[proficiencyId];
}

export function getHorcrux(horcruxId: string): HorcruxDefinition | undefined {
  return horcruxDatabase[horcruxId];
}

export function getHorcruxIds(): string[] {
  return Object.keys(horcruxDatabase);
}

export function getEncounter(encounterId: string): EncounterDefinition | undefined {
  return encounterDatabase[encounterId];
}

export function getEncountersForSet(setId: string): EncounterDefinition[] {
  return Object.values(encounterDatabase)
    .filter((e) => e.set.includes(setId))
    .sort((a, b) => a.order - b.order);
}

export function getCreatureDie(dieId: string = 'creature'): CreatureDieDefinition | undefined {
  return creatureDieDatabase[dieId];
}

export function getPatronus(patronusId: string): PatronusDefinition | undefined {
  return patronusDatabase[patronusId];
}

export function getPatronusForHero(heroId: string): PatronusDefinition | undefined {
  return Object.values(patronusDatabase).find((p) => p.hero_id === heroId);
}

export function getPotion(potionId: string): PotionDefinition | undefined {
  return potionDatabase[potionId];
}

export function getPotionsForSet(setId: string): PotionDefinition[] {
  return Object.values(potionDatabase).filter((p) => p.set.includes(setId));
}

export function getCharmForHero(heroId: string): CharmDefinition | undefined {
  return Object.values(charmDatabase).find((c) => c.hero_id === heroId);
}

export function cardHasKeyword(card: CardDefinition | undefined, keyword: string): boolean {
  if (!card) return false;
  if (keyword === 'house_dice' && card.house_dice) return true;
  return (card.keywords ?? []).includes(keyword);
}

export function getCampaignGame(gameNumber: number): CampaignGame | undefined {
  return campaignGames.find((g) => g.number === gameNumber);
}

export function getCampaignGames(): CampaignGame[] {
  return campaignGames;
}

export function getStartingDeck(heroId: string): string[] {
  const hero = getHero(heroId);
  if (!hero) return [];
  const result: string[] = [];
  for (const entry of hero.starter_cards) {
    for (let i = 0; i < entry.quantity; i += 1) {
      result.push(entry.card_id);
    }
  }
  return result;
}

export function buildMarketDeck(gameNumber: number): string[] {
  const gameConfig = getCampaignGame(gameNumber);
  if (!gameConfig) return [];
  const sets = new Set(gameConfig.market_card_sets);
  const result: string[] = [];
  for (const card of Object.values(cardDatabase)) {
    const cardSets = card.set ?? [];
    if (cardSets.some((s) => sets.has(s))) {
      const qty = card.quantity ?? 1;
      for (let i = 0; i < qty; i += 1) {
        result.push(card.id);
      }
    }
  }
  return result;
}

export function buildVillainDeck(gameNumber: number): string[] {
  const gameConfig = getCampaignGame(gameNumber);
  if (!gameConfig) return [];
  // Accumulate villain pools from all games up to and including the current game.
  const seen = new Set<string>();
  const result: string[] = [];
  for (let n = 1; n <= gameNumber; n += 1) {
    const cfg = getCampaignGame(n);
    if (!cfg) continue;
    for (const id of cfg.villain_pool) {
      if (!seen.has(id)) {
        seen.add(id);
        result.push(id);
      }
    }
  }
  return result;
}

export function buildDarkArtsDeck(gameNumber: number): string[] {
  const gameConfig = getCampaignGame(gameNumber);
  if (!gameConfig) return [];
  // Each campaign array is the complete deck for that game, including any
  // older events that remain in the year-specific composition.
  return [...gameConfig.dark_arts_deck];
}

export function buildLocationDeck(gameNumber: number): string[] {
  const gameConfig = getCampaignGame(gameNumber);
  if (!gameConfig) return [];
  return [...gameConfig.location_pool];
}

export function getVillainSlots(gameNumber: number): number {
  return getCampaignGame(gameNumber)?.villain_slots ?? 1;
}

export function getMarketSpaces(gameNumber: number): number {
  return getCampaignGame(gameNumber)?.market_spaces ?? 6;
}
