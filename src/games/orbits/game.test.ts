import { Client } from 'boardgame.io/client';
import { describe, expect, it } from 'vitest';
import {
  buildSoloDeck,
  HAND_SIZE,
  type OrbitsArea,
  type OrbitsCard,
  type UpgradeCard,
} from './cards';
import { applyLaunchRoll, MAX_FAILURES, Orbits, type OrbitsState } from './game';

let seq = 0;
function uid(prefix: string): string {
  seq += 1;
  return `${prefix}-${seq}`;
}

function fuelCard(value: number): OrbitsCard {
  return { id: uid(`fuel${value}`), kind: 'fuel', fuel: value };
}
function booster(): OrbitsCard {
  return { id: uid('booster'), kind: 'booster' };
}
function satellite(orbit: 'LEO' | 'MEO' | 'GEO', fuelRequired: number): OrbitsCard {
  return {
    id: uid(`sat-${orbit}`),
    kind: 'satellite',
    name: `${orbit} sat`,
    orbit,
    fuelRequired,
    points: 1,
    massKg: 1,
  };
}
function ready(): OrbitsCard {
  return { id: uid('ready'), kind: 'ready' };
}
function counter(resolves: 'weather' | 'engine' | 'junk'): OrbitsCard {
  return {
    id: uid(`counter-${resolves}`),
    kind: 'countermeasure',
    counter: 'sunny-skies',
    resolves,
  };
}
function upgrade(resolves: 'design-failure' | 'weather' | 'engine' | 'junk'): UpgradeCard {
  return {
    id: uid(`upgrade-${resolves}`),
    kind: 'upgrade',
    upgrade: 'radar',
    resolves,
  };
}
function faceDown(card: UpgradeCard) {
  return { card, revealed: false };
}

function emptyArea(partial: Partial<OrbitsArea> = {}): OrbitsArea {
  return { satellites: [], fuel: [], upgrades: [], onCrawler: false, ...partial };
}

function mkState(partial: Partial<OrbitsState> = {}): OrbitsState {
  return {
    deck: [],
    discard: [],
    hands: [[]],
    areas: [emptyArea()],
    scores: [0],
    failures: 0,
    turns: 0,
    drewThisTurn: true,
    refillPending: false,
    deckExhausted: false,
    launch: null,
    ...partial,
  };
}

function start(state: OrbitsState, seed = 'orbits-test') {
  const client = Client({ game: { ...Orbits, seed, setup: () => state }, numPlayers: 1 });
  client.start();
  return client;
}

type OrbitsClient = ReturnType<typeof start>;

function G(client: OrbitsClient): OrbitsState {
  const state = client.getState();
  if (!state) throw new Error('missing state');
  return state.G as OrbitsState;
}

function gameover(client: OrbitsClient): { score: number; reason: string } | undefined {
  return client.getState()?.ctx.gameover as { score: number; reason: string } | undefined;
}

/** Area stocked for launch: one LEO-100 satellite fully fuelled, on the crawler. */
function crawlerArea(extra: Partial<OrbitsArea> = {}): OrbitsArea {
  return emptyArea({
    satellites: [satellite('LEO', 100)],
    fuel: [fuelCard(100)],
    onCrawler: true,
    ...extra,
  });
}

describe('setup', () => {
  it('shuffles the solo deck and deals a five-card hand', () => {
    const client = Client({ game: { ...Orbits, seed: 'orbits-setup' }, numPlayers: 1 });
    client.start();
    const g = G(client as unknown as OrbitsClient);
    expect(g.hands[0]).toHaveLength(HAND_SIZE);
    expect(g.deck).toHaveLength(buildSoloDeck().length - HAND_SIZE);
    expect(g.drewThisTurn).toBe(false);
    expect(g.scores).toEqual([0]);
  });
});

