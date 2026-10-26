import { type MatchScore, MatchScoreboard } from '../MatchScoreboard';
import type { ScoreboardModel } from './types';

export function toMatchScores(model: ScoreboardModel): MatchScore[] {
  return model.rows.map((row) => ({ label: row.label, value: row.value }));
}

export function Scoreboard({ model }: { model: ScoreboardModel }) {
  return <MatchScoreboard scores={toMatchScores(model)} testId={model.testId} />;
}
