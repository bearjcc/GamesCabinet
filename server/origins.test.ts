import { describe, expect, it } from 'vitest';
import { resolveOrigins } from './origins.ts';

describe('resolveOrigins', () => {
  it('includes localhost defaults', () => {
    const origins = resolveOrigins({});
    expect(origins).toContain('http://localhost:5173');
    expect(origins).toContain('http://127.0.0.1:8000');
  });

  it('merges CORS_ORIGINS without duplicates', () => {
    const origins = resolveOrigins({
      CORS_ORIGINS: 'https://example.up.railway.app, http://localhost:5173',
    });
    expect(origins).toContain('https://example.up.railway.app');
    expect(origins.filter((o) => o === 'http://localhost:5173')).toHaveLength(1);
  });

  it('ignores blank CORS entries', () => {
    const origins = resolveOrigins({ CORS_ORIGINS: ' ,  ,https://gamescabi.net ' });
    expect(origins).toContain('https://gamescabi.net');
  });
});
