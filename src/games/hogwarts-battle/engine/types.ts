export type CardZone =
  | 'deck'
  | 'hand'
  | 'discard'
  | 'play_area'
  | 'market'
  | 'villain_deck'
  | 'dark_arts_deck'
  | 'location_deck';

export interface CardInstance {
  instanceId: string;
  cardId: string;
  ownerPlayer: string;
  zone: CardZone;
}

export interface PlayerState {
  name: string;
  characterId: string;
  proficiencyId: string;
  health: number;
  maxHealth: number;
  attackTokens: number;
  moneyTokens: number;
  moneyTokensSpentThisTurn: number;
  deck: string[];
  hand: string[];
  discard: string[];
  playArea: string[];
  isStunned: boolean;
  spellsPlayedThisTurn: number;
  itemsPlayedThisTurn: number;
  alliesPlayedThisTurn: number;
  villainsKilledThisTurn: number;
  hasHealedThisTurn: boolean;
  abilityUsedThisTurn: boolean;
  firstCardDrawnThisTurn: boolean;
  proficiencyUsedThisTurn: boolean;
  healAmountThisTurn: number;
  attackedCreatureThisTurn: boolean;
  destroyedHorcruxIds: string[];
  patronusId: string;
  patronusUsedThisTurn: boolean;
  patronusCharges: number;
  patronusShield: boolean;
  charmUsedThisTurn: boolean;
  hasCycledMarket: boolean;
  gatheredIngredients: IngredientType[];
  darkArtsPotionId: string | null;
  villainsAttackedThisTurn: Record<string, number>;
}

export interface VillainState {
  villainId: string;
  currentHp: number;
  maxHp: number;
  isActive: boolean;
  isBlocked: boolean;
  controlTokens: number;
}

export interface LocationState {
  locationId: string;
  currentControl: number;
  maxControl: number;
  darkArtsToReveal: number;
}

export interface MarketState {
  availableCards: string[];
  deck: string[];
}

export type GamePhase =
  | 'SETUP'
  | 'DARK_ARTS'
  | 'VILLAIN_PHASE'
  | 'HERO_ACTION'
  | 'CLEANUP'
  | 'GAME_OVER';

export interface PendingChoice {
  choiceId: string;
  options: ChoiceOption[];
  context: EffectContext;
  continuation?: PendingChoiceContinuation;
}

export interface PendingChoiceContinuation {
  type: 'select_players_exclusive' | 'choose_n';
  remainingPicks: number;
  pickedSoFar: string[];
  effects?: EffectData[];
}

export interface ChoiceOption {
  label: string;
  effect: EffectData;
  contextOverrides?: Partial<EffectContext>;
}

export interface EffectData {
  type: string;
  params?: Record<string, unknown>;
  condition?: Record<string, unknown>;
  then?: EffectData;
  else?: EffectData;
}

export interface EffectContext {
  sourcePlayerId?: string;
  sourceCardInstanceId?: string;
  source?: string;
  villainId?: string;
  autoResolve?: boolean;
  revealedCards?: Record<string, string>;
  selectedPlayerIds?: string[];
  peekedDarkArts?: string[];
  controlRemoved?: number;
  healedPlayerId?: string;
  attackAssigned?: number;
  cardCost?: number;
  bypassAttackLimit?: boolean;
  isCleanup?: boolean;
}

export type IngredientType =
  | 'bicorn_horn'
  | 'mandrake_leaf'
  | 'flobber_worm'
  | 'hellebore'
  | 'lacewing'
  | 'wild';

export interface PotionDefinition {
  id: string;
  name: string;
  set: string[];
  ingredients: IngredientType[];
  effect: EffectData;
  banish_effect: EffectData;
}

export interface PotionState {
  potionDeck: string[];
  revealedPotions: string[];
  ingredientSupply: IngredientType[];
  shelfRequirement: 'A' | 'B';
  potionsInProgress: PotionInProgress[];
}

export interface PotionInProgress {
  potionId: string;
  placedIngredients: IngredientType[];
}

export interface CharmTier {
  health_threshold: number;
  description: string;
  trigger: string;
  condition?: Record<string, unknown>;
  effects: EffectData[];
}

