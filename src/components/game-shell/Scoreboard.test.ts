import { describe, expect, it } from 'vitest';
import { toMatchScores } from './Scoreboard';

describe('toMatchScores', () => {
  it('maps scoreboard rows to match score labels', () => {
    expect(toMatchScores({ rows: [{ label: 'Score', value: 12 }] })).toEqual([
      { label: 'Score', value: 12 },
    ]);
  });
});
