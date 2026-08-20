import { describe, expect, it } from 'vitest';
import {
  BOOSTER_FUEL,
  BOOSTER_POINTS,
  buildSoloDeck,
  canPlayFuel,
  canPlayReady,
  canPlaySatellite,
  fuelPlayedValue,
  fuelRequiredFor,
  fuelValue,
  hazardFromRoll,
  type OrbitsArea,
  type OrbitsCard,
  pointsValue,
} from './cards';

function fuel(value: number, n = 0): OrbitsCard {
  return { id: `fuel-${value}-${n}`, kind: 'fuel', fuel: value };
}

function satellite(orbit: 'LEO' | 'MEO' | 'GEO', fuelRequired: number): OrbitsCard {
  return {
    id: `sat-${orbit}-${fuelRequired}`,
    kind: 'satellite',
    name: `${orbit} test sat`,
    orbit,
    fuelRequired,
    points: 1,
    massKg: 1,
  };
}

function emptyArea(partial: Partial<OrbitsArea> = {}): OrbitsArea {
  return { satellites: [], fuel: [], upgrades: [], onCrawler: false, ...partial };
}

describe('buildSoloDeck', () => {
  it('builds a 50-card solo deck with unique ids and no hazards', () => {
    const deck = buildSoloDeck();
    expect(deck).toHaveLength(50);
    expect(new Set(deck.map((c) => c.id)).size).toBe(50);
    const byKind = new Map<string, number>();
    for (const c of deck) byKind.set(c.kind, (byKind.get(c.kind) ?? 0) + 1);
    expect(byKind.get('fuel')).toBe(20);
    expect(byKind.get('booster')).toBe(4);
    expect(byKind.get('ready')).toBe(4);
    expect(byKind.get('satellite')).toBe(12);
    expect(byKind.get('countermeasure')).toBe(6);
    expect(byKind.get('upgrade')).toBe(4);
  });

  it('carries the satellite manifest from the 2021 rules email', () => {
    const deck = buildSoloDeck();
    const hubble = deck.find((c) => c.id === 'sat-hubble');
    expect(hubble).toMatchObject({
      kind: 'satellite',
      orbit: 'LEO',
      fuelRequired: 225,
      points: 10,
    });
    const starOne = deck.find((c) => c.id === 'sat-star-one-d1');
    expect(starOne).toMatchObject({ orbit: 'GEO', fuelRequired: 325, points: 15 });
  });
});

describe('card values', () => {
  it('scores boosters below their fuel value', () => {
    expect(fuelValue(fuel(25))).toBe(25);
    expect(fuelValue({ id: 'b0', kind: 'booster' })).toBe(BOOSTER_FUEL);
    expect(fuelValue(satellite('LEO', 25))).toBe(0);
    expect(pointsValue({ id: 'b1', kind: 'booster' })).toBe(BOOSTER_POINTS);
    expect(pointsValue(fuel(75))).toBe(75);
    expect(pointsValue(satellite('GEO', 100))).toBe(0);
  });

  it('sums fuel requirements across satellites', () => {
    expect(fuelRequiredFor([])).toBe(0);
    expect(fuelRequiredFor([satellite('LEO', 100), satellite('LEO', 25)])).toBe(125);
    expect(fuelRequiredFor([satellite('LEO', 100), fuel(50)])).toBe(100);
  });

  it('sums played fuel including boosters', () => {
    const area = emptyArea({ fuel: [fuel(50), { id: 'b', kind: 'booster' }] });
    expect(fuelPlayedValue(area)).toBe(50 + BOOSTER_FUEL);
  });
});

describe('play legality', () => {
  it('requires satellites to share one orbit until on the crawler', () => {
    const empty = emptyArea();
    expect(canPlaySatellite(empty, satellite('LEO', 25))).toBe(true);
    const leo = emptyArea({ satellites: [satellite('LEO', 25)] });
    expect(canPlaySatellite(leo, satellite('LEO', 100))).toBe(true);
    expect(canPlaySatellite(leo, satellite('GEO', 100))).toBe(false);
    const crawler = emptyArea({ satellites: [satellite('LEO', 25)], onCrawler: true });
    expect(canPlaySatellite(crawler, satellite('LEO', 100))).toBe(false);
  });

  it('gates fuel behind satellites, the fuel cap, and booster limits', () => {
    const noSat = emptyArea();
    expect(canPlayFuel(noSat, fuel(25))).toBe(false);
    expect(canPlayFuel(noSat, { id: 'r1', kind: 'ready' })).toBe(false);
    const area = emptyArea({ satellites: [satellite('LEO', 100)] });
    expect(canPlayFuel(area, fuel(100))).toBe(true);
    const nearlyFull = emptyArea({
      satellites: [satellite('LEO', 100)],
      fuel: [fuel(75)],
    });
    expect(canPlayFuel(nearlyFull, fuel(50))).toBe(false);
    expect(canPlayFuel(nearlyFull, fuel(25))).toBe(true);
    const twoBoosters = emptyArea({
      satellites: [satellite('GEO', 325)],
      fuel: [
        { id: 'b0', kind: 'booster' },
        { id: 'b1', kind: 'booster' },
      ],
    });
    expect(canPlayFuel(twoBoosters, { id: 'b2', kind: 'booster' })).toBe(false);
    const crawler = emptyArea({
      satellites: [satellite('LEO', 25)],
      onCrawler: true,
    });
    expect(canPlayFuel(crawler, fuel(25))).toBe(false);
  });

  it('only launches from the crawler', () => {
    const ready: OrbitsCard = { id: 'r0', kind: 'ready' };
    expect(canPlayReady(emptyArea(), ready)).toBe(false);
    expect(canPlayReady(emptyArea({ onCrawler: true }), ready)).toBe(true);
  });
});

describe('hazardFromRoll', () => {
  it('maps solo d6 rolls to hazard strictness', () => {
    expect(hazardFromRoll(1)).toEqual({ countermeasureOnly: true });
    expect(hazardFromRoll(2)).toEqual({ countermeasureOnly: false });
    expect(hazardFromRoll(3)).toEqual({ countermeasureOnly: false });
    expect(hazardFromRoll(4)).toBeNull();
    expect(hazardFromRoll(5)).toBeNull();
    expect(hazardFromRoll(6)).toBeNull();
  });
});
