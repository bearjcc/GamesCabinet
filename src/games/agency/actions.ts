import {
  discardHandAndPlayArea,
  drawOneToHand,
  gainResource,
  refillEmptySlots,
  resetResource,
  trySpendResource,
} from '../shared/deckbuilder';
import {
  cardDef,
  ERA_TARGET_SOLO,
  EXPLORER_I,
  type FacilityState,
  facilityRole,
  facilityStaffSlots,
  HAND_SIZE,
  MAX_FACILITIES,
  starterFacilities,
} from './cards';

export type { FacilityState } from './cards';

export type MissionState = {
  defId: string;
  fundingPlaced: number;
  innovationPlaced: number;
};

export type AgencyState = {
  eraScore: number;
  rivalScore: number;
  funding: number;
  innovation: number;
  deck: string[];
  hand: string[];
  discard: string[];
  playArea: string[];
  market: string[];
  marketDeck: string[];
  marketDiscard: string[];
  facilities: FacilityState[];
  nextFacilityInstance: number;
  mission: MissionState;
  turns: number;
};

export function missionThreshold(
  _mission: MissionState,
  facilities: FacilityState[],
): { funding: number; innovation: number } {
  const staffed = facilities
    .filter((f) => facilityRole(f.cardId) === 'mission-control')
    .reduce((sum, f) => sum + f.assigned.length, 0);
  const reduction = Math.min(2, staffed);
  return {
    funding: Math.max(0, EXPLORER_I.fundingRequired - reduction),
    innovation: Math.max(0, EXPLORER_I.innovationRequired - reduction),
  };
}

export function missionComplete(G: AgencyState): boolean {
  const need = missionThreshold(G.mission, G.facilities);
  return G.mission.fundingPlaced >= need.funding && G.mission.innovationPlaced >= need.innovation;
}

export function findFacility(G: AgencyState, instanceId: string): FacilityState | undefined {
  return G.facilities.find((f) => f.instanceId === instanceId);
}

export function facilityHasSlot(facility: FacilityState): boolean {
  return facility.assigned.length < facilityStaffSlots(facility.cardId);
}

export function canPlaceFacility(G: AgencyState, cardId: string): boolean {
  const def = cardDef(cardId);
  if (def?.kind !== 'facility') return false;
  if (!G.hand.includes(cardId)) return false;
  return G.facilities.length < MAX_FACILITIES;
}

export function placeFacility(G: AgencyState, cardId: string): boolean {
  if (!canPlaceFacility(G, cardId)) return false;
  const handIdx = G.hand.indexOf(cardId);
  if (handIdx < 0) return false;
  G.hand.splice(handIdx, 1);
  const instanceId = `fac-${G.nextFacilityInstance}`;
  G.nextFacilityInstance += 1;
  G.facilities.push({ instanceId, cardId, assigned: [] });
  return true;
}

export function canAssignPerson(
  G: AgencyState,
  cardId: string,
  facilityInstanceId: string,
): boolean {
  const def = cardDef(cardId);
  if (def?.kind !== 'person') return false;
  if (!G.hand.includes(cardId)) return false;
  const facility = findFacility(G, facilityInstanceId);
  if (!facility || !facilityHasSlot(facility)) return false;
  return true;
}

export function assignPerson(G: AgencyState, cardId: string, facilityInstanceId: string): boolean {
  if (!canAssignPerson(G, cardId, facilityInstanceId)) return false;
  const handIdx = G.hand.indexOf(cardId);
  if (handIdx < 0) return false;
  G.hand.splice(handIdx, 1);
  findFacility(G, facilityInstanceId)!.assigned.push(cardId);
  return true;
}

export function canPlayCard(G: AgencyState, cardId: string): boolean {
  if (!G.hand.includes(cardId)) return false;
  const def = cardDef(cardId);
  if (!def) return false;
  if (def.kind === 'facility') return false;
  if (def.kind === 'person') return true;
  return def.kind === 'resource' || def.kind === 'program';
}

