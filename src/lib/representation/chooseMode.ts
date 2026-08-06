import type { ChooseRepresentationInput, RepresentationMode } from './types';

/** Widths below this are treated as narrow (phone-first). */
export const NARROW_VIEWPORT_MAX = 640;

/** Choose-context: physical when itemCount < this. */
export const PHYSICAL_ITEM_MAX = 8;

/** Choose-context: dashboard when wide and itemCount >= this (below list). */
export const DASHBOARD_ITEM_MIN = 8;

/** Choose-context: list when itemCount >= this. */
export const LIST_ITEM_MIN = 14;

/**
 * Pick a shell representation from viewport, item count, and zone context.
 *
 * Context wins first:
 * - inspect -> detail
 * - closed / peek -> compact
 * - choose (default) uses count + viewport:
 *   - count >= LIST_ITEM_MIN -> list
 *   - wide && count >= DASHBOARD_ITEM_MIN -> dashboard
 *   - count < PHYSICAL_ITEM_MAX -> physical
 *   - else -> compact
 *
 * Narrow choose never picks dashboard (compact instead).
 */
export function chooseRepresentationMode(input: ChooseRepresentationInput): RepresentationMode {
  const context = input.context ?? 'choose';
  if (context === 'inspect') return 'detail';
  if (context === 'closed' || context === 'peek') return 'compact';

  const { itemCount, viewportWidth } = input;
  if (itemCount >= LIST_ITEM_MIN) return 'list';

  const wide = viewportWidth >= NARROW_VIEWPORT_MAX;
  if (wide && itemCount >= DASHBOARD_ITEM_MIN) return 'dashboard';
  if (itemCount < PHYSICAL_ITEM_MAX) return 'physical';
  return 'compact';
}
