import { describe, expect, it } from 'vitest';
import type { GameMeta } from './games';
import {
  deriveLaunch,
  getSeatKinds,
  occupiedKindsQuery,
  ownedDeviceJoins,
  playerIDsOfKind,
  seatsFromKindsQuery,
  type TableSeat,
} from './tableSetup';

const twoPlayerGame: GameMeta = {
  id: 'example',
  name: 'Example',
  blurb: '',
  minPlayers: 2,
  maxPlayers: 4,
  hasBot: true,
  hasLocal: true,
  hasOnline: true,
};

function seats(...kinds: TableSeat['kind'][]): TableSeat[] {
  return kinds.map((kind) => ({ kind }));
}

describe('table setup', () => {
  it('requires at least one occupied seat', () => {
    expect(deriveLaunch(twoPlayerGame, seats('empty', 'empty'))).toEqual({
      status: 'invalid',
      reason: 'Choose a seat to start.',
    });
  });

  it('exposes only the seat types a game supports', () => {
    expect(getSeatKinds(twoPlayerGame)).toEqual(['empty', 'local', 'online', 'bot']);
    expect(
      getSeatKinds({
        ...twoPlayerGame,
        hasBot: false,
        hasLocal: false,
        hasOnline: false,
      }),
    ).toEqual(['empty']);
  });

  it('starts a local table with its occupied seat count', () => {
    expect(deriveLaunch(twoPlayerGame, seats('local', 'local', 'empty', 'empty'))).toEqual({
      status: 'ready',
      mode: 'local',
      seats: 2,
    });
  });

  it('allows one-seat games to start with one local seat', () => {
    expect(
      deriveLaunch(
        { ...twoPlayerGame, minPlayers: 1, maxPlayers: 1, hasBot: false, hasOnline: false },
        seats('local'),
      ),
    ).toEqual({ status: 'ready', mode: 'local', seats: 1 });
  });

  it('rejects a table that has more seats than the game supports', () => {
    expect(deriveLaunch(twoPlayerGame, seats('local', 'local', 'local', 'local', 'local'))).toEqual(
      {
        status: 'invalid',
        reason: 'This game has room for 4 seats.',
      },
    );
  });

  it('requires two seats for an online table even for a solo-capable game', () => {
    expect(
      deriveLaunch(
        {
          ...twoPlayerGame,
          minPlayers: 1,
        },
        seats('online'),
      ),
    ).toEqual({
      status: 'invalid',
      reason: 'An online table needs at least 2 seats.',
    });
  });

  it('routes one local seat and one bot seat to vs-bot', () => {
    expect(deriveLaunch(twoPlayerGame, seats('local', 'bot'))).toEqual({
      status: 'ready',
      mode: 'bot',
      seats: 2,
    });
  });

  it('routes any mix of this-table and bot seats to vs-bot', () => {
    expect(deriveLaunch(twoPlayerGame, seats('local', 'bot', 'bot'))).toEqual({
      status: 'ready',
      mode: 'bot',
      seats: 3,
    });
    expect(deriveLaunch(twoPlayerGame, seats('local', 'local', 'bot'))).toEqual({
      status: 'ready',
      mode: 'bot',
      seats: 3,
    });
    expect(deriveLaunch(twoPlayerGame, seats('bot', 'local'))).toEqual({
      status: 'ready',
      mode: 'bot',
      seats: 2,
    });
  });

  it('hosts only when every occupied seat is online', () => {
    expect(deriveLaunch(twoPlayerGame, seats('online', 'online'))).toEqual({
      status: 'ready',
      mode: 'online',
      seats: 2,
    });
  });

  it('hosts a mixed table of this-table and online seats', () => {
    expect(deriveLaunch(twoPlayerGame, seats('local', 'online'))).toEqual({
      status: 'ready',
      mode: 'online',
      seats: 2,
    });
    expect(deriveLaunch(twoPlayerGame, seats('online', 'local', 'local'))).toEqual({
      status: 'ready',
      mode: 'online',
      seats: 3,
    });
    expect(deriveLaunch(twoPlayerGame, seats('local', 'online', 'empty'))).toEqual({
      status: 'ready',
      mode: 'online',
      seats: 2,
    });
  });

  it('hosts a mixed table with this-table, online, and bot seats', () => {
    expect(deriveLaunch(twoPlayerGame, seats('local', 'bot', 'online'))).toEqual({
      status: 'ready',
      mode: 'online',
      seats: 3,
    });
    expect(deriveLaunch(twoPlayerGame, seats('local', 'online', 'bot', 'bot'))).toEqual({
      status: 'ready',
      mode: 'online',
      seats: 4,
    });
  });

  it('explains unsupported mixed tables instead of silently changing seats', () => {
    expect(deriveLaunch(twoPlayerGame, seats('bot', 'bot'))).toEqual({
      status: 'invalid',
      reason: 'Choose a seat for yourself before adding a bot.',
    });
    expect(deriveLaunch(twoPlayerGame, seats('online', 'bot'))).toEqual({
      status: 'invalid',
      reason: 'Choose a seat for yourself before adding a bot.',
    });
    expect(
      deriveLaunch(twoPlayerGame, [{ kind: 'local' }, { kind: 'other' as TableSeat['kind'] }]),
    ).toEqual({
      status: 'invalid',
      reason: 'Choose one way to play for every occupied seat.',
    });
  });

  it('encodes occupied seat kinds for vs-bot and restores them from the query', () => {
    expect(occupiedKindsQuery(seats('local', 'empty', 'bot', 'bot'))).toBe('local,bot,bot');
    expect(seatsFromKindsQuery(null)).toEqual(seats('local', 'bot'));
    expect(seatsFromKindsQuery('bot,local')).toEqual(seats('bot', 'local'));
    expect(playerIDsOfKind(seats('bot', 'local', 'bot'), 'bot')).toEqual(['0', '2']);
    expect(playerIDsOfKind(seats('bot', 'local', 'bot'), 'local')).toEqual(['1']);
    expect(ownedDeviceJoins(seats('local', 'online', 'bot'))).toEqual([
      { playerID: '0', kind: 'local' },
      { playerID: '2', kind: 'bot' },
    ]);
  });

  it('rejects too few occupied seats for a multiplayer game', () => {
    expect(deriveLaunch(twoPlayerGame, seats('local', 'empty', 'empty', 'empty'))).toEqual({
      status: 'invalid',
      reason: 'Choose at least 2 seats.',
    });
  });
});
