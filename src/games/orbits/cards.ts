/**
 * ORBITS card model and content.
 * Satellite stats come from the 2021-07-26 "Rockets and Rails ORBITS" rules email.
 * Deck counts are solo tuning data (rules-as-data); the printed design note
 * (2025-10-14) does not specify deck composition.
 */

export type OrbitHeight = 'LEO' | 'MEO' | 'GEO';

export type HazardKind = 'design-failure' | 'weather' | 'engine' | 'junk';

export type UpgradeKind = 'quality-control' | 'radar' | 'extra-engine' | 'space-net';

export type CounterKind = 'sunny-skies' | 'relight' | 'course-adjustment';

export type FuelCard = { id: string; kind: 'fuel'; fuel: number };
export type BoosterCard = { id: string; kind: 'booster' };
export type SatelliteCard = {
  id: string;
  kind: 'satellite';
  name: string;
  orbit: OrbitHeight;
  fuelRequired: number;
  points: number;
  massKg: number;
};
export type ReadyCard = { id: string; kind: 'ready' };
export type CounterCard = {
  id: string;
  kind: 'countermeasure';
  counter: CounterKind;
  resolves: HazardKind;
};
export type UpgradeCard = {
  id: string;
  kind: 'upgrade';
  upgrade: UpgradeKind;
  resolves: HazardKind;
};

export type OrbitsCard =
  | FuelCard
  | BoosterCard
  | SatelliteCard
  | ReadyCard
  | CounterCard
  | UpgradeCard;

export type PlayedUpgrade = { card: UpgradeCard; revealed: boolean };

export type OrbitsArea = {
  satellites: OrbitsCard[];
  fuel: OrbitsCard[];
  upgrades: PlayedUpgrade[];
  onCrawler: boolean;
};

export const BOOSTER_FUEL = 200;
export const BOOSTER_POINTS = 100;
export const MAX_BOOSTERS = 2;
export const HAND_SIZE = 5;

/** Launch-phase hazard order: design, weather, engine, junk. */
export const HAZARD_ROUNDS: HazardKind[] = ['design-failure', 'weather', 'engine', 'junk'];

const SATELLITES: Omit<SatelliteCard, 'kind'>[] = [
  {
    id: 'sat-hubble',
    name: 'Hubble Space Telescope',
    orbit: 'LEO',
    fuelRequired: 225,
    points: 10,
    massKg: 11110,
  },
  {
    id: 'sat-fermi',
    name: 'Fermi Gamma Ray Telescope',
    orbit: 'LEO',
    fuelRequired: 100,
    points: 4,
    massKg: 4303,
  },
  {
    id: 'sat-sentinel-2a',
    name: 'Sentinel 2A',
    orbit: 'LEO',
    fuelRequired: 25,
    points: 1,
    massKg: 1130,
  },
  {
    id: 'sat-sentinel-2b',
    name: 'Sentinel 2B',
    orbit: 'LEO',
    fuelRequired: 25,
    points: 1,
    massKg: 1130,
  },
  {
    id: 'sat-sentinel-6',
    name: 'Sentinel 6',
    orbit: 'LEO',
    fuelRequired: 25,
    points: 1,
    massKg: 1192,
  },
  {
    id: 'sat-beidou',
    name: 'Beidou Compass M6',
    orbit: 'MEO',
    fuelRequired: 125,
    points: 5,
    massKg: 3800,
  },
  {
    id: 'sat-glonass',
    name: 'Glonass 2425',
    orbit: 'MEO',
    fuelRequired: 50,
    points: 2,
    massKg: 1480,
  },
  {
    id: 'sat-navstar-260',
    name: 'Navstar GPS 260',
    orbit: 'MEO',
    fuelRequired: 75,
    points: 3,
    massKg: 1630,
  },
  {
    id: 'sat-navstar-258',
    name: 'Navstar GPS 258',
    orbit: 'MEO',
    fuelRequired: 75,
    points: 3,
    massKg: 1630,
  },
  {
    id: 'sat-star-one-d1',
    name: 'Star One D1',
    orbit: 'GEO',
    fuelRequired: 325,
    points: 15,
    massKg: 6433,
  },
  {
    id: 'sat-skynet-4c',
    name: 'Skynet 4C',
    orbit: 'GEO',
    fuelRequired: 75,
    points: 3,
    massKg: 1474,
  },
  { id: 'sat-thor-5', name: 'Thor-5', orbit: 'GEO', fuelRequired: 100, points: 4, massKg: 2024 },
];

