import { GameRules } from '../GameRules';
import type { RulesPanelModel } from './types';

export function RulesPanel({ model }: { model: RulesPanelModel }) {
  return (
    <GameRules title={model.title} testId={model.testId}>
      {model.body}
    </GameRules>
  );
}