export interface CharmDefinition {
  id: string;
  hero_id: string;
  name: string;
  tiers: CharmTier[];
}

export interface CharmState {
  activeCharmId: string | null;
}

export interface HogwartsGameState {
  players: Record<string, PlayerState>;
  activeVillains: VillainState[];
  villainDeck: string[];
  villainDiscard: string[];
  currentLocation: LocationState | null;
  locationDeck: string[];
  locationDiscard: string[];
  darkArtsDeck: string[];
  darkArtsDiscard: string[];
  darkArtsPlayedThisTurn: string[];
  darkArtsRemainingToReveal: number;
  market: MarketState;
  marketSpaces: number;
  currentPlayerId: string;
  turnOrder: string[];
  currentPhase: GamePhase;
  turnNumber: number;
  rngSeed: number;
  cardInstances: Record<string, CardInstance>;
  gameNumber: number;
  isGameOver: boolean;
  isVictory: boolean;
  nextInstanceCounter: number;
  pendingChoice: PendingChoice | null;
  playAllDecisionQueue: string[];
  attackAssignments: Record<string, number>;
  focusedVillainIndex: number;
  healingPreventedThisTurn: boolean;
  blockVillainEffectsThisTurn: boolean;
  blockCreatureEffectsThisTurn: boolean;
  damageDealtThisTurn: number;
  healOccurredThisTurn: boolean;
  horcruxState: HorcruxState | null;
  horcruxHealingBlockedThisTurn: boolean;
  encounterState: EncounterState | null;
  diceRolledThisTurn: number;
  potionState: PotionState | null;
  charmState: CharmState | null;
}

export type HorcruxSymbol = 'influence' | 'attack' | 'heal' | 'draw';

export interface HorcruxAbility {
  trigger: string;
  condition?: Record<string, unknown>;
  cost?: Record<string, unknown>;
  effects: EffectData[];
  description?: string;
}

export interface HorcruxDefinition {
  id: string;
  name: string;
  order: number;
  image?: string;
  description?: string;
  destroy_symbols: HorcruxSymbol[];
  ongoing?: HorcruxAbility;
  reward?: HorcruxAbility;
}

export interface HorcruxState {
  stack: string[];
  activeHorcruxId: string | null;
  rolledSymbols: HorcruxSymbol[];
  destroyedHorcruxIds: string[];
}

export interface CardDefinition {
  id: string;
  name: string;
  type: string;
  cost: number;
  set?: string[];
  quantity?: number;
  image: string;
  description?: string;
  effects?: EffectData[];
  keywords?: string[];
  house_dice?: boolean;
  passive_effect?: { type: string; description?: string; params?: Record<string, unknown> };
  on_discard_effect?: EffectData;
}

export interface VillainDefinition {
  id: string;
  name: string;
  hp: number;
  image: string;
  type?: string;
  play_before_dark_arts?: boolean;
  cannot_attack_while_other_villains?: boolean;
  requires_horcruxes_destroyed?: boolean;
  ongoing_effect?: EffectData;
  on_control_removed?: EffectData[];
  death_effect?: EffectData;
}

export interface DarkArtDefinition {
  id: string;
  name: string;
  image: string;
  effects?: EffectData[];
}

export interface LocationDefinition {
  id: string;
  name: string;
  image: string;
  max_control: number;
  dark_arts_reveal_count?: number;
  on_reveal?: EffectData[];
}

export interface HeroAbility {
  id: string;
  name: string;
  description?: string;
  trigger: string;
  uses_per_turn?: number;
  condition?: Record<string, unknown>;
  effects: EffectData[];
  available_from_game?: number;
}

export interface HeroDefinition {
  id: string;
  name: string;
  starting_hp: number;
  image?: string;
  starter_cards: { card_id: string; quantity: number }[];
  ability?: HeroAbility;
}

export interface ProficiencyDefinition {
  id: string;
  name: string;
  description?: string;
  trigger: string;
  uses_per_turn?: number;
  cost?: Record<string, unknown>;
  condition?: Record<string, unknown>;
  effects: EffectData[];
  on_creature_killed?: EffectData[];
}

