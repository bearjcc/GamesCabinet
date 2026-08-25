import { afterEach, describe, expect, it, vi } from 'vitest';

const lobbyMocks = vi.hoisted(() => ({
  createMatch: vi.fn(),
  joinMatch: vi.fn(),
  leaveMatch: vi.fn(),
  playAgain: vi.fn(),
}));

vi.mock('./storage', () => ({
  saveSeat: vi.fn(),
  clearSeat: vi.fn(),
  getNickname: vi.fn(() => 'Tester'),
  setNickname: vi.fn(),
  deviceSeats: (session: {
    playerID: string;
    credentials: string;
    localSeats?: { playerID: string; credentials: string }[];
  }) =>
    session.localSeats && session.localSeats.length > 0
      ? session.localSeats
      : [{ playerID: session.playerID, credentials: session.credentials }],
}));

vi.mock('boardgame.io/client', () => ({
  LobbyClient: vi.fn(function LobbyClientMock() {
    return lobbyMocks;
  }),
}));

async function loadLobby() {
  return import('./lobby');
}

describe('lookupRoom', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('returns null for an empty code without fetching', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { lookupRoom } = await loadLobby();
    await expect(lookupRoom('   ')).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('normalises the code and returns room info', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ matchID: 'ABC123', gameName: 'tic-tac-toe' }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { lookupRoom } = await loadLobby();
    await expect(lookupRoom(' abc123 ')).resolves.toEqual({
      matchID: 'ABC123',
      gameName: 'tic-tac-toe',
    });
    expect(fetchMock).toHaveBeenCalledWith('/rooms/ABC123');
  });

  it('returns null on 404', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 404, ok: false }));
    const { lookupRoom } = await loadLobby();
    await expect(lookupRoom('ZZZZZZ')).resolves.toBeNull();
  });

  it('throws when lookup fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 500, ok: false }));
    const { lookupRoom } = await loadLobby();
    await expect(lookupRoom('ABC123')).rejects.toThrow('Could not look up room');
  });
});

describe('hostRoom', () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('creates, joins, and stores a hosted room', async () => {
    lobbyMocks.createMatch.mockResolvedValue({ matchID: 'HOST1' });
    lobbyMocks.joinMatch.mockResolvedValue({ playerID: '0', playerCredentials: 'cred' });
    const { hostRoom } = await loadLobby();
    const { saveSeat } = await import('./storage');
    await expect(hostRoom('tic-tac-toe', 2, '  Bear  ')).resolves.toEqual({
      matchID: 'HOST1',
      gameName: 'tic-tac-toe',
      playerID: '0',
      credentials: 'cred',
    });
    expect(saveSeat).toHaveBeenCalledWith({
      matchID: 'HOST1',
      playerID: '0',
      credentials: 'cred',
      gameName: 'tic-tac-toe',
    });
  });

  it('falls back to Player for a blank host name', async () => {
    lobbyMocks.createMatch.mockResolvedValue({ matchID: 'HOST2' });
    lobbyMocks.joinMatch.mockResolvedValue({ playerID: '0', playerCredentials: 'cred' });
    const { hostRoom } = await loadLobby();
    await hostRoom('tic-tac-toe', 2, '   ');
    expect(lobbyMocks.joinMatch).toHaveBeenCalledWith('tic-tac-toe', 'HOST2', {
      playerName: 'Player',
    });
  });

  it('sends setup data when creating a hosted match', async () => {
    lobbyMocks.createMatch.mockResolvedValue({ matchID: 'HOST3' });
    lobbyMocks.joinMatch.mockResolvedValue({ playerID: '0', playerCredentials: 'cred' });
    const { hostRoom } = await loadLobby();
    const setupData = { gameNumber: 4, heroIds: ['neville', 'harry'] };

    await hostRoom('hogwarts-battle', 2, 'Bear', setupData);

    expect(lobbyMocks.createMatch).toHaveBeenCalledWith('hogwarts-battle', {
      numPlayers: 2,
      unlisted: true,
      setupData,
    });
  });

  it('joins every this-table seat when hosting a mixed table', async () => {
    lobbyMocks.createMatch.mockResolvedValue({ matchID: 'MIX1' });
    lobbyMocks.joinMatch
      .mockResolvedValueOnce({ playerID: '0', playerCredentials: 'cred-0' })
      .mockResolvedValueOnce({ playerID: '2', playerCredentials: 'cred-2' });
    const { hostRoom } = await loadLobby();
    const { saveSeat } = await import('./storage');

    await expect(hostRoom('crazy-eights', 3, 'Bear', undefined, ['0', '2'])).resolves.toEqual({
      matchID: 'MIX1',
      gameName: 'crazy-eights',
      playerID: '0',
      credentials: 'cred-0',
      localSeats: [
        { playerID: '0', credentials: 'cred-0' },
        { playerID: '2', credentials: 'cred-2' },
      ],
    });
    expect(lobbyMocks.joinMatch).toHaveBeenNthCalledWith(1, 'crazy-eights', 'MIX1', {
      playerID: '0',
      playerName: 'Bear',
    });
    expect(lobbyMocks.joinMatch).toHaveBeenNthCalledWith(2, 'crazy-eights', 'MIX1', {
      playerID: '2',
      playerName: 'Bear',
    });
    expect(saveSeat).toHaveBeenCalledWith({
      matchID: 'MIX1',
      playerID: '0',
      credentials: 'cred-0',
      gameName: 'crazy-eights',
      localSeats: [
        { playerID: '0', credentials: 'cred-0' },
        { playerID: '2', credentials: 'cred-2' },
      ],
    });
  });

  it('joins bot chairs as Bot when hosting an online table', async () => {
    lobbyMocks.createMatch.mockResolvedValue({ matchID: 'MIXB' });
    lobbyMocks.joinMatch
      .mockResolvedValueOnce({ playerID: '0', playerCredentials: 'cred-0' })
      .mockResolvedValueOnce({ playerID: '1', playerCredentials: 'cred-bot' });
    const { hostRoom } = await loadLobby();
    const { saveSeat } = await import('./storage');

    await expect(
      hostRoom('crazy-eights', 3, 'Bear', undefined, [
        { playerID: '0', kind: 'local' },
        { playerID: '1', kind: 'bot' },
      ]),
    ).resolves.toEqual({
      matchID: 'MIXB',
      gameName: 'crazy-eights',
      playerID: '0',
      credentials: 'cred-0',
      localSeats: [
        { playerID: '0', credentials: 'cred-0' },
        { playerID: '1', credentials: 'cred-bot', kind: 'bot' },
      ],
    });
    expect(lobbyMocks.joinMatch).toHaveBeenNthCalledWith(1, 'crazy-eights', 'MIXB', {
      playerID: '0',
      playerName: 'Bear',
    });
    expect(lobbyMocks.joinMatch).toHaveBeenNthCalledWith(2, 'crazy-eights', 'MIXB', {
      playerID: '1',
      playerName: 'Bot',
    });
    expect(saveSeat).toHaveBeenCalledWith({
      matchID: 'MIXB',
      playerID: '0',
      credentials: 'cred-0',
      gameName: 'crazy-eights',
      localSeats: [
        { playerID: '0', credentials: 'cred-0' },
        { playerID: '1', credentials: 'cred-bot', kind: 'bot' },
      ],
    });
  });
});

