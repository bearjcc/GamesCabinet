import campaignData from './data/campaign/campaign.json';

export const HOGWARTS_HEROES = [
  { id: 'harry', name: 'Harry Potter' },
  { id: 'ron', name: 'Ron Weasley' },
  { id: 'hermione', name: 'Hermione Granger' },
  { id: 'neville', name: 'Neville Longbottom' },
  { id: 'luna', name: 'Luna Lovegood' },
  { id: 'ginny', name: 'Ginny Weasley' },
] as const;

export type HogwartsHeroId = (typeof HOGWARTS_HEROES)[number]['id'];

export const HOGWARTS_HERO_IDS = HOGWARTS_HEROES.map((hero) => hero.id);
export const DEFAULT_HOGWARTS_HERO_IDS: HogwartsHeroId[] = HOGWARTS_HERO_IDS.slice(0, 4);

export const HOGWARTS_CAMPAIGNS = campaignData.games
  .filter((campaign) => campaign.number >= 1 && campaign.number <= 7)
  .map(({ number, name }) => ({ number, name }));

export interface HogwartsSetupData {
  gameNumber?: number;
  heroIds?: string[];
  seed?: number;
}

const HERO_NAMES = new Map(HOGWARTS_HEROES.map((hero) => [hero.id, hero.name]));

export function getHogwartsHeroIdsForYear(gameNumber: number): HogwartsHeroId[] {
  const campaign = campaignData.games.find((game) => game.number === gameNumber);
  const ids = campaign?.hero_ids.filter((heroId): heroId is HogwartsHeroId =>
    HERO_NAMES.has(heroId as HogwartsHeroId),
  );
  return ids?.length ? ids : DEFAULT_HOGWARTS_HERO_IDS.slice(0, 4);
}

export function getHogwartsHeroesForYear(gameNumber: number) {
  return getHogwartsHeroIdsForYear(gameNumber).map((id) => ({
    id,
    name: HERO_NAMES.get(id) ?? id,
  }));
}

export function selectHogwartsHeroIds(
  requested: readonly string[] | undefined,
  numPlayers: number,
  availableHeroIds: readonly string[] = DEFAULT_HOGWARTS_HERO_IDS,
): string[] {
  const available = availableHeroIds.filter((heroId) => HERO_NAMES.has(heroId as HogwartsHeroId));
  const fallback = available.length ? available : DEFAULT_HOGWARTS_HERO_IDS;
  const selected: string[] = [];
  for (const heroId of requested ?? []) {
    if (fallback.includes(heroId) && !selected.includes(heroId)) {
      selected.push(heroId);
    }
  }
  for (const heroId of fallback) {
    if (!selected.includes(heroId)) selected.push(heroId);
  }
  return selected.slice(0, Math.max(1, Math.min(fallback.length, numPlayers)));
}

export function createHogwartsSetupData(
  gameNumber: number,
  heroIds: readonly string[],
): HogwartsSetupData {
  return {
    gameNumber,
    heroIds: selectHogwartsHeroIds(
      heroIds,
      getHogwartsHeroIdsForYear(gameNumber).length,
      getHogwartsHeroIdsForYear(gameNumber),
    ),
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
  return createHogwartsSetupData(
    selectedGameNumber,
    requestedHeroes ?? getHogwartsHeroIdsForYear(selectedGameNumber),
  );
}

export function hogwartsPlayQuery(setup: HogwartsSetupData, seats: number): string {
  const params = new URLSearchParams({
    seats: String(seats),
    year: String(setup.gameNumber ?? 1),
    heroes: (setup.heroIds ?? DEFAULT_HOGWARTS_HERO_IDS).join(','),
  });
  return `?${params.toString()}`;
}
