import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { emptyBoard, placeTile, START_ROW } from '../games/tracks/grid';

const ROOT = path.resolve(import.meta.dirname, '../..');

describe('tracks lid asset', () => {
  it('ships png and webp under public/assets/lids', () => {
    expect(existsSync(path.join(ROOT, 'public/assets/lids/tracks-lid.png'))).toBe(true);
    expect(existsSync(path.join(ROOT, 'public/assets/lids/tracks-lid.webp'))).toBe(true);
  });

  it('uses a connected tile run from START', () => {
    const board = emptyBoard();
    const t = (kind: 'straight' | 'curve') => ({ id: kind, kind });
    placeTile(board, t('straight'), START_ROW, 0, 1);
    placeTile(board, t('straight'), START_ROW, 1, 1);
    placeTile(board, t('curve'), START_ROW, 2, 3);
    placeTile(board, t('straight'), 0, 2, 0);
    expect(board.filter(Boolean)).toHaveLength(4);
  });
});
