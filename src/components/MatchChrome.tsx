import type { BoardProps } from 'boardgame.io/react';
import {
  type ComponentType,
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from 'react';
import { summariseSeats } from '../lib/matchSeats';
import { type MatchAction, MatchActions } from './MatchActions';

export type MatchLifecycle = {
  /** Call Client.reset() — only safe for non-multiplayer (solo/hotseat). Vs-bot uses onPlayAgain + new matchID. */
  resetOnPlayAgain?: boolean;
  onPlayAgain?: () => void | Promise<void>;
  playAgainLabel?: string;
  /** Prefer over homeTo when leaving must clear a server seat. */
  onHome?: () => void | Promise<void>;
  homeTo?: string;
  onGameLaunch?: () => void | Promise<void>;
  gameLaunchTo?: string;
  /** Show seat-fill panel while the room is short players. */
  showWaiting?: boolean;
};

const MatchLifecycleContext = createContext<MatchLifecycle | null>(null);

export function MatchLifecycleProvider({
  value,
  children,
}: {
  value: MatchLifecycle;
  children: ReactNode;
}) {
  return <MatchLifecycleContext.Provider value={value}>{children}</MatchLifecycleContext.Provider>;
}

function useMatchLifecycle(): MatchLifecycle | null {
  return useContext(MatchLifecycleContext);
}

function WaitingSeats({ matchData }: { matchData: BoardProps['matchData'] }) {
  const summary = summariseSeats(matchData);
  if (!summary || summary.full) return null;
  return (
    <div className="waiting-panel" role="status" data-testid="waiting-panel">
      <p className="waiting-title">
        Waiting for players ({summary.filled}/{summary.total})
      </p>
      <ul className="waiting-seats">
        {summary.labels.map((label, i) => (
          <li key={i}>{label}</li>
        ))}
      </ul>
      <p className="waiting-hint">Share the room link so others can join.</p>
    </div>
  );
}

/** Wrap any board once; pages supply lifecycle via MatchLifecycleProvider. */
export function withMatchChrome<G>(
  Board: ComponentType<BoardProps<G>>,
): ComponentType<BoardProps<G>> {
  function BoardWithChrome(props: BoardProps<G>) {
    const life = useMatchLifecycle();
    const [busy, setBusy] = useState(false);
    const gameover = Boolean(props.ctx.gameover);
    const seats = summariseSeats(props.matchData);
    const waiting = Boolean(life?.showWaiting && seats && !seats.full && !gameover);

    const actions = useMemo((): MatchAction[] => {
      if (!life || !gameover) return [];
      const list: MatchAction[] = [];
      const run = (fn: () => void | Promise<void>) => {
        setBusy(true);
        void Promise.resolve(fn())
          .catch(() => undefined)
          .finally(() => setBusy(false));
      };

      if (life.resetOnPlayAgain || life.onPlayAgain) {
        list.push({
          id: 'again',
          label: life.playAgainLabel || 'Play again',
          variant: 'primary',
          onClick: () => {
            if (life.resetOnPlayAgain) {
              props.reset();
              return;
            }
            if (life.onPlayAgain) run(life.onPlayAgain);
          },
        });
      }
      if (life.onGameLaunch) {
        list.push({ id: 'modes', label: 'Game modes', onClick: () => run(life.onGameLaunch!) });
      } else if (life.gameLaunchTo) {
        list.push({ id: 'modes', label: 'Game modes', to: life.gameLaunchTo });
      }
      if (life.onHome) {
        list.push({ id: 'home', label: 'Home', onClick: () => run(life.onHome!) });
      } else {
        list.push({ id: 'home', label: 'Home', to: life.homeTo || '/' });
      }
      return list;
    }, [gameover, life, props]);

    return (
      <div className="match-chrome">
        {waiting ? <WaitingSeats matchData={props.matchData} /> : null}
        {waiting ? null : <Board {...props} />}
        {actions.length ? <MatchActions actions={actions} busy={busy} /> : null}
      </div>
    );
  }
  BoardWithChrome.displayName = `WithMatchChrome(${Board.displayName || Board.name || 'Board'})`;
  return BoardWithChrome;
}
