import { describe, expect, it } from 'vitest';
import { formatMatchScore, type MatchScore } from './MatchScoreboard';

describe('MatchScoreboard', () => {
  it('formats labelled player scores for compact match chrome', () => {
    const scores: MatchScore[] = [
      { label: 'P1', value: 3 },
      { label: 'P2', value: 1 },
    ];

    expect(formatMatchScore(scores)).toEqual(['P1 3', 'P2 1']);
  });

  it('supports contextual score labels', () => {
    expect(
      formatMatchScore([
        { label: 'Books', value: 2 },
        { label: 'Opp', value: 1 },
        { label: 'Stock', value: 12 },
      ]),
    ).toEqual(['Books 2', 'Opp 1', 'Stock 12']);
  });
});