describe('joinRoom', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('throws when the room does not exist', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 404, ok: false }));
    const { joinRoom } = await loadLobby();
    await expect(joinRoom('MISSING', 'Bear')).rejects.toThrow('No room with that code');
  });

  it('joins a known room and stores the seat', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: async () => ({ matchID: 'JOIN1', gameName: 'checkers' }),
      }),
    );
    lobbyMocks.joinMatch.mockResolvedValue({ playerID: '1', playerCredentials: 'join-cred' });
    const { joinRoom } = await loadLobby();
    const { saveSeat } = await import('./storage');
    await expect(joinRoom('join1', '')).resolves.toEqual({
      matchID: 'JOIN1',
      gameName: 'checkers',
      playerID: '1',
      credentials: 'join-cred',
    });
    expect(saveSeat).toHaveBeenCalled();
  });

  it('keeps the room setup when joining a Hogwarts match', async () => {
    lobbyMocks.joinMatch.mockResolvedValue({ playerID: '1', playerCredentials: 'join-cred' });
    const { joinKnownRoom } = await loadLobby();
    const setupData = { gameNumber: 7, heroIds: ['harry', 'ron'] };

    await expect(
      joinKnownRoom({ matchID: 'HBJOIN', gameName: 'hogwarts-battle', setupData }, 'Bear'),
    ).resolves.toMatchObject({ matchID: 'HBJOIN', setupData });
  });
});

