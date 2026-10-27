import type { ReactNode } from 'react';
import { PlayShellMenuDefaults, usePlaySessionMenuExtras } from '../play-session/PlaySessionChrome';

export function GameShellMenuSheet({ children }: { children?: ReactNode }) {
  const extras = usePlaySessionMenuExtras();
  return (
    <div className="game-shell-menu">
      <PlayShellMenuDefaults />
      {extras}
      {children}
    </div>
  );
}
