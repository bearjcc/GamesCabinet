export type SoloPlayTab = 'play' | 'scores';

/** Shared Play / Scores tab control for solo games with a leaderboard. */
export function SoloPlayTabs({
  value,
  onChange,
  testIdPrefix,
}: {
  value: SoloPlayTab;
  onChange: (tab: SoloPlayTab) => void;
  testIdPrefix: string;
}) {
  return (
    <div className="solo-tabs" role="tablist" aria-label="Play or scores">
      <button
        type="button"
        role="tab"
        aria-selected={value === 'play'}
        className={`btn${value === 'play' ? ' is-active' : ''}`}
        data-testid={`${testIdPrefix}-tab-play`}
        onClick={() => onChange('play')}
      >
        Play
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === 'scores'}
        className={`btn${value === 'scores' ? ' is-active' : ''}`}
        data-testid={`${testIdPrefix}-tab-scores`}
        onClick={() => onChange('scores')}
      >
        Scores
      </button>
    </div>
  );
}
