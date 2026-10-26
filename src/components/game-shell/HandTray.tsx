import type { ReactNode } from 'react';
import type { HandTrayModel } from './types';

export function HandTray({ model, children }: { model: HandTrayModel; children: ReactNode }) {
  return (
    <div className="game-shell-tray" data-testid={model.testId ?? 'game-shell-tray'}>
      {model.title || model.hint ? (
        <div className="game-shell-tray__head">
          {model.title ? <p className="game-shell-tray__title">{model.title}</p> : null}
          {model.hint ? <p className="game-shell-tray__hint">{model.hint}</p> : null}
        </div>
      ) : null}
      <div className="game-shell-tray__body">{children}</div>
    </div>
  );
}
