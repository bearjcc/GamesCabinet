import type { ReadStream } from 'node:fs';
import fs from 'node:fs';

const API_PREFIXES = ['/games', '/rooms', '/api', '/health'];

export function shouldServeSpa(method: string, status: number, path: string): boolean {
  if (method !== 'GET' || status !== 404) return false;
  return !API_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

export function readIndexHtml(
  indexHtml: string,
): { status: 200; type: 'html'; body: ReadStream } | null {
  if (!fs.existsSync(indexHtml)) return null;
  return {
    status: 200,
    type: 'html',
    body: fs.createReadStream(indexHtml),
  };
}
