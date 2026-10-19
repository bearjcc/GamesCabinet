import type { GameMeta } from './games';

export type SeatKind = 'empty' | 'local' | 'online' | 'bot';

export type TableSeat = {
  kind: SeatKind;
  colour?: string;
  role?: string;
};

export type LaunchMode = 'local' | 'online' | 'bot';

export type LaunchPlan =
  | {
      status: 'ready';
      mode: LaunchMode;
      seats: number;
    }
  | {
      status: 'invalid';
      reason: string;
    };

export function getSeatKinds(meta: GameMeta): SeatKind[] {
  const kinds: SeatKind[] = ['empty'];
  if (meta.hasSolo || meta.hasLocal) kinds.push('local');
  if (meta.hasOnline !== false && meta.maxPlayers >= 2) kinds.push('online');
  if (meta.hasBot) kinds.push('bot');
  return kinds;
}

const KIND_CYCLE: SeatKind[] = ['local', 'bot', 'online', 'empty'];

/** Seat kinds a player can cycle through when tapping an occupied spot. */
export function seatKindCycle(meta: GameMeta): SeatKind[] {
  return KIND_CYCLE.filter((kind) => kind === 'empty' || getSeatKinds(meta).includes(kind));
}

/** First kind offered when claiming an open seat. */
export function defaultClaimKind(meta: GameMeta): SeatKind {
  const allowed = getSeatKinds(meta);
  return (['local', 'online', 'bot'] as const).find((kind) => allowed.includes(kind)) ?? 'local';
}

export function nextSeatKind(
  meta: GameMeta,
  current: SeatKind,
  options: { claim?: boolean } = {},
): SeatKind {
  const cycle = seatKindCycle(meta);
  if (options.claim || current === 'empty') {
    return defaultClaimKind(meta);
  }
  const index = cycle.indexOf(current);
  if (index < 0) return defaultClaimKind(meta);
  return cycle[(index + 1) % cycle.length]!;
}

function occupiedSeats(seats: readonly TableSeat[]): TableSeat[] {
  return seats.filter((seat) => seat.kind !== 'empty');
}

export function deriveLaunch(meta: GameMeta, seats: readonly TableSeat[]): LaunchPlan {
  const occupied = occupiedSeats(seats);
  const count = occupied.length;
  const minPlayers = Math.max(1, meta.minPlayers);

  if (count === 0) {
    return { status: 'invalid', reason: 'Choose a seat to start.' };
  }
  if (count < minPlayers) {
    return { status: 'invalid', reason: `Choose at least ${minPlayers} seats.` };
  }
  if (count > meta.maxPlayers) {
    return { status: 'invalid', reason: `This game has room for ${meta.maxPlayers} seats.` };
  }

  const kinds = new Set(occupied.map((seat) => seat.kind));
  if (kinds.has('bot') && !kinds.has('local')) {
    return { status: 'invalid', reason: 'Choose a seat for yourself before adding a bot.' };
  }
  if (kinds.size === 1 && kinds.has('local')) {
    return { status: 'ready', mode: 'local', seats: count };
  }
  if (kinds.has('online') && !kinds.has('bot') && !kinds.has('local')) {
    if (count < 2) {
      return { status: 'invalid', reason: 'An online table needs at least 2 seats.' };
    }
    return { status: 'ready', mode: 'online', seats: count };
  }
  if (kinds.has('local') && kinds.has('bot') && !kinds.has('online')) {
    return { status: 'ready', mode: 'bot', seats: count };
  }
  if (kinds.has('online') && kinds.has('local')) {
    return { status: 'ready', mode: 'online', seats: count };
  }
  return { status: 'invalid', reason: 'Choose one way to play for every occupied seat.' };
}

export function occupiedKindsQuery(seats: readonly TableSeat[]): string {
  return occupiedSeats(seats)
    .map((seat) => seat.kind)
    .join(',');
}

export function seatsFromKindsQuery(raw: string | null | undefined): TableSeat[] {
  const source = raw && raw.length > 0 ? raw : 'local,bot';
  return source.split(',').map((kind) => ({ kind: kind as SeatKind }));
}

export function playerIDsOfKind(seats: readonly TableSeat[], kind: SeatKind): string[] {
  return occupiedSeats(seats).flatMap((seat, index) => (seat.kind === kind ? [String(index)] : []));
}

export type DeviceJoin = {
  playerID: string;
  kind: 'local' | 'bot';
};

export function ownedDeviceJoins(seats: readonly TableSeat[]): DeviceJoin[] {
  return occupiedSeats(seats).flatMap((seat, index) =>
    seat.kind === 'local' || seat.kind === 'bot'
      ? [{ playerID: String(index), kind: seat.kind }]
      : [],
  );
}
