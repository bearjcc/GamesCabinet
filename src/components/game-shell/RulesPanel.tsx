import type { RulesPanelModel } from './types';

export function RulesPanel({ model }: { model: RulesPanelModel }) {
  return (
    <div className="game-rules game-rules--sheet" data-testid={model.testId}>
      {model.title ? <h3 className="game-rules__sheet-title">{model.title}</h3> : null}
      <div className="game-rules__body">{model.body}</div>
    </div>
  );
}
