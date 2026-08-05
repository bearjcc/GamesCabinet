import { describe, expect, it, vi } from 'vitest';
import { createMatchStore, matchStoreKind } from './db.ts';

describe('matchStoreKind', () => {
  it('returns memory by default', () => {
    expect(matchStoreKind({})).toBe('memory');
  });

  it('returns postgres when DATABASE_URL is set', () => {
    expect(matchStoreKind({ DATABASE_URL: 'postgresql://u:p@h/db' })).toBe('postgres');
  });

  it('returns flatfile when only FLATFILE_DIR is set', () => {
    expect(matchStoreKind({ FLATFILE_DIR: '/data/matches' })).toBe('flatfile');
  });

  it('prefers DATABASE_URL over FLATFILE_DIR', () => {
    expect(
      matchStoreKind({
        DATABASE_URL: 'postgresql://u:p@h/db',
        FLATFILE_DIR: '/data/matches',
      }),
    ).toBe('postgres');
  });
});

describe('createMatchStore', () => {
  it('returns undefined for memory', () => {
    expect(createMatchStore({})).toBeUndefined();
  });

  it('builds postgres via factory', () => {
    const createPostgres = vi.fn(() => ({ kind: 'pg' }));
    const createFlatFile = vi.fn();
    const store = createMatchStore(
      { DATABASE_URL: 'postgresql://u:p@h/db', FLATFILE_DIR: '/data' },
      { createPostgres, createFlatFile },
    );
    expect(store).toEqual({ kind: 'pg' });
    expect(createPostgres).toHaveBeenCalledWith('postgresql://u:p@h/db');
    expect(createFlatFile).not.toHaveBeenCalled();
  });

  it('builds flatfile via factory', () => {
    const createPostgres = vi.fn();
    const createFlatFile = vi.fn(() => ({ kind: 'ff' }));
    const store = createMatchStore(
      { FLATFILE_DIR: '/data/matches' },
      { createPostgres, createFlatFile },
    );
    expect(store).toEqual({ kind: 'ff' });
    expect(createFlatFile).toHaveBeenCalledWith('/data/matches');
  });
});
