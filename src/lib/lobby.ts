import { LobbyClient } from 'boardgame.io/client';
import { clearSeat, type DeviceSeat, deviceSeats, type SeatSession, saveSeat } from './storage';
import type { DeviceJoin } from './tableSetup';

const server = import.meta.env.VITE_SERVER_URL || '';

export const lobby = new LobbyClient({ server });

export type RoomInfo = {
  matchID: string;
  gameName: string;
  setupData?: unknown;
};

export type SeatedRoom = RoomInfo &
  DeviceSeat & {
    localSeats?: DeviceSeat[];
    seatColourQuery?: string;
  };

export const BOT_SEAT_NAME = 'Bot';

function joinName(playerName: string, kind: DeviceSeat['kind']): string {
  return kind === 'bot' ? BOT_SEAT_NAME : playerName;
}

function asDeviceJoins(deviceJoins?: readonly DeviceJoin[] | readonly string[]): DeviceJoin[] {
  if (!deviceJoins?.length) return [];
  if (typeof deviceJoins[0] === 'string') {
    return (deviceJoins as readonly string[]).map((playerID) => ({
      playerID,
      kind: 'local' as const,
    }));
  }
  return [...(deviceJoins as readonly DeviceJoin[])];
}

export async function lookupRoom(code: string): Promise<RoomInfo | null> {
  const matchID = code.trim().toUpperCase();
  if (!matchID) return null;
  const res = await fetch(`${server}/rooms/${encodeURIComponent(matchID)}`);
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error('Could not look up room');
  }
  const data = (await res.json()) as RoomInfo;
  return { matchID: data.matchID, gameName: data.gameName };
}

function seatedFromJoins(
  gameName: string,
  matchID: string,
  seats: DeviceSeat[],
  setupData?: unknown,
  seatColourQuery?: string,
): SeatedRoom {
  const first = seats[0]!;
  return {
    matchID,
    gameName,
    playerID: first.playerID,
    credentials: first.credentials,
    ...(seats.length > 1 ? { localSeats: seats } : {}),
    ...(setupData === undefined ? {} : { setupData }),
    ...(seatColourQuery ? { seatColourQuery } : {}),
  };
}

function toDeviceSeat(playerID: string, credentials: string, kind: DeviceJoin['kind']): DeviceSeat {
  return {
    playerID,
    credentials,
    ...(kind === 'bot' ? { kind: 'bot' as const } : {}),
  };
}

async function joinDeviceSeats(
  gameName: string,
  matchID: string,
  playerName: string,
  deviceJoins?: readonly DeviceJoin[] | readonly string[],
): Promise<DeviceSeat[]> {
  const name = playerName.trim() || 'Player';
  const joins = asDeviceJoins(deviceJoins);
  if (!joins.length) {
    const { playerID, playerCredentials } = await lobby.joinMatch(gameName, matchID, {
      playerName: name,
    });
    return [{ playerID, credentials: playerCredentials }];
  }
  const seats: DeviceSeat[] = [];
  for (const join of joins) {
    const { playerID, playerCredentials } = await lobby.joinMatch(gameName, matchID, {
      playerID: join.playerID,
      playerName: joinName(name, join.kind),
    });
    seats.push(toDeviceSeat(playerID, playerCredentials, join.kind));
  }
  return seats;
}

export async function hostRoom(
  gameName: string,
  numPlayers: number,
  playerName: string,
  setupData?: unknown,
  deviceJoins?: readonly DeviceJoin[] | readonly string[],
  seatColourQuery?: string,
): Promise<SeatedRoom> {
  const { matchID } = await lobby.createMatch(gameName, {
    numPlayers,
    unlisted: true,
    ...(setupData === undefined ? {} : { setupData }),
  });
  const seats = await joinDeviceSeats(gameName, matchID, playerName, deviceJoins);
  const room = seatedFromJoins(gameName, matchID, seats, setupData, seatColourQuery);
  saveSeat(room);
  return room;
}

export async function joinRoom(code: string, playerName: string): Promise<SeatedRoom> {
  const room = await lookupRoom(code);
  if (!room) {
    throw new Error('No room with that code');
  }
  return joinKnownRoom(room, playerName);
}

/** Join when game + match ID are already known (e.g. deep link). */
export async function joinKnownRoom(room: RoomInfo, playerName: string): Promise<SeatedRoom> {
  try {
    const { playerID, playerCredentials } = await lobby.joinMatch(room.gameName, room.matchID, {
      playerName: playerName.trim() || 'Player',
    });
    saveSeat({
      matchID: room.matchID,
      playerID,
      credentials: playerCredentials,
      gameName: room.gameName,
    });
    return {
      matchID: room.matchID,
      gameName: room.gameName,
      playerID,
      credentials: playerCredentials,
      ...(room.setupData === undefined ? {} : { setupData: room.setupData }),
    };
  } catch (e) {
    throw new Error(friendlyJoinError(e));
  }
}

function friendlyJoinError(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e ?? '');
  const lower = raw.toLowerCase();
  if (lower.includes('full') || lower.includes('no free') || lower.includes('capacity')) {
    return 'That room is full';
  }
  if (lower.includes('not found') || lower.includes('does not exist')) {
    return 'No room with that code';
  }
  if (raw.trim()) return raw;
  return 'Could not join room';
}

export async function leaveRoom(session: SeatSession): Promise<void> {
  const seats = deviceSeats(session);
  let firstError: unknown;
  try {
    for (const seat of seats) {
      try {
        await lobby.leaveMatch(session.gameName, session.matchID, {
          playerID: seat.playerID,
          credentials: seat.credentials,
        });
      } catch (e) {
        firstError ??= e;
      }
    }
    if (firstError) throw firstError;
  } finally {
    clearSeat(session.gameName, session.matchID);
  }
}

/** Create/join the next match after game over (boardgame.io playAgain). */
export async function rematchRoom(session: SeatSession, playerName: string): Promise<SeatedRoom> {
  const seats = deviceSeats(session);
  const first = seats[0]!;
  const { nextMatchID } = await lobby.playAgain(session.gameName, session.matchID, {
    playerID: first.playerID,
    credentials: first.credentials,
    unlisted: true,
    ...(session.setupData === undefined ? {} : { setupData: session.setupData }),
  });
  clearSeat(session.gameName, session.matchID);
  const joined = await joinDeviceSeats(
    session.gameName,
    nextMatchID,
    playerName,
    deviceSeats(session).map((seat) => ({
      playerID: seat.playerID,
      kind: seat.kind === 'bot' ? ('bot' as const) : ('local' as const),
    })),
  );
  const next = seatedFromJoins(
    session.gameName,
    nextMatchID,
    joined,
    session.setupData,
    session.seatColourQuery,
  );
  saveSeat(next);
  return next;
}