describe('main phase turns', () => {
  it('draws once per turn', () => {
    const top = fuelCard(25);
    const client = start(mkState({ deck: [top, fuelCard(50)], drewThisTurn: false }));
    client.moves.drawCard();
    expect(G(client).hands[0]).toEqual([top]);
    client.moves.drawCard();
    expect(G(client).hands[0]).toHaveLength(1);
  });

  it('ends the game when the draw pile runs out (no reshuffle solo)', () => {
    const client = start(mkState({ deck: [], drewThisTurn: false, scores: [42] }));
    client.moves.drawCard();
    expect(gameover(client)).toEqual({ score: 42, reason: 'deck' });
  });

  it('rejects card plays before drawing', () => {
    const sat = satellite('LEO', 25);
    const client = start(mkState({ hands: [[sat]], drewThisTurn: false }));
    client.moves.playCard(sat.id);
    expect(G(client).areas[0].satellites).toHaveLength(0);
  });

  it('plays satellites, then fuel up to the requirement, ending the turn each play', () => {
    const sat = satellite('LEO', 100);
    const f50 = fuelCard(50);
    const client = start(mkState({ hands: [[sat, f50]], deck: [fuelCard(25)] }));
    client.moves.playCard(sat.id);
    expect(G(client).areas[0].satellites).toHaveLength(1);
    expect(G(client).turns).toBe(1);
    expect(G(client).drewThisTurn).toBe(false);
    client.moves.drawCard();
    client.moves.playCard(f50.id);
    expect(G(client).areas[0].fuel).toEqual([f50]);
  });

  it('rejects a second satellite on a different orbit', () => {
    const meo = satellite('MEO', 50);
    const client = start(
      mkState({ hands: [[meo]], areas: [emptyArea({ satellites: [satellite('LEO', 25)] })] }),
    );
    client.moves.playCard(meo.id);
    expect(G(client).areas[0].satellites).toHaveLength(1);
    expect(G(client).hands[0]).toHaveLength(1);
  });

  it('rejects fuel beyond the satellite requirement', () => {
    const f100 = fuelCard(100);
    const client = start(
      mkState({
        hands: [[f100]],
        areas: [emptyArea({ satellites: [satellite('LEO', 25)] })],
      }),
    );
    client.moves.playCard(f100.id);
    expect(G(client).areas[0].fuel).toHaveLength(0);
  });

  it('plays upgrades face down', () => {
    const up = upgrade('weather');
    const client = start(mkState({ hands: [[up]] }));
    client.moves.playCard(up.id);
    expect(G(client).areas[0].upgrades).toEqual([{ card: up, revealed: false }]);
  });

  it('cannot play countermeasures or unknown cards in the main phase', () => {
    const cm = counter('weather');
    const client = start(mkState({ hands: [[cm]] }));
    client.moves.playCard(cm.id);
    client.moves.playCard('nope');
    expect(G(client).hands[0]).toHaveLength(1);
    expect(G(client).discard).toHaveLength(0);
  });

  it('rejects ready for takeoff before the crawler declaration', () => {
    const r = ready();
    const client = start(mkState({ hands: [[r]], areas: [crawlerArea({ onCrawler: false })] }));
    client.moves.playCard(r.id);
    expect(G(client).launch).toBeNull();
  });

  it('discards a card as the turn action', () => {
    const cm = counter('engine');
    const client = start(mkState({ hands: [[cm, fuelCard(25)]] }));
    client.moves.discardCard(cm.id);
    expect(G(client).discard).toEqual([cm]);
    expect(G(client).drewThisTurn).toBe(false);
    client.moves.discardCard('anything');
    expect(G(client).discard).toHaveLength(1);
  });

  it('declares on the crawler only with complete fuel', () => {
    const client = start(
      mkState({
        areas: [emptyArea({ satellites: [satellite('LEO', 100)], fuel: [fuelCard(50)] })],
      }),
    );
    client.moves.declareCrawler();
    expect(G(client).areas[0].onCrawler).toBe(false);
    const ready_client = start(
      mkState({ areas: [crawlerArea({ onCrawler: false, fuel: [fuelCard(100)] })] }),
    );
    ready_client.moves.declareCrawler();
    expect(G(ready_client).areas[0].onCrawler).toBe(true);
    ready_client.moves.declareCrawler();
    expect(G(ready_client).areas[0].onCrawler).toBe(true);
  });

  it('locks satellite and fuel plays once on the crawler', () => {
    const sat = satellite('LEO', 25);
    const f = fuelCard(25);
    const client = start(mkState({ hands: [[sat, f]], areas: [crawlerArea()] }));
    client.moves.playCard(sat.id);
    client.moves.playCard(f.id);
    expect(G(client).areas[0].satellites).toHaveLength(1);
    expect(G(client).areas[0].fuel).toHaveLength(1);
  });
});