const COUNTERS: { counter: CounterKind; resolves: HazardKind }[] = [
  { counter: 'sunny-skies', resolves: 'weather' },
  { counter: 'relight', resolves: 'engine' },
  { counter: 'course-adjustment', resolves: 'junk' },
];

const UPGRADES: { upgrade: UpgradeKind; resolves: HazardKind }[] = [
  { upgrade: 'quality-control', resolves: 'design-failure' },
  { upgrade: 'radar', resolves: 'weather' },
  { upgrade: 'extra-engine', resolves: 'engine' },
  { upgrade: 'space-net', resolves: 'junk' },
];

/** Solo deck: hazards removed per the 1-player variant. */
export function buildSoloDeck(): OrbitsCard[] {
  const deck: OrbitsCard[] = [];
  const fuelCounts: [number, number][] = [
    [25, 6],
    [50, 6],
    [75, 4],
    [100, 4],
  ];
  for (const [value, count] of fuelCounts) {
    for (let i = 0; i < count; i++)
      deck.push({ id: `fuel-${value}-${i}`, kind: 'fuel', fuel: value });
  }
  for (let i = 0; i < 4; i++) deck.push({ id: `booster-${i}`, kind: 'booster' });
  for (let i = 0; i < 4; i++) deck.push({ id: `ready-${i}`, kind: 'ready' });
  for (const sat of SATELLITES) deck.push({ ...sat, kind: 'satellite' });
  for (const { counter, resolves } of COUNTERS) {
    for (let i = 0; i < 2; i++) {
      deck.push({ id: `counter-${counter}-${i}`, kind: 'countermeasure', counter, resolves });
    }
  }
  for (const { upgrade, resolves } of UPGRADES) {
    deck.push({ id: `upgrade-${upgrade}`, kind: 'upgrade', upgrade, resolves });
  }
  return deck;
}

export function fuelValue(card: OrbitsCard): number {
  if (card.kind === 'fuel') return card.fuel;
  if (card.kind === 'booster') return BOOSTER_FUEL;
  return 0;
}

/** Points scored per expended card: boosters score less than their fuel. */
export function pointsValue(card: OrbitsCard): number {
  if (card.kind === 'booster') return BOOSTER_POINTS;
  return fuelValue(card);
}

export function fuelRequiredFor(satellites: OrbitsCard[]): number {
  return satellites.reduce((sum, c) => sum + (c.kind === 'satellite' ? c.fuelRequired : 0), 0);
}

export function fuelPlayedValue(area: OrbitsArea): number {
  return area.fuel.reduce((sum, c) => sum + fuelValue(c), 0);
}

export function boosterCount(area: OrbitsArea): number {
  return area.fuel.filter((c) => c.kind === 'booster').length;
}

export function canPlaySatellite(area: OrbitsArea, card: OrbitsCard): boolean {
  if (card.kind !== 'satellite' || area.onCrawler) return false;
  const first = area.satellites[0];
  if (first && first.kind === 'satellite' && first.orbit !== card.orbit) return false;
  return true;
}

export function canPlayFuel(area: OrbitsArea, card: OrbitsCard): boolean {
  if (card.kind !== 'fuel' && card.kind !== 'booster') return false;
  if (area.onCrawler || area.satellites.length === 0) return false;
  if (card.kind === 'booster' && boosterCount(area) >= MAX_BOOSTERS) return false;
  return fuelPlayedValue(area) + fuelValue(card) <= fuelRequiredFor(area.satellites);
}

export function canPlayReady(area: OrbitsArea, card: OrbitsCard): boolean {
  return card.kind === 'ready' && area.onCrawler;
}

/** Fuel requirement met exactly (over-fuelling is illegal). */
export function crawlerReady(area: OrbitsArea): boolean {
  return area.satellites.length > 0 && fuelPlayedValue(area) === fuelRequiredFor(area.satellites);
}

export function revealedUpgradeFor(area: OrbitsArea, hazard: HazardKind): boolean {
  return area.upgrades.some((u) => u.revealed && u.card.resolves === hazard);
}

/** Solo d6: 1 = countermeasure only, 2-3 = upgrade or countermeasure, 4-6 = clear. */
export function hazardFromRoll(roll: number): { countermeasureOnly: boolean } | null {
  if (roll === 1) return { countermeasureOnly: true };
  if (roll === 2 || roll === 3) return { countermeasureOnly: false };
  return null;
}
