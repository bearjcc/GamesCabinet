import { getCard, getHero, getHorcrux, getProficiency } from './engine/dataManager';
import { getCardInstance } from './engine/gameState';
import { getEffectiveCardCost } from './engine/proficiencies';
import type { HogwartsGameState } from './engine/types';

function totalAssignedAttack(G: HogwartsGameState): number {
  return Object.values(G.attackAssignments).reduce((a, b) => a + b, 0);
}

export function unassignedAttack(G: HogwartsGameState, playerId: string): number {
  const player = G.players[playerId];
  if (!player) return 0;
  return Math.max(0, player.attackTokens - totalAssignedAttack(G));
}

export interface ActionGate {
  allowed: boolean;
  reason?: string;
}

export function canHeroAct(G: HogwartsGameState, playerId: string): ActionGate {
  if (G.isGameOver) return { allowed: false, reason: 'Game over.' };
  if (G.currentPlayerId !== playerId) return { allowed: false, reason: 'Not your turn.' };
  if (G.currentPhase !== 'HERO_ACTION') return { allowed: false, reason: 'Hero action only.' };
  if (G.pendingChoice) return { allowed: false, reason: 'Resolve the choice first.' };
  return { allowed: true };
}

export function resolveHandCardTap(
  G: HogwartsGameState,
  playerId: string,
  cardInstanceId: string,
): 'play' | 'inspect' {
  return canPlayCard(G, playerId, cardInstanceId).allowed ? 'play' : 'inspect';
}

export function canPlayCard(
  G: HogwartsGameState,
  playerId: string,
  cardInstanceId: string,
): ActionGate {
  const gate = canHeroAct(G, playerId);
  if (!gate.allowed) return gate;
  const player = G.players[playerId];
  if (!player?.hand.includes(cardInstanceId)) {
    return { allowed: false, reason: 'Card not in hand.' };
  }
  return { allowed: true };
}

export function canBuyAtIndex(
  G: HogwartsGameState,
  playerId: string,
  marketIndex: number,
): ActionGate {
  const gate = canHeroAct(G, playerId);
  if (!gate.allowed) return gate;
  const player = G.players[playerId];
  const slotId = G.market.availableCards[marketIndex];
  if (!slotId || !player) return { allowed: false, reason: 'No card in that slot.' };
  const inst = getCardInstance(G, slotId);
  if (!inst) return { allowed: false, reason: 'No card in that slot.' };
  const cost = getEffectiveCardCost(G, playerId, getCard(inst.cardId));
  if (player.moneyTokens < cost) {
    return {
      allowed: false,
      reason: `Need ${cost} influence (have ${player.moneyTokens}).`,
    };
  }
  return { allowed: true };
}

export function canAssignAttack(G: HogwartsGameState, playerId: string, delta: number): ActionGate {
  const gate = canHeroAct(G, playerId);
  if (!gate.allowed) return gate;
  if (delta > 0 && unassignedAttack(G, playerId) <= 0) {
    return { allowed: false, reason: 'No attack left to assign.' };
  }
  return { allowed: true };
}

export function canEndTurn(G: HogwartsGameState, playerId: string): ActionGate {
  return canHeroAct(G, playerId);
}

export function canUseProficiency(G: HogwartsGameState, playerId: string): ActionGate {
  const gate = canHeroAct(G, playerId);
  if (!gate.allowed) return gate;
  const player = G.players[playerId];
  const proficiency = getProficiency(player?.proficiencyId ?? '');
  if (!player || !proficiency) {
    return { allowed: false, reason: 'No proficiency assigned.' };
  }
  if (proficiency.trigger !== 'manual') {
    return { allowed: false, reason: 'Passive proficiency.' };
  }
  if (proficiency.uses_per_turn && player.proficiencyUsedThisTurn) {
    return { allowed: false, reason: 'Already used this turn.' };
  }
  const spellCost = Number(proficiency.cost?.discard_spells ?? 0);
  const itemCost = Number(proficiency.cost?.discard_items ?? 0);
  const spellCount = player.hand.filter(
    (instanceId) => getCard(getCardInstance(G, instanceId)?.cardId ?? '')?.type === 'spell',
  ).length;
  const itemCount = player.hand.filter(
    (instanceId) => getCard(getCardInstance(G, instanceId)?.cardId ?? '')?.type === 'item',
  ).length;
  if (spellCount < spellCost) {
    return { allowed: false, reason: `Need ${spellCost} spell${spellCost === 1 ? '' : 's'}.` };
  }
  if (itemCount < itemCost) {
    return { allowed: false, reason: `Need ${itemCost} item${itemCost === 1 ? '' : 's'}.` };
  }
  const influenceCost = Number(proficiency.cost?.influence ?? 0);
  if (player.moneyTokens < influenceCost) {
    return { allowed: false, reason: `Need ${influenceCost} influence.` };
  }
  return { allowed: true };
}

export function canUseHorcruxReward(
  G: HogwartsGameState,
  playerId: string,
  horcruxId: string,
): ActionGate {
  const gate = canHeroAct(G, playerId);
  if (!gate.allowed) return gate;
  const player = G.players[playerId];
  const reward = getHorcrux(horcruxId)?.reward;
  if (!player || !player.destroyedHorcruxIds.includes(horcruxId)) {
    return { allowed: false, reason: 'Horcrux not destroyed by this Hero.' };
  }
  if (reward?.trigger !== 'manual') {
    return { allowed: false, reason: 'No manual reward.' };
  }
  const discardCost = Number(reward.cost?.discard_from_hand ?? 0);
  if (player.hand.length < discardCost) {
    return { allowed: false, reason: `Need ${discardCost} cards in hand.` };
  }
  return { allowed: true };
}

export function pendingChoicePlayerId(G: HogwartsGameState): string | null {
  if (!G.pendingChoice) return null;
  return G.pendingChoice.context.sourcePlayerId ?? G.currentPlayerId ?? null;
}

export function heroDisplayName(characterId: string): string {
  return getHero(characterId)?.name ?? characterId;
}

export function cardTitle(G: HogwartsGameState, instanceId: string): string {
  const cardId = getCardInstance(G, instanceId)?.cardId ?? instanceId;
  return getCard(cardId)?.name ?? cardId;
}

function phaseLabel(phase: HogwartsGameState['currentPhase']): string {
  switch (phase) {
    case 'DARK_ARTS':
      return 'Dark Arts';
    case 'HERO_ACTION':
      return 'Heroes';
    case 'VILLAIN_PHASE':
      return 'Villains';
    case 'CLEANUP':
      return 'Cleanup';
    case 'SETUP':
      return 'Setup';
    case 'GAME_OVER':
      return 'Game over';
  }
}

export function turnHeadline(G: HogwartsGameState, _playerId: string, isMyTurn: boolean): string {
  if (G.isGameOver) return G.isVictory ? 'Victory: villains defeated' : 'Defeat: locations lost';
  if (G.pendingChoice) return 'Choice required';
  if (G.currentPhase === 'DARK_ARTS') return 'Dark Arts';
  if (!isMyTurn) {
    const active = G.players[G.currentPlayerId];
    return `Waiting for ${active ? heroDisplayName(active.characterId) : 'ally'}`;
  }
  if (G.currentPhase !== 'HERO_ACTION') return phaseLabel(G.currentPhase);
  return 'Hero action: play, buy, or fight';
}
