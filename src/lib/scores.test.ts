import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchScores, submitScore } from './scores';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('scores client', () => {
  it('submits a score on success', async () => {
    const entry = {
      id: 'abc',
      gameId: '2048',
      playerName: 'Bear',
      score: 100,
      datePlayed: '2026-08-05',
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, score: entry }),
      }),
    );
    await expect(submitScore('2048', { playerName: 'Bear', score: 100 })).resolves.toEqual(entry);
  });

  it('throws when submit fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'bad payload',
      }),
    );
    await expect(submitScore('2048', { score: 1 })).rejects.toThrow(/bad payload/);
  });

  it('fetches all-time and daily leaderboards', async () => {
    const scores = [
      { id: '1', gameId: '2048', playerName: 'A', score: 10, datePlayed: '2026-08-05' },
    ];
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, scores }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, scores: 'not-an-array' }),
      });
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchScores('2048')).resolves.toEqual(scores);
    await expect(fetchScores('2048', 'daily')).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledWith('/api/scores/2048/daily', {
      headers: { Accept: 'application/json' },
    });
  });

  it('throws when fetch fails without body text', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => {
          throw new Error('no body');
        },
      }),
    );
    await expect(fetchScores('2048')).rejects.toThrow(/Scores request failed \(500\)/);
  });
});