describe('joinKnownRoom errors', () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('maps join failures to friendly messages', async () => {
    const { joinKnownRoom } = await loadLobby();
    lobbyMocks.joinMatch.mockRejectedValueOnce(new Error('Room is full'));
    await expect(joinKnownRoom({ matchID: 'X', gameName: 'tic-tac-toe' }, 'Bear')).rejects.toThrow(
      'That room is full',
    );

    lobbyMocks.joinMatch.mockRejectedValueOnce(new Error('Match not found'));
    await expect(joinKnownRoom({ matchID: 'X', gameName: 'tic-tac-toe' }, 'Bear')).rejects.toThrow(
      'No room with that code',
    );

    lobbyMocks.joinMatch.mockRejectedValueOnce(new Error('Server exploded'));
    await expect(joinKnownRoom({ matchID: 'X', gameName: 'tic-tac-toe' }, 'Bear')).rejects.toThrow(
      'Server exploded',
    );

    lobbyMocks.joinMatch.mockRejectedValueOnce(' ');
    await expect(joinKnownRoom({ matchID: 'X', gameName: 'tic-tac-toe' }, 'Bear')).rejects.toThrow(
      'Could not join room',
    );

    lobbyMocks.joinMatch.mockRejectedValueOnce(new Error('No free seats left'));
    await expect(joinKnownRoom({ matchID: 'X', gameName: 'tic-tac-toe' }, 'Bear')).rejects.toThrow(
      'That room is full',
    );

    lobbyMocks.joinMatch.mockRejectedValueOnce(new Error('Reached capacity'));
    await expect(joinKnownRoom({ matchID: 'X', gameName: 'tic-tac-toe' }, 'Bear')).rejects.toThrow(
      'That room is full',
    );

    lobbyMocks.joinMatch.mockRejectedValueOnce(null);
    await expect(joinKnownRoom({ matchID: 'X', gameName: 'tic-tac-toe' }, 'Bear')).rejects.toThrow(
      'Could not join room',
    );
  });
});

