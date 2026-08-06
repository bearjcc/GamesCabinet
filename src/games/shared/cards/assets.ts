import type { Card, CardDef } from './types';

/** Resolve a face asset for a card. Return null to use the default CSS face. */
export type AssetResolver = (card: Card) => string | null;

/** Prefer def.asset, then map[id], then fallback resolver. */
export function assetFromDefs(defs: Iterable<CardDef>): AssetResolver {
  const map = new Map<string, string>();
  for (const d of defs) {
    if (d.asset) map.set(d.id, d.asset);
  }
  return (card) => map.get(card.id) ?? null;
}

export function assetMap(overrides: Record<string, string>): AssetResolver {
  return (card) => overrides[card.id] ?? null;
}

/** First non-null wins — compose base deck assets with game-specific overrides. */
export function composeAssetResolvers(...resolvers: AssetResolver[]): AssetResolver {
  return (card) => {
    for (const r of resolvers) {
      const src = r(card);
      if (src != null) return src;
    }
    return null;
  };
}

export function resolveCardAsset(card: Card, resolver?: AssetResolver): string | null {
  return resolver?.(card) ?? null;
}
