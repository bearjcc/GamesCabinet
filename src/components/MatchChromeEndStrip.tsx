import { createContext, type ReactNode, useContext, useState } from 'react';

type EndStripContext = {
  target: HTMLElement | null;
  setTarget: (node: HTMLElement | null) => void;
};

const MatchChromeEndStripContext = createContext<EndStripContext | null>(null);

export function MatchChromeEndStripProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  return (
    <MatchChromeEndStripContext.Provider value={{ target, setTarget }}>
      {children}
    </MatchChromeEndStripContext.Provider>
  );
}

export function useMatchChromeEndStripTarget(): EndStripContext | null {
  return useContext(MatchChromeEndStripContext);
}

/** Mount inside GameShell — game-over tray portals here, above the phone bottom bar. */
export function GameShellEndStripMount() {
  const ctx = useMatchChromeEndStripTarget();
  return (
    <div
      className="game-shell-end-strip"
      data-testid="game-shell-end-strip"
      ref={(node) => ctx?.setTarget(node)}
    />
  );
}