export interface CampaignGame {
  number: number;
  name: string;
  villain_slots: number;
  villain_pool: string[];
  dark_arts_deck: string[];
  market_card_sets: string[];
  market_spaces: number;
  location_count: number;
  location_pool: string[];
  hero_ids: string[];
  proficiency_count?: number;
  proficiency_pool?: string[];
  special_rules?: string[];
  encounter_set?: string;
}

export interface EncounterCompletionCondition {
  type: string;
  params?: Record<string, unknown>;
}

export interface EncounterDefinition {
  id: string;
  name: string;
  set: string[];
  order: number;
  associated_creatures?: string[];
  effect?: EffectData;
  completion_condition: EncounterCompletionCondition;
  reward: EffectData;
  description?: string;
}

export interface EncounterState {
  encounterDeck: string[];
  activeEncounterId: string | null;
  completedEncounterIds: string[];
  progress: Record<string, number>;
  controlRemovedThisTurn: number;
  creaturesDefeatedThisTurn: number;
  villainsDefeatedThisTurn: number;
  cardsAcquiredThisTurn: number;
  influenceSpentThisTurn: number;
  evenCostCardsPlayedThisTurn: number;
  spellsPlayedThisTurn: number;
  itemsPlayedThisTurn: number;
  alliesPlayedThisTurn: number;
}

export interface CreatureDieDefinition {
  id: string;
  name: string;
  faces: CreatureDieFace[];
}

export interface CreatureDieFace {
  face: number;
  symbol: string;
  effect: EffectData;
  description?: string;
}

export interface PatronusDefinition {
  id: string;
  name: string;
  hero_id: string;
  description?: string;
  trigger: string;
  uses_per_turn?: number;
  effects: EffectData[];
}

export function createEmptyPlayer(heroId: string, name: string): PlayerState {
  return {
    name,
    characterId: heroId,
    proficiencyId: '',
    health: 10,
    maxHealth: 10,
    attackTokens: 0,
    moneyTokens: 0,
    moneyTokensSpentThisTurn: 0,
    deck: [],
    hand: [],
    discard: [],
    playArea: [],
    isStunned: false,
    spellsPlayedThisTurn: 0,
    itemsPlayedThisTurn: 0,
    alliesPlayedThisTurn: 0,
    villainsKilledThisTurn: 0,
    hasHealedThisTurn: false,
    abilityUsedThisTurn: false,
    firstCardDrawnThisTurn: false,
    proficiencyUsedThisTurn: false,
    healAmountThisTurn: 0,
    attackedCreatureThisTurn: false,
    destroyedHorcruxIds: [],
    patronusId: '',
    patronusUsedThisTurn: false,
    patronusCharges: 0,
    patronusShield: false,
    charmUsedThisTurn: false,
    hasCycledMarket: false,
    gatheredIngredients: [],
    darkArtsPotionId: null,
    villainsAttackedThisTurn: {},
  };
}

export function createInitialGameState(): HogwartsGameState {
  return {
    players: {},
    activeVillains: [],
    villainDeck: [],
    villainDiscard: [],
    currentLocation: null,
    locationDeck: [],
    locationDiscard: [],
    darkArtsDeck: [],
    darkArtsDiscard: [],
    darkArtsPlayedThisTurn: [],
    darkArtsRemainingToReveal: 0,
    market: { availableCards: [], deck: [] },
    marketSpaces: 6,
    currentPlayerId: '',
    turnOrder: [],
    currentPhase: 'SETUP',
    turnNumber: 0,
    rngSeed: 0,
    cardInstances: {},
    gameNumber: 1,
    isGameOver: false,
    isVictory: false,
    nextInstanceCounter: 0,
    pendingChoice: null,
    playAllDecisionQueue: [],
    attackAssignments: {},
    focusedVillainIndex: 0,
    healingPreventedThisTurn: false,
    blockVillainEffectsThisTurn: false,
    blockCreatureEffectsThisTurn: false,
    damageDealtThisTurn: 0,
    healOccurredThisTurn: false,
    horcruxState: null,
    horcruxHealingBlockedThisTurn: false,
    encounterState: null,
    diceRolledThisTurn: 0,
    potionState: null,
    charmState: null,
  };
}
