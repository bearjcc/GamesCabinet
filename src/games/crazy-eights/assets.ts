import {
  type AssetResolver,
  assetFromDefs,
  assetMap,
  composeAssetResolvers,
  createStandardDeck,
  kenneyPlayingCardAsset,
  kenneyPlayingCardPath,
} from '../shared/cards';

/**
 * Example composition: Crazy Eights stamps wild metadata on eights and can
 * override face art. Default faces are Kenney; uncomment a custom path to swap.
 */
export const CRAZY_EIGHTS_EIGHT_ASSETS: Record<string, string> = {
  'clubs-8': kenneyPlayingCardPath('clubs', '8'),
  'diamonds-8': kenneyPlayingCardPath('diamonds', '8'),
  'hearts-8': kenneyPlayingCardPath('hearts', '8'),
  'spades-8': kenneyPlayingCardPath('spades', '8'),
};

export function crazyEightsDeckDefs() {
  return createStandardDeck({
    overrides: Object.entries(CRAZY_EIGHTS_EIGHT_ASSETS).map(([id, asset]) => ({
      id,
      asset,
      tags: ['wild'],
      meta: { wild: true },
    })),
  });
}

/** Eight overrides first, then Kenney standard faces for the rest of the deck. */
export function crazyEightsAssetResolver(): AssetResolver {
  return composeAssetResolvers(
    assetMap(CRAZY_EIGHTS_EIGHT_ASSETS),
    assetFromDefs(crazyEightsDeckDefs()),
    kenneyPlayingCardAsset,
  );
}

export function isWildEightId(cardId: string): boolean {
  return cardId.endsWith('-8');
}