describe('leaveRoom and rematchRoom', () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('leaves a match and clears the stored seat', async () => {
    lobbyMocks.leaveMatch.mockResolvedValue(undefined);
    const { leaveRoom } = await loadLobby();
    const { clearSeat } = await import('./storage');
    const session = {
      matchID: 'LEAVE1',
      playerID: '0',
      credentials: 'cred',
      gameName: 'dominoes',
    };
    await leaveRoom(session);
    expect(lobbyMocks.leaveMatch).toHaveBeenCalledWith('dominoes', 'LEAVE1', {
      playerID: '0',
      credentials: 'cred',
    });
    expect(clearSeat).toHaveBeenCalledWith('dominoes', 'LEAVE1');
  });

  it('clears the seat even when leave fails', async () => {
    lobbyMocks.leaveMatch.mockRejectedValue(new Error('offline'));
    const { leaveRoom } = await loadLobby();
    const { clearSeat } = await import('./storage');
    await expect(
      leaveRoom({
        matchID: 'LEAVE2',
        playerID: '0',
        credentials: 'cred',
        gameName: 'dominoes',
      }),
    ).rejects.toThrow('offline');
    expect(clearSeat).toHaveBeenCalledWith('dominoes', 'LEAVE2');
  });

  it('starts a rematch in a fresh room', async () => {
    lobbyMocks.playAgain.mockResolvedValue({ nextMatchID: 'NEXT1' });
    lobbyMocks.joinMatch.mockResolvedValue({ playerID: '0', playerCredentials: 'next-cred' });
    const { rematchRoom } = await loadLobby();
    const { saveSeat, clearSeat } = await import('./storage');
    const session = {
      matchID: 'OLD1',
      playerID: '0',
      credentials: 'cred',
      gameName: 'yatzy',
    };
    await expect(rematchRoom(session, 'Bear')).resolves.toEqual({
      matchID: 'NEXT1',
      gameName: 'yatzy',
      playerID: '0',
      credentials: 'next-cred',
    });
    expect(clearSeat).toHaveBeenCalledWith('yatzy', 'OLD1');
    expect(saveSeat).toHaveBeenCalledWith({
      matchID: 'NEXT1',
      gameName: 'yatzy',
      playerID: '0',
      credentials: 'next-cred',
    });
  });

  it('falls back to Player on rematch with a blank name', async () => {
    lobbyMocks.playAgain.mockResolvedValue({ nextMatchID: 'NEXT2' });
    lobbyMocks.joinMatch.mockResolvedValue({ playerID: '0', playerCredentials: 'next-cred' });
    const { rematchRoom } = await loadLobby();
    await rematchRoom(
      {
        matchID: 'OLD2',
        playerID: '0',
        credentials: 'cred',
        gameName: 'yatzy',
      },
      '   ',
    );
    expect(lobbyMocks.joinMatch).toHaveBeenCalledWith('yatzy', 'NEXT2', {
      playerID: '0',
      playerName: 'Player',
    });
  });

  it('carries setup data into a rematch', async () => {
    lobbyMocks.playAgain.mockResolvedValue({ nextMatchID: 'NEXT3' });
    lobbyMocks.joinMatch.mockResolvedValue({ playerID: '0', playerCredentials: 'next-cred' });
    const { rematchRoom } = await loadLobby();
    const setupData = { gameNumber: 7, heroIds: ['hermione', 'ron'] };

    await rematchRoom(
      {
        matchID: 'OLD3',
        playerID: '0',
        credentials: 'cred',
        gameName: 'hogwarts-battle',
        setupData,
      },
      'Bear',
    );

    expect(lobbyMocks.playAgain).toHaveBeenCalledWith('hogwarts-battle', 'OLD3', {
      playerID: '0',
      credentials: 'cred',
      unlisted: true,
      setupData,
    });
  });

  it('leaves every this-table seat on a mixed host', async () => {
    lobbyMocks.leaveMatch.mockResolvedValue(undefined);
    const { leaveRoom } = await loadLobby();
    await leaveRoom({
      matchID: 'LEAVE3',
      playerID: '0',
      credentials: 'cred-0',
      gameName: 'crazy-eights',
      localSeats: [
        { playerID: '0', credentials: 'cred-0' },
        { playerID: '2', credentials: 'cred-2' },
      ],
    });
    expect(lobbyMocks.leaveMatch).toHaveBeenNthCalledWith(1, 'crazy-eights', 'LEAVE3', {
      playerID: '0',
      credentials: 'cred-0',
    });
    expect(lobbyMocks.leaveMatch).toHaveBeenNthCalledWith(2, 'crazy-eights', 'LEAVE3', {
      playerID: '2',
      credentials: 'cred-2',
    });
  });

  it('rejoins every this-table seat after rematch', async () => {
    lobbyMocks.playAgain.mockResolvedValue({ nextMatchID: 'NEXT4' });
    lobbyMocks.joinMatch
      .mockResolvedValueOnce({ playerID: '0', playerCredentials: 'next-0' })
      .mockResolvedValueOnce({ playerID: '2', playerCredentials: 'next-2' });
    const { rematchRoom } = await loadLobby();
    const { saveSeat } = await import('./storage');

    await expect(
      rematchRoom(
        {
          matchID: 'OLD4',
          playerID: '0',
          credentials: 'cred-0',
          gameName: 'crazy-eights',
          localSeats: [
            { playerID: '0', credentials: 'cred-0' },
            { playerID: '2', credentials: 'cred-2' },
          ],
        },
        'Bear',
      ),
    ).resolves.toEqual({
      matchID: 'NEXT4',
      gameName: 'crazy-eights',
      playerID: '0',
      credentials: 'next-0',
      localSeats: [
        { playerID: '0', credentials: 'next-0' },
        { playerID: '2', credentials: 'next-2' },
      ],
    });
    expect(lobbyMocks.joinMatch).toHaveBeenNthCalledWith(1, 'crazy-eights', 'NEXT4', {
      playerID: '0',
      playerName: 'Bear',
    });
    expect(lobbyMocks.joinMatch).toHaveBeenNthCalledWith(2, 'crazy-eights', 'NEXT4', {
      playerID: '2',
      playerName: 'Bear',
    });
    expect(saveSeat).toHaveBeenCalledWith({
      matchID: 'NEXT4',
      gameName: 'crazy-eights',
      playerID: '0',
      credentials: 'next-0',
      localSeats: [
        { playerID: '0', credentials: 'next-0' },
        { playerID: '2', credentials: 'next-2' },
      ],
    });
  });

  it('rejoins bot chairs as Bot after rematch', async () => {
    lobbyMocks.playAgain.mockResolvedValue({ nextMatchID: 'NEXTB' });
    lobbyMocks.joinMatch
      .mockResolvedValueOnce({ playerID: '0', playerCredentials: 'next-0' })
      .mockResolvedValueOnce({ playerID: '1', playerCredentials: 'next-bot' });
    const { rematchRoom } = await loadLobby();
    const { saveSeat } = await import('./storage');

    await expect(
      rematchRoom(
        {
          matchID: 'OLDB',
          playerID: '0',
          credentials: 'cred-0',
          gameName: 'crazy-eights',
          localSeats: [
            { playerID: '0', credentials: 'cred-0' },
            { playerID: '1', credentials: 'cred-bot', kind: 'bot' },
          ],
        },
        'Bear',
      ),
    ).resolves.toEqual({
      matchID: 'NEXTB',
      gameName: 'crazy-eights',
      playerID: '0',
      credentials: 'next-0',
      localSeats: [
        { playerID: '0', credentials: 'next-0' },
        { playerID: '1', credentials: 'next-bot', kind: 'bot' },
      ],
    });
    expect(lobbyMocks.joinMatch).toHaveBeenNthCalledWith(1, 'crazy-eights', 'NEXTB', {
      playerID: '0',
      playerName: 'Bear',
    });
    expect(lobbyMocks.joinMatch).toHaveBeenNthCalledWith(2, 'crazy-eights', 'NEXTB', {
      playerID: '1',
      playerName: 'Bot',
    });
    expect(saveSeat).toHaveBeenCalledWith({
      matchID: 'NEXTB',
      gameName: 'crazy-eights',
      playerID: '0',
      credentials: 'next-0',
      localSeats: [
        { playerID: '0', credentials: 'next-0' },
        { playerID: '1', credentials: 'next-bot', kind: 'bot' },
      ],
    });
  });
});
