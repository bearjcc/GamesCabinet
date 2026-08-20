import campaignData from './data/campaign/campaign.json';

export const HOGWARTS_HEROES = [
  { id: 'harry', name: 'Harry Potter' },
  { id: 'ron', name: 'Ron Weasley' },
  { id: 'hermione', name: 'Hermione Granger' },
  { id: 'neville', name: 'Neville Longbottom' },
] as const;

export type HogwartsHeroId = (typeof HOGWARTS_HEROES)[number]['id'];

export const HOGWARTS_HERO_IDS = HOGWARTS_HEROES.map((hero) => hero.id);

export const HOGWARTS_CAMPAIGNS = campaignData.games
  .filter((campaign) => campaign.number >= 1 && campaign.number <= 7)
  .map(({ number, name }) => ({ number, name }));

export interface HogwartsSetupData {
  gameNumber?: number;
  heroIds?: string[];
  seed?: number;
}

export const DEFAULT_HOGWARTS_HERO_IDS: HogwartsHeroId[] = [...HOGWARTS_HERO_IDS];

export function selectHogwartsHeroIds(
  requested: readonly string[] | undefined,
  numPlayers: number,
): string[] {
  const selected: string[] = [];
  for (const heroId of requested ?? []) {
    if (HOGWARTS_HERO_IDS.includes(heroId as HogwartsHeroId) && !selected.includes(heroId)) {
      selected.push(heroId);
    }
  }
  for (const heroId of DEFAULT_HOGWARTS_HERO_IDS) {
    if (!selected.includes(heroId)) selected.push(heroId);
  }
  return selected.slice(0, Math.max(1, Math.min(HOGWARTS_HERO_IDS.length, numPlayers)));
}

export function createHogwartsSetupData(
  gameNumber: number,
  heroIds: readonly string[],
): HogwartsSetupData {
  return {
    gameNumber,
    heroIds: selectHogwartsHeroIds(heroIds, HOGWARTS_HERO_IDS.length),
  };
}

export function parseHogwartsSetup(
  gameNumber: string | null,
  heroIds: string | null,
): HogwartsSetupData {
  const parsedGameNumber = Number(gameNumber);
  const selectedGameNumber =
    Number.isInteger(parsedGameNumber) && parsedGameNumber >= 1 && parsedGameNumber <= 7
      ? parsedGameNumber
      : 1;
  const requestedHeroes = heroIds ? heroIds.split(',').filter(Boolean) : undefined;
  return createHogwartsSetupData(selectedGameNumber, requestedHeroes ?? DEFAULT_HOGWARTS_HERO_IDS);
}

export function hogwartsPlayQuery(setup: HogwartsSetupData, seats: number): string {
  const params = new URLSearchParams({
    seats: String(seats),
    year: String(setup.gameNumber ?? 1),
    heroes: (setup.heroIds ?? DEFAULT_HOGWARTS_HERO_IDS).join(','),
  });
  return `?${params.toString()}`;
}
