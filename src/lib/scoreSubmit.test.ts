import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  decidePendingSubmit,
  normaliseSubmitPayload,
  pendingSubmitKey,
  postPendingScore,
} from './scoreSubmit';
import * as scores from './scores';
import * as storage from './storage';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('scoreSubmit', () => {
  it('builds a stable dedupe key from score fields', () => {
    expect(pendingSubmitKey({ score: 42, moves: 3, puzzleNumber: 7, playerName: 'Bear' })).toBe(
      '42-3-7-Bear',
    );
    expect(pendingSubmitKey({ score: 10 })).toBe('10---');
  });

  it('normalises player name from input, nickname, or Anonymous', () => {
    vi.spyOn(storage, 'getNickname').mockReturnValue('Cabinet');
    expect(normaliseSubmitPayload({ score: 1, playerName: '  Pat  ' }).playerName).toBe('Pat');
    expect(normaliseSubmitPayload({ score: 1, playerName: '   ' }).playerName).toBe('Cabinet');
    vi.spyOn(storage, 'getNickname').mockReturnValue('   ');
    expect(normaliseSubmitPayload({ score: 1 }).playerName).toBe('Anonymous');
  });

  it('decides to skip when pending is empty or already posted', () => {
    expect(decidePendingSubmit(null, null)).toEqual({ action: 'skip' });
    expect(decidePendingSubmit(undefined, null)).toEqual({ action: 'skip' });
    const input = { score: 100 };
    const key = pendingSubmitKey(input);
    expect(decidePendingSubmit(input, key)).toEqual({ action: 'skip' });
  });

  it('decides to post with normalised payload when not yet posted', () => {
    vi.spyOn(storage, 'getNickname').mockReturnValue('Bear');
    const input = { score: 2048, meta: { won: true } };
    const decision = decidePendingSubmit(input, null);
    expect(decision).toEqual({
      action: 'post',
      key: pendingSubmitKey(input),
      payload: { score: 2048, meta: { won: true }, playerName: 'Bear' },
    });
  });

  it('posts a normalised score via submitScore', async () => {
    vi.spyOn(storage, 'getNickname').mockReturnValue('Bear');
    const submit = vi.spyOn(scores, 'submitScore').mockResolvedValue({
      id: '1',
      gameId: '2048',
      playerName: 'Bear',
      score: 500,
      datePlayed: '2026-08-05',
    });
    await postPendingScore('2048', { score: 500 });
    expect(submit).toHaveBeenCalledWith('2048', { score: 500, playerName: 'Bear' });
  });
});
