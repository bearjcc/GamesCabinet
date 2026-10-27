import type { ReactNode } from 'react';
import { PlaySessionChromeProvider } from './play-session/PlaySessionChrome';

/** Full-viewport play surface: GameShell only, no catalogue Shell topbar. */
export function PlayViewport({
  children,
  menuExtras,
}: {
  children: ReactNode;
  menuExtras?: ReactNode;
}) {
  return (
    <PlaySessionChromeProvider menuExtras={menuExtras}>
      <div className="play-viewport" data-testid="play-viewport">
        {children}
      </div>
    </PlaySessionChromeProvider>
  );
}