describe('launch phase', () => {
  it('starts the launch when ready for takeoff is played on the crawler', () => {
    const r = ready();
    const client = start(mkState({ hands: [[r]], areas: [crawlerArea()] }));
    client.moves.playCard(r.id);
    expect(G(client).launch).toEqual({ round: 0, pending: null });
    expect(G(client).discard).toEqual([r]);
    expect(G(client).hands[0]).toHaveLength(0);
  });

  it('rolls hazards: clear rounds advance, strict rolls demand countermeasures', () => {
    const area = crawlerArea();
    const state = mkState({ launch: { round: 0, pending: null }, areas: [area] });
    // roll 1 -> strict pending design-failure
    applyLaunchRoll(state, area, 1);
    expect(state.launch).toEqual({
      round: 0,
      pending: { hazard: 'design-failure', countermeasureOnly: true },
    });
    // roll 2 -> non-strict pending weather
    state.launch = { round: 1, pending: null };
    applyLaunchRoll(state, area, 2);
    expect(state.launch?.pending).toEqual({ hazard: 'weather', countermeasureOnly: false });
    // roll 5 -> clear, engine round skipped ahead
    state.launch = { round: 2, pending: null };
    applyLaunchRoll(state, area, 5);
    expect(state.launch).toEqual({ round: 3, pending: null });
  });

  it('skips hazards covered by a revealed upgrade', () => {
    const area = crawlerArea({
      upgrades: [faceDown(upgrade('weather'))],
    });
    area.upgrades[0].revealed = true;
    const state = mkState({ launch: { round: 1, pending: null }, areas: [area] });
    applyLaunchRoll(state, area, 1);
    expect(state.launch).toEqual({ round: 2, pending: null });
  });

  it('ignores rolls without a live launch or round', () => {
    const area = crawlerArea();
    const idle = mkState({ areas: [area] });
    applyLaunchRoll(idle, area, 1);
    expect(idle.launch).toBeNull();
    const done = mkState({ launch: { round: 4, pending: null }, areas: [area] });
    applyLaunchRoll(done, area, 1);
    expect(done.launch).toEqual({ round: 4, pending: null });
  });

  it('gates the hazard roll on launch state', () => {
    const idle = start(mkState());
    idle.moves.rollHazard();
    expect(G(idle).launch).toBeNull();

    const pending = start(
      mkState({
        launch: { round: 0, pending: { hazard: 'weather', countermeasureOnly: false } },
        areas: [crawlerArea()],
      }),
    );
    pending.moves.rollHazard();
    expect(G(pending).launch?.round).toBe(0);
  });

  it('resolves a hazard with a matching countermeasure', () => {
    const cm = counter('weather');
    const client = start(
      mkState({
        hands: [[cm]],
        launch: { round: 1, pending: { hazard: 'weather', countermeasureOnly: true } },
        areas: [crawlerArea()],
      }),
    );
    client.moves.resolveWithCountermeasure(cm.id);
    expect(G(client).launch).toEqual({ round: 2, pending: null });
    expect(G(client).discard).toEqual([cm]);
  });

  it('rejects countermeasures that do not match the hazard', () => {
    const cm = counter('engine');
    const client = start(
      mkState({
        hands: [[cm]],
        launch: { round: 1, pending: { hazard: 'weather', countermeasureOnly: true } },
        areas: [crawlerArea()],
      }),
    );
    client.moves.resolveWithCountermeasure(cm.id);
    client.moves.resolveWithCountermeasure('missing');
    expect(G(client).launch?.round).toBe(1);
  });

  it('flips a played face-down upgrade to resolve, but never on a strict roll', () => {
    const radar = upgrade('weather');
    const strict = start(
      mkState({
        launch: { round: 1, pending: { hazard: 'weather', countermeasureOnly: true } },
        areas: [crawlerArea({ upgrades: [faceDown(radar)] })],
      }),
    );
    strict.moves.resolveWithUpgrade(radar.id);
    expect(G(strict).areas[0].upgrades[0].revealed).toBe(false);

    const loose = start(
      mkState({
        launch: { round: 1, pending: { hazard: 'weather', countermeasureOnly: false } },
        areas: [crawlerArea({ upgrades: [faceDown(radar)] })],
      }),
    );
    loose.moves.resolveWithUpgrade(radar.id);
    expect(G(loose).areas[0].upgrades[0].revealed).toBe(true);
    expect(G(loose).launch?.round).toBe(2);
    loose.moves.resolveWithUpgrade('missing');
    expect(G(loose).launch?.round).toBe(2);
  });

  it('plays a matching upgrade from hand face up during the launch', () => {
    const radar = upgrade('weather');
    const client = start(
      mkState({
        hands: [[radar]],
        launch: { round: 1, pending: { hazard: 'weather', countermeasureOnly: false } },
        areas: [crawlerArea()],
      }),
    );
    client.moves.playUpgradeFaceUp(radar.id);
    expect(G(client).areas[0].upgrades).toEqual([{ card: radar, revealed: true }]);
    expect(G(client).launch?.round).toBe(2);
  });

  it('rejects face-up upgrades that are missing, wrong kind, or off-hazard', () => {
    const radar = upgrade('weather');
    const wrong = upgrade('junk');
    const f = fuelCard(50);
    const client = start(
      mkState({
        hands: [[wrong, f]],
        launch: { round: 1, pending: { hazard: 'weather', countermeasureOnly: false } },
        areas: [crawlerArea({ upgrades: [faceDown(radar)] })],
      }),
    );
    client.moves.playUpgradeFaceUp('missing');
    client.moves.playUpgradeFaceUp(wrong.id);
    client.moves.playUpgradeFaceUp(f.id);
    expect(G(client).launch?.round).toBe(1);
    expect(G(client).areas[0].upgrades).toHaveLength(1);
    expect(G(client).hands[0]).toHaveLength(2);
  });

  it('scores the success when the last-round hazard is countered', () => {
    const cm = counter('junk');
    const client = start(
      mkState({
        hands: [[cm]],
        launch: { round: 3, pending: { hazard: 'junk', countermeasureOnly: true } },
        areas: [crawlerArea()],
      }),
    );
    client.moves.resolveWithCountermeasure(cm.id);
    const g = G(client);
    expect(g.launch).toBeNull();
    expect(g.scores[0]).toBe(100);
    expect(g.refillPending).toBe(true);
  });

  it('scores the success when a hand upgrade resolves the last round', () => {
    const net = upgrade('junk');
    const client = start(
      mkState({
        hands: [[net]],
        launch: { round: 3, pending: { hazard: 'junk', countermeasureOnly: false } },
        areas: [crawlerArea()],
      }),
    );
    client.moves.playUpgradeFaceUp(net.id);
    const g = G(client);
    expect(g.launch).toBeNull();
    expect(g.scores[0]).toBe(100);
    expect(g.areas[0].upgrades).toEqual([{ card: net, revealed: true }]);
  });

  it('cannot play a hand upgrade on a strict roll', () => {
    const net = upgrade('junk');
    const client = start(
      mkState({
        hands: [[net]],
        launch: { round: 3, pending: { hazard: 'junk', countermeasureOnly: true } },
        areas: [crawlerArea()],
      }),
    );
    client.moves.playUpgradeFaceUp(net.id);
    expect(G(client).launch?.pending).not.toBeNull();
    expect(G(client).hands[0]).toHaveLength(1);
  });

  it('ignores played upgrades that resolve a different hazard', () => {
    const other = upgrade('engine');
    const client = start(
      mkState({
        launch: { round: 1, pending: { hazard: 'weather', countermeasureOnly: false } },
        areas: [crawlerArea({ upgrades: [faceDown(other)] })],
      }),
    );
    client.moves.resolveWithUpgrade(other.id);
    expect(G(client).launch?.round).toBe(1);
    expect(G(client).areas[0].upgrades[0].revealed).toBe(false);
  });

  it('finalises the success when design failure is fixed on the last round', () => {
    const qc = upgrade('design-failure');
    const area = crawlerArea({ upgrades: [faceDown(qc)] });
    const client = start(
      mkState({
        launch: { round: 3, pending: { hazard: 'design-failure', countermeasureOnly: false } },
        areas: [area],
      }),
    );
    client.moves.resolveDesignFailure(qc.id);
    const g = G(client);
    expect(g.launch).toBeNull();
    expect(g.scores[0]).toBe(100);
  });

  it('gates discards and hazard resolution on the right pending state', () => {
    const cm = counter('weather');
    const inLaunch = start(
      mkState({
        hands: [[cm]],
        launch: { round: 1, pending: null },
        areas: [crawlerArea()],
      }),
    );
    inLaunch.moves.resolveWithCountermeasure(cm.id);
    expect(G(inLaunch).hands[0]).toHaveLength(1);

    const weather = start(
      mkState({
        launch: { round: 1, pending: { hazard: 'weather', countermeasureOnly: false } },
        areas: [crawlerArea()],
      }),
    );
    weather.moves.resolveDesignFailure('anything');
    expect(G(weather).launch?.round).toBe(1);

    const drawn = start(mkState({ hands: [[cm]] }));
    drawn.moves.discardCard('missing');
    expect(G(drawn).discard).toHaveLength(0);
  });

  it('resolves design failure by discarding a played card at any strictness', () => {
    const sacrificial = fuelCard(50);
    const area = crawlerArea();
    area.fuel.push(sacrificial);
    const client = start(
      mkState({
        launch: { round: 0, pending: { hazard: 'design-failure', countermeasureOnly: true } },
        areas: [area],
      }),
    );
    client.moves.resolveDesignFailure('not-played');
    expect(G(client).launch?.round).toBe(0);
    client.moves.resolveDesignFailure(sacrificial.id);
    expect(G(client).launch).toEqual({ round: 1, pending: null });
    expect(G(client).discard).toEqual([sacrificial]);
    expect(G(client).areas[0].fuel).toHaveLength(1);
  });

  it('resolves design failure by discarding a face-down upgrade', () => {
    const qc = upgrade('design-failure');
    const area = crawlerArea({ upgrades: [faceDown(qc)] });
    const client = start(
      mkState({
        launch: { round: 0, pending: { hazard: 'design-failure', countermeasureOnly: true } },
        areas: [area],
      }),
    );
    client.moves.resolveDesignFailure(qc.id);
    expect(G(client).launch).toEqual({ round: 1, pending: null });
    expect(G(client).areas[0].upgrades).toHaveLength(0);
  });

  it('auto-clears rounds covered by revealed upgrades through to a scored success', () => {
    const r = ready();
    const upgrades = (['design-failure', 'weather', 'engine', 'junk'] as const).map((h) => ({
      card: upgrade(h),
      revealed: true,
    }));
    const client = start(mkState({ hands: [[r]], areas: [crawlerArea({ upgrades })] }));
    client.moves.playCard(r.id);
    for (let round = 0; round < 4; round++) client.moves.rollHazard();
    const g = G(client);
    expect(g.launch).toBeNull();
    expect(g.scores[0]).toBe(100);
    expect(g.areas[0].satellites).toHaveLength(0);
    expect(g.refillPending).toBe(true);
  });

  it('finalises a successful launch from the last round via upgrade flip', () => {
    const net = upgrade('junk');
    const client = start(
      mkState({
        launch: { round: 3, pending: { hazard: 'junk', countermeasureOnly: false } },
        areas: [crawlerArea({ upgrades: [faceDown(net)] })],
      }),
    );
    client.moves.resolveWithUpgrade(net.id);
    const g = G(client);
    expect(g.launch).toBeNull();
    expect(g.scores[0]).toBe(100);
    expect(g.areas[0].satellites).toHaveLength(0);
    expect(g.areas[0].fuel).toHaveLength(0);
    expect(g.areas[0].onCrawler).toBe(false);
    expect(g.refillPending).toBe(true);
  });

  it('aborts cleanly in early rounds, keeping the stack on the crawler', () => {
    const client = start(mkState({ launch: { round: 1, pending: null }, areas: [crawlerArea()] }));
    client.moves.abortLaunch();
    const g = G(client);
    expect(g.launch).toBeNull();
    expect(g.failures).toBe(0);
    expect(g.areas[0].satellites).toHaveLength(1);
    expect(g.areas[0].onCrawler).toBe(true);
    expect(g.refillPending).toBe(true);
  });

  it('fails in later rounds, discarding the stack and counting the failure', () => {
    const client = start(mkState({ launch: { round: 2, pending: null }, areas: [crawlerArea()] }));
    client.moves.abortLaunch();
    const g = G(client);
    expect(g.failures).toBe(1);
    expect(g.areas[0].satellites).toHaveLength(0);
    expect(g.areas[0].onCrawler).toBe(false);
    expect(g.discard).toHaveLength(2);
  });

  it('ends the game after two failed rockets', () => {
    const client = start(
      mkState({
        launch: { round: 3, pending: null },
        areas: [crawlerArea()],
        failures: MAX_FAILURES - 1,
        scores: [77],
      }),
    );
    client.moves.abortLaunch();
    expect(gameover(client)).toEqual({ score: 77, reason: 'failures' });
  });

  it('ignores aborts outside the launch phase', () => {
    const client = start(mkState());
    client.moves.abortLaunch();
    expect(G(client).refillPending).toBe(false);
  });
});

