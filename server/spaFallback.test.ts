import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { readIndexHtml, shouldServeSpa } from './spaFallback.ts';

describe('shouldServeSpa', () => {
  it('serves GET 404s for client routes', () => {
    expect(shouldServeSpa('GET', 404, '/g/tic-tac-toe/ABC123')).toBe(true);
    expect(shouldServeSpa('GET', 404, '/')).toBe(true);
  });

  it('skips API and non-GET', () => {
    expect(shouldServeSpa('POST', 404, '/')).toBe(false);
    expect(shouldServeSpa('GET', 200, '/')).toBe(false);
    expect(shouldServeSpa('GET', 404, '/api/scores/2048')).toBe(false);
    expect(shouldServeSpa('GET', 404, '/rooms/ABC')).toBe(false);
    expect(shouldServeSpa('GET', 404, '/games')).toBe(false);
    expect(shouldServeSpa('GET', 404, '/health')).toBe(false);
  });
});

describe('readIndexHtml', () => {
  const tmp = path.join(os.tmpdir(), `gc-index-${process.pid}.html`);

  afterEach(() => {
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
  });

  it('returns null when missing', () => {
    expect(readIndexHtml(path.join(os.tmpdir(), 'no-such-index.html'))).toBeNull();
  });

  it('returns a html stream when present', async () => {
    fs.writeFileSync(tmp, '<html></html>');
    const result = readIndexHtml(tmp);
    expect(result?.status).toBe(200);
    expect(result?.type).toBe('html');
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      result?.body.on('data', (chunk: Buffer) => chunks.push(chunk));
      result?.body.on('end', () => resolve());
      result?.body.on('error', reject);
    });
    expect(Buffer.concat(chunks).toString('utf8')).toBe('<html></html>');
  });
});
