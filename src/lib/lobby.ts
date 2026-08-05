import { LobbyClient } from 'boardgame.io/client';
import { clearSeat, type SeatSession, saveSeat } from './storage';

const server = import.meta.env.VITE_SERVER_URL || '';

export const lobby = new LobbyClient({ server });

export type RoomInfo = {
  matchID: string;
  gameName: string;
};

export type SeatedRoom = RoomInfo & { playerID: string; credentials: string };

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

export async function hostRoom(
  gameName: string,
  numPlayers: number,
  playerName: string,
): Promise<SeatedRoom> {
  const { matchID } = await lobby.createMatch(gameName, {
    numPlayers,
    unlisted: true,
  });
  const { playerID, playerCredentials } = await lobby.joinMatch(gameName, matchID, {
    playerName: playerName.trim() || 'Player',
  });
  saveSeat({
    matchID,
    playerID,
    credentials: playerCredentials,
    gameName,
  });
  return { matchID, gameName, playerID, credentials: playerCredentials };
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
  try {
    await lobby.leaveMatch(session.gameName, session.matchID, {
      playerID: session.playerID,
      credentials: session.credentials,
    });
  } finally {
    clearSeat(session.gameName, session.matchID);
  }
}

/** Create/join the next match after game over (boardgame.io playAgain). */
export async function rematchRoom(session: SeatSession, playerName: string): Promise<SeatedRoom> {
  const { nextMatchID } = await lobby.playAgain(session.gameName, session.matchID, {
    playerID: session.playerID,
    credentials: session.credentials,
    unlisted: true,
  });
  clearSeat(session.gameName, session.matchID);
  const { playerID, playerCredentials } = await lobby.joinMatch(session.gameName, nextMatchID, {
    playerID: session.playerID,
    playerName: playerName.trim() || 'Player',
  });
  const next: SeatedRoom = {
    matchID: nextMatchID,
    gameName: session.gameName,
    playerID,
    credentials: playerCredentials,
  };
  saveSeat(next);
  return next;
}