describe('post-launch refill', () => {
  function refilling(hand: OrbitsCard[], deck: OrbitsCard[], extra: Partial<OrbitsState> = {}) {
    return start(mkState({ hands: [hand], deck, refillPending: true, ...extra }));
  }

  it('blocks main-phase moves while the refill decision is pending', () => {
    const client = refilling([fuelCard(25)], [fuelCard(50)]);
    client.moves.drawCard();
    client.moves.playCard('x');
    client.moves.discardCard('x');
    client.moves.declareCrawler();
    expect(G(client).hands[0]).toHaveLength(1);
    expect(G(client).deck).toHaveLength(1);
  });

  it('draws back up to five and ends the launch turn', () => {
    const hand = [fuelCard(25)];
    const deck = [fuelCard(25), fuelCard(50), fuelCard(75), fuelCard(100), booster()];
    const client = refilling(hand, deck);
    client.moves.refillHand(false);
    expect(G(client).hands[0]).toHaveLength(HAND_SIZE);
    expect(G(client).refillPending).toBe(false);
    expect(G(client).drewThisTurn).toBe(false);
    expect(G(client).turns).toBe(1);
  });

  it('may discard the whole hand before refilling', () => {
    const hand = [counter('weather'), counter('engine')];
    const deck = Array.from({ length: 6 }, () => fuelCard(25));
    const client = refilling(hand, deck);
    client.moves.refillHand(true);
    expect(G(client).discard).toHaveLength(2);
    expect(G(client).hands[0]).toHaveLength(HAND_SIZE);
    expect(G(client).hands[0].every((c) => c.kind === 'fuel')).toBe(true);
  });

  it('rejects refill when none is pending', () => {
    const client = start(mkState({ hands: [[fuelCard(25)]] }));
    client.moves.refillHand(false);
    expect(G(client).hands[0]).toHaveLength(1);
  });

  it('ends the game when the refill cannot be completed', () => {
    const client = refilling([fuelCard(25)], [fuelCard(50)], { scores: [9] });
    client.moves.refillHand(false);
    expect(G(client).hands[0]).toHaveLength(2);
    expect(gameover(client)).toEqual({ score: 9, reason: 'deck' });
  });
});
