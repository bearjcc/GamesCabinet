import { createContext, type ReactNode, useContext } from 'react';
import { Link } from 'react-router-dom';
import { MotionCycle } from '../MotionCycle';
import { ThemeCycle } from '../ThemeCycle';

const PlaySessionExtrasContext = createContext<ReactNode>(null);

export function PlaySessionChromeProvider({
  menuExtras,
  children,
}: {
  menuExtras?: ReactNode;
  children: ReactNode;
}) {
  return (
    <PlaySessionExtrasContext.Provider value={menuExtras ?? null}>
      {children}
    </PlaySessionExtrasContext.Provider>
  );
}

export function usePlaySessionMenuExtras(): ReactNode {
  return useContext(PlaySessionExtrasContext);
}

/** Shared ⋯ menu rows for every in-play route (settings, theme, motion, vs-bot extras). */
export function PlayShellMenuDefaults() {
  return (
    <div className="game-shell-menu-defaults" data-testid="play-shell-menu-defaults">
      <Link className="game-shell-menu-link" to="/settings" data-testid="play-menu-settings">
        Settings
      </Link>
      <div className="game-shell-menu-row">
        <span className="game-shell-menu-label">Theme</span>
        <ThemeCycle />
      </div>
      <div className="game-shell-menu-row">
        <span className="game-shell-menu-label">Motion</span>
        <MotionCycle />
      </div>
    </div>
  );
}
