import { type ReactNode, useId, useState } from 'react';
import { AnimatedCounter } from '../../components/cinematic';
import { IconButton } from '../../components/IconControl';
import {
  IconHelp,
  IconKeepGoing,
  IconNewGame,
  IconRedo,
  IconScores,
  IconTryAgain,
  IconUndo,
} from '../../components/icons';
import type { SemanticAction } from '../../lib/actions';
import { actionTitle, isActionInteractive } from '../../lib/actions';

export function Game2048Toolbar({
  score,
  bestScore,
  helpText,
  actions,
  onAction,
  onShowScores,
  scoresActive,
}: {
  score: number;
  bestScore: number;
  helpText: string;
  actions: SemanticAction[];
  onAction: (id: string) => void;
  onShowScores: () => void;
  scoresActive?: boolean;
}) {
  const [helpOpen, setHelpOpen] = useState(false);
  const helpId = useId();

  const byId = (id: string) => actions.find((action) => action.id === id);

  const renderAction = (id: string, icon: ReactNode) => {
    const action = byId(id);
    if (!action) return null;
    const interactive = isActionInteractive(action);
    const reason = actionTitle(action);
    return (
      <IconButton
        key={id}
        label={action.label}
        title={reason ?? action.label}
        testId={action.testId}
        disabled={!interactive}
        onClick={() => {
          if (interactive) onAction(id);
        }}
      >
        {icon}
      </IconButton>
    );
  };

  const winPaused = Boolean(byId('keep-going'));

  return (
    <div className="g2048-toolbar-wrap">
      <div className="g2048-toolbar" data-testid="g2048-toolbar">
        <div className="g2048-toolbar__actions" role="group" aria-label="Game controls">
          {winPaused ? (
            <>
              {renderAction('keep-going', <IconKeepGoing />)}
              {renderAction('try-again', <IconTryAgain />)}
            </>
          ) : (
            <>
              {renderAction('new-game', <IconNewGame />)}
              {renderAction('undo', <IconUndo />)}
              {renderAction('redo', <IconRedo />)}
            </>
          )}
        </div>

        <div className="g2048-toolbar__scores" data-testid="g2048-score">
          <span className="g2048-toolbar__score">
            <span className="g2048-score-label">
              <span className="sr-only">Score</span>
              <span aria-hidden="true">S</span>
            </span>
            <AnimatedCounter value={score} className="g2048-score-value" />
          </span>
          <span className="g2048-toolbar__score">
            <span className="g2048-score-label">
              <span className="sr-only">Best</span>
              <span aria-hidden="true">B</span>
            </span>
            <span className="g2048-score-value" data-testid="g2048-best">
              {bestScore}
            </span>
          </span>
        </div>

        <div className="g2048-toolbar__links" role="group" aria-label="More">
          <IconButton
            label="Scores"
            title="Scores"
            testId="g2048-scores-link"
            pressed={scoresActive}
            onClick={onShowScores}
          >
            <IconScores />
          </IconButton>
          <IconButton
            label="How to play"
            title="How to play"
            testId="g2048-help-toggle"
            pressed={helpOpen}
            aria-expanded={helpOpen}
            onClick={() => setHelpOpen((open) => !open)}
          >
            <IconHelp />
          </IconButton>
        </div>
      </div>

      {helpOpen ? (
        <p id={helpId} className="g2048-toolbar__help" data-testid="g2048-help" role="status">
          {helpText}
        </p>
      ) : null}
    </div>
  );
}
