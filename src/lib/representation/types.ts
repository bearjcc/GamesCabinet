/** Shell representation modes (ADR 0001 §4; PRODUCT principle 12). */
export const REPRESENTATION_MODES = ['physical', 'compact', 'dashboard', 'list', 'detail'] as const;

export type RepresentationMode = (typeof REPRESENTATION_MODES)[number];

/** Why the player is looking at a pile or hand. */
export const ZONE_CONTEXTS = ['peek', 'inspect', 'choose', 'closed'] as const;

export type ZoneContext = (typeof ZONE_CONTEXTS)[number];

export type ChooseRepresentationInput = {
  /** Viewport (or measured container) width in CSS pixels. */
  viewportWidth: number;
  /** Items in the zone (cards, tokens, rows, etc.). */
  itemCount: number;
  /** Defaults to `choose` when omitted. */
  context?: ZoneContext;
};

export function isRepresentationMode(
  value: string | null | undefined,
): value is RepresentationMode {
  return !!value && (REPRESENTATION_MODES as readonly string[]).includes(value);
}

export function isZoneContext(value: string | null | undefined): value is ZoneContext {
  return !!value && (ZONE_CONTEXTS as readonly string[]).includes(value);
}