export function playCard(
  G: AgencyState,
  cardId: string,
  shuffle: (arr: string[]) => void,
): boolean {
  if (!canPlayCard(G, cardId)) return false;
  const def = cardDef(cardId)!;

  const idx = G.hand.indexOf(cardId);
  if (idx < 0) return false;
  G.hand.splice(idx, 1);

  if (def.kind === 'person') {
    G.funding = gainResource(G.funding, def.onPlayFunding ?? 0);
    G.innovation = gainResource(G.innovation, def.onPlayInnovation ?? 0);
  } else {
    G.funding = gainResource(G.funding, def.fundingGain ?? 0);
    G.innovation = gainResource(G.innovation, def.innovationGain ?? 0);
    if (def.draw) {
      for (let i = 0; i < def.draw; i += 1) {
        drawOneToHand(G.deck, G.hand, G.discard, shuffle);
      }
    }
  }

  G.playArea.push(cardId);
  G.discard.push(cardId);
  const playIdx = G.playArea.indexOf(cardId);
  if (playIdx >= 0) G.playArea.splice(playIdx, 1);
  return true;
}

export function canBuyCard(G: AgencyState, marketIndex: number): boolean {
  const cardId = G.market[marketIndex];
  if (!cardId) return false;
  const def = cardDef(cardId);
  if (!def) return false;
  return G.funding >= def.marketCost;
}

export function buyCard(
  G: AgencyState,
  marketIndex: number,
  shuffle: (arr: string[]) => void,
): boolean {
  if (!canBuyCard(G, marketIndex)) return false;
  const cardId = G.market[marketIndex];
  const def = cardDef(cardId)!;
  const spent = trySpendResource(G.funding, def.marketCost);
  if (spent === null) return false;
  G.funding = spent;
  G.discard.push(cardId);
  G.market[marketIndex] = '';
  refillEmptySlots(
    G.market,
    () => {
      if (G.marketDeck.length === 0) {
        if (G.marketDiscard.length === 0) return '';
        G.marketDeck.push(...G.marketDiscard);
        G.marketDiscard.length = 0;
        shuffle(G.marketDeck);
      }
      const next = G.marketDeck.shift();
      return next ?? '';
    },
    (id) => id,
  );
  return true;
}

export function canContribute(G: AgencyState, funding: number, innovation: number): boolean {
  if (funding < 0 || innovation < 0) return false;
  if (funding === 0 && innovation === 0) return false;
  if (funding > G.funding || innovation > G.innovation) return false;
  return true;
}

export function contributeMission(G: AgencyState, funding: number, innovation: number): boolean {
  if (!canContribute(G, funding, innovation)) return false;
  G.funding -= funding;
  G.innovation -= innovation;
  G.mission.fundingPlaced += funding;
  G.mission.innovationPlaced += innovation;
  return true;
}

/** Turn-start passives from staffed facilities (rulebook: resolve passives). */
export function applyFacilityPassives(G: AgencyState): void {
  for (const facility of G.facilities) {
    const count = facility.assigned.length;
    if (count === 0) continue;
    const role = facilityRole(facility.cardId);
    if (role === 'research') {
      G.innovation = gainResource(G.innovation, count);
    } else if (role === 'administration') {
      G.funding = gainResource(G.funding, count);
    }
  }
}

export function resolveMissionIfReady(G: AgencyState): boolean {
  if (!missionComplete(G)) return false;
  G.eraScore += EXPLORER_I.eraReward;
  G.mission = { defId: EXPLORER_I.id, fundingPlaced: 0, innovationPlaced: 0 };
  return true;
}

export function endTurnCleanup(G: AgencyState, shuffle: (arr: string[]) => void): void {
  resolveMissionIfReady(G);
  discardHandAndPlayArea(G.hand, G.playArea, G.discard);
  G.funding = resetResource();
  G.innovation = resetResource();
  for (let i = 0; i < HAND_SIZE; i += 1) {
    drawOneToHand(G.deck, G.hand, G.discard, shuffle);
  }
  G.turns += 1;
  G.rivalScore += 1;
}

export function checkGameEnd(G: AgencyState): { winner: 'player' } | { winner: 'rival' } | null {
  if (G.eraScore >= ERA_TARGET_SOLO) return { winner: 'player' };
  if (G.rivalScore >= ERA_TARGET_SOLO) return { winner: 'rival' };
  return null;
}

export { starterFacilities };
