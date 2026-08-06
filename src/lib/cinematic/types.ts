/**
 * Named cinematic primitives. Descriptors only -- never game state.
 * React wrappers in `src/components/cinematic/` are the sole Motion importers.
 */

export const CINEMATIC_KINDS = [
  'lift',
  'drop',
  'snap',
  'deal',
  'flip',
  'fan',
  'stack',
  'roll',
  'count',
] as const;

export type CinematicKind = (typeof CINEMATIC_KINDS)[number];

/** Optional client-only handle for the object being animated. Never a G field. */
export type CinematicTarget = {
  id?: string;
};

export type LiftPrimitive = { kind: 'lift' } & CinematicTarget;
export type DropPrimitive = { kind: 'drop' } & CinematicTarget;
export type SnapPrimitive = { kind: 'snap' } & CinematicTarget;
export type DealPrimitive = { kind: 'deal'; index?: number } & CinematicTarget;
export type FlipPrimitive = { kind: 'flip' } & CinematicTarget;
export type FanPrimitive = { kind: 'fan' } & CinematicTarget;
export type StackPrimitive = { kind: 'stack' } & CinematicTarget;
export type RollPrimitive = { kind: 'roll' } & CinematicTarget;
export type CountPrimitive = {
  kind: 'count';
  from: number;
  to: number;
} & CinematicTarget;

export type CinematicPrimitive =
  | LiftPrimitive
  | DropPrimitive
  | SnapPrimitive
  | DealPrimitive
  | FlipPrimitive
  | FanPrimitive
  | StackPrimitive
  | RollPrimitive
  | CountPrimitive;

export type QueuedAnimation = {
  id: string;
  primitive: CinematicPrimitive;
};

export type ResolveReason = 'completed' | 'interrupted' | 'skipped' | 'reduced';

export function isCinematicKind(value: string | null | undefined): value is CinematicKind {
  return !!value && (CINEMATIC_KINDS as readonly string[]).includes(value);
}

export function isCountPrimitive(primitive: CinematicPrimitive): primitive is CountPrimitive {
  return primitive.kind === 'count';
}
